import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/authenticated_api_client.dart';
import '../../passenger/data/passenger_models.dart';
import '../domain/passenger_assistant_models.dart';

final passengerAssistantRepositoryProvider =
    Provider<PassengerAssistantRepository>((ref) {
      return ApiPassengerAssistantRepository(
        apiClient: ref.watch(authenticatedApiClientProvider),
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
  const ApiPassengerAssistantRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

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

    final created = await apiClient.postJson(
      '/passenger/requests',
      body: _requestBody(draft, pickup),
    );
    final request = created['request'];
    if (request is! Map || request['id'] is! String) {
      throw const FormatException('Missing created request');
    }

    final matched = await apiClient.postJson(
      '/matches/run',
      body: {'passengerRequestId': request['id'], 'driverRouteId': option.id},
    );
    final match = matched['match'];
    if (match is! Map || match['id'] is! String) {
      throw const FormatException('Missing match result');
    }
    return match['id'] as String;
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
