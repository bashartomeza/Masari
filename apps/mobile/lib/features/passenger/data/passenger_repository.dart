import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_error.dart';
import '../../auth/data/authenticated_api_client.dart';
import 'passenger_models.dart';

final passengerRepositoryProvider = Provider<PassengerRepository>((ref) {
  return PassengerRepository(
    apiClient: ref.watch(authenticatedApiClientProvider),
  );
});

class PassengerRepository {
  const PassengerRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

  Future<List<PassengerRequest>> listRequests() async {
    final json = await apiClient.getJson('/passenger/requests');
    return _requests(json);
  }

  /// Active driver availabilities the passenger could book.
  ///
  /// Returns an empty list when canonical entry is switched off — the endpoint
  /// 404s in that case, which means "this build has no driver supply to show",
  /// not an error worth asking the passenger to retry.
  Future<List<AvailableDeparture>> availableDepartures({int limit = 25}) async {
    try {
      final json = await apiClient.getJson(
        '/passenger/available-departures?limit=$limit',
      );
      final list = json['departures'];
      if (list is! List) throw const FormatException('Missing departures');
      return list
          .cast<Map<String, dynamic>>()
          .map(AvailableDeparture.fromJson)
          .toList(growable: false);
    } on ApiException catch (error) {
      if (error.statusCode == 404) return const [];
      rethrow;
    }
  }

  Future<List<PassengerRequest>> activeRequests() async {
    final json = await apiClient.getJson('/passenger/requests/active');
    return _requests(json);
  }

  Future<PassengerRequest> requestDetail(String id) async {
    final json = await apiClient.getJson('/passenger/requests/$id');
    return PassengerRequest.fromJson(json['request'] as Map<String, dynamic>);
  }

  Future<PassengerRequest> createRequest({
    required PickupPreset pickup,
    required DateTime preferredTime,
    required int passengerCount,
  }) async {
    final json = await apiClient.postJson(
      '/passenger/requests',
      body: {
        'pickup_label': pickup.label,
        'pickup_lat': pickup.lat,
        'pickup_lng': pickup.lng,
        'destination_label': lockedDestinationLabel,
        'destination_lat': lockedDestinationLat,
        'destination_lng': lockedDestinationLng,
        'preferred_time': preferredTime.toUtc().toIso8601String(),
        'passenger_count': passengerCount,
      },
    );
    return PassengerRequest.fromJson(json['request'] as Map<String, dynamic>);
  }

  Future<PassengerRequest> cancelRequest(String id) async {
    final json = await apiClient.patchJson('/passenger/requests/$id/cancel');
    return PassengerRequest.fromJson(json['request'] as Map<String, dynamic>);
  }

  List<PassengerRequest> _requests(Map<String, dynamic> json) {
    final list = json['requests'];
    if (list is! List) throw const FormatException('Missing requests');
    return list
        .cast<Map<String, dynamic>>()
        .map(PassengerRequest.fromJson)
        .toList();
  }
}
