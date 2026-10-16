import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_error.dart';

import '../../auth/data/authenticated_api_client.dart';
import '../../auth/application/auth_controller.dart';
import '../../passenger/data/passenger_models.dart';
import '../../passenger/application/legacy_passenger_request_mutation.dart';
import '../../canonical_routes/application/canonical_route_controller.dart';
import '../domain/passenger_assistant_models.dart';

final passengerAssistantRepositoryProvider =
    Provider<PassengerAssistantRepository>((ref) {
      // Pending bookings belong to this account and must not survive logout.
      ref.watch(
        authControllerProvider.select((value) => value.value?.user?.id),
      );
      return ApiPassengerAssistantRepository(
        apiClient: ref.watch(authenticatedApiClientProvider),
        mutation: ref.watch(legacyPassengerRequestMutationProvider),
      );
    });

abstract interface class PassengerAssistantRepository {
  Future<PassengerAssistantReply> ask({
    required String message,
    required String locale,
    required List<PassengerAssistantMessage> history,
    String? conversationId,
  });

  Future<List<PassengerAssistantTripOption>> searchTrips(
    PassengerAssistantTripDraft draft,
  );

  Future<String> selectTrip({
    required PassengerAssistantTripDraft draft,
    required PassengerAssistantTripOption option,
  });
}

class ApiPassengerAssistantRepository implements PassengerAssistantRepository {
  ApiPassengerAssistantRepository({required this.apiClient, this.mutation});

  final AuthenticatedApiClient apiClient;
  final LegacyPassengerRequestMutation? mutation;
  final Map<String, Future<CanonicalMutationReceipt<String>>> _createdRequests =
      {};

  @override
  Future<PassengerAssistantReply> ask({
    required String message,
    required String locale,
    required List<PassengerAssistantMessage> history,
    String? conversationId,
  }) async {
    final json = await apiClient.postJson(
      '/passenger/assistant/messages',
      body: {
        'message': message,
        'locale': locale,
        'conversation_id': ?conversationId,
        'history': history
            .takeLast(8)
            .map(
              (item) => {
                'role': item.role == PassengerAssistantMessageRole.passenger
                    ? 'user'
                    : 'assistant',
                'text': item.text,
              },
            )
            .toList(growable: false),
      },
    );
    return PassengerAssistantReply.fromJson(json);
  }

  @override
  Future<List<PassengerAssistantTripOption>> searchTrips(
    PassengerAssistantTripDraft draft,
  ) async {
    final pickup = _validatedPickup(draft);
    final json = await apiClient.postJson(
      '/matches/search',
      body: _requestBody(draft, pickup),
    );
    final rawResults = json['results'];
    if (rawResults is! List) {
      throw const FormatException('Missing match search results');
    }
    return rawResults
        .map((value) {
          if (value is! Map) {
            throw const FormatException('Invalid match search result');
          }
          return PassengerAssistantTripOption.fromJson(
            value.map((key, value) => MapEntry(key.toString(), value)),
          );
        })
        .toList(growable: false);
  }

  @override
  Future<String> selectTrip({
    required PassengerAssistantTripDraft draft,
    required PassengerAssistantTripOption option,
  }) async {
    final pickup = _validatedPickup(draft);
    final body = _requestBody(draft, pickup);
    final recovery = mutation;
    if (recovery == null) {
      // Booking callers must supply the actor-bound durable service. Read-only
      // assistant calls can still construct this repository without it.
      throw const ApiException(
        ApiErrorType.validation,
        'booking_recovery_unavailable',
      );
    }
    final actor = recovery.actorId;
    final receipt = await _requestForDraft(body, option, draft);
    final requestId = receipt.value;
    recovery.requireActor(actor);

    Map<String, dynamic> matched;
    try {
      matched = await apiClient.postJson(
        '/matches/run',
        body: {'passengerRequestId': requestId, 'driverRouteId': option.id},
      );
    } catch (_) {
      // The request is known saved. A lost match response must recover that
      // request's existing active match rather than create another request.
      try {
        final existing = await apiClient.getJson('/matches');
        final matches = existing['matches'];
        if (matches is! List) throw const FormatException('Missing matches');
        final active = matches
            .whereType<Map>()
            .where(
              (match) =>
                  match['passenger_request'] is Map &&
                  (match['passenger_request'] as Map)['id'] == requestId &&
                  [
                    'proposed',
                    'sent_to_driver',
                    'accepted',
                  ].contains(match['status']) &&
                  match['id'] is String,
            )
            .firstOrNull;
        if (active == null) throw const FormatException('No active match');
        matched = {'match': active};
      } catch (_) {
        recovery.requireActor(actor);
        throw const ApiException(
          ApiErrorType.validation,
          'booking_saved_matching_unavailable',
        );
      }
    }
    recovery.requireActor(actor);
    final match = matched['match'];
    if (match is! Map || match['id'] is! String) {
      throw const FormatException('Missing match result');
    }
    await recovery.acknowledge(receipt);
    return match['id'] as String;
  }

  Future<CanonicalMutationReceipt<String>> _requestForDraft(
    Map<String, dynamic> body,
    PassengerAssistantTripOption option,
    PassengerAssistantTripDraft draft,
  ) async {
    final key = '${mutation!.actorId}:${jsonEncode(body)}';
    final existing = _createdRequests[key];
    if (existing != null) return existing;

    final creation = _createRequest(body, option, draft);
    _createdRequests[key] = creation;
    try {
      return await creation;
    } catch (_) {
      _createdRequests.remove(key);
      if (await mutation!.pending() != null) {
        throw const ApiException(
          ApiErrorType.network,
          'booking_outcome_unknown',
        );
      }
      rethrow;
    }
  }

  Future<CanonicalMutationReceipt<String>> _createRequest(
    Map<String, dynamic> body,
    PassengerAssistantTripOption option,
    PassengerAssistantTripDraft draft,
  ) {
    return mutation!.create(
      payload: body,
      recoveryContext: {
        'draft': {
          'pickup_key': draft.pickupKey,
          'pickup_label': draft.pickupLabel,
          'destination_key': draft.destinationKey,
          'destination_label': draft.destinationLabel,
          'preferred_time': draft.preferredTime.toUtc().toIso8601String(),
          'passenger_count': draft.passengerCount,
        },
        'option': {
          'id': option.id,
          'origin_label': option.fromLabel,
          'destination_label': option.toLabel,
          'departure_at': option.departureAt?.toUtc().toIso8601String(),
          'availability_window_end': option.availabilityWindowEnd
              ?.toUtc()
              .toIso8601String(),
          'seats_available': option.seatsAvailable,
          'score': option.score,
          'driver': {
            'name': option.driverName,
            'vehicle_type': option.vehicleType,
            'trust_score': option.trustScore,
          },
        },
      },
      preflight: () async {
        final now = DateTime.now();
        if ((option.departureAt != null && !option.departureAt!.isAfter(now)) ||
            (option.availabilityWindowEnd != null &&
                !option.availabilityWindowEnd!.isAfter(now))) {
          throw const ApiException(
            ApiErrorType.validation,
            'booking_time_passed',
            statusCode: 400,
          );
        }
      },
      send: (payload, key, beforeRetry) => apiClient.postJson(
        '/passenger/requests',
        body: payload,
        headers: {'Idempotency-Key': key},
        beforeRetry: beforeRetry,
      ),
    );
  }

  PickupPreset _validatedPickup(PassengerAssistantTripDraft draft) {
    final pickup = lockedPickupPresets
        .where((value) => value.key == draft.pickupKey)
        .firstOrNull;
    if (pickup == null || draft.destinationKey != 'bethlehem') {
      throw const FormatException('Unsupported extracted trip data');
    }
    if (draft.passengerCount < 1 || draft.passengerCount > 4) {
      throw const FormatException('Invalid passenger count');
    }
    return pickup;
  }

  Map<String, dynamic> _requestBody(
    PassengerAssistantTripDraft draft,
    PickupPreset pickup,
  ) => {
    'pickup_label': pickup.label,
    'pickup_lat': pickup.lat,
    'pickup_lng': pickup.lng,
    'destination_label': lockedDestinationLabel,
    'destination_lat': lockedDestinationLat,
    'destination_lng': lockedDestinationLng,
    'preferred_time': draft.preferredTime.toUtc().toIso8601String(),
    'passenger_count': draft.passengerCount,
  };
}

extension<T> on List<T> {
  Iterable<T> takeLast(int count) => skip(length > count ? length - count : 0);
}
