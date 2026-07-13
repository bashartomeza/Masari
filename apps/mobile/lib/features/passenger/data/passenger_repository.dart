import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../auth/data/token_storage.dart';
import 'passenger_models.dart';

final passengerRepositoryProvider = Provider<PassengerRepository>((ref) {
  return PassengerRepository(
    apiClient: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

class PassengerRepository {
  const PassengerRepository({
    required this.apiClient,
    required this.tokenStorage,
  });

  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  Future<List<PassengerRequest>> listRequests() async {
    final json = await apiClient.getJson(
      '/passenger/requests',
      token: await _token(),
    );
    return _requests(json);
  }

  Future<List<PassengerRequest>> activeRequests() async {
    final json = await apiClient.getJson(
      '/passenger/requests/active',
      token: await _token(),
    );
    return _requests(json);
  }

  Future<PassengerRequest> requestDetail(String id) async {
    final json = await apiClient.getJson(
      '/passenger/requests/$id',
      token: await _token(),
    );
    return PassengerRequest.fromJson(json['request'] as Map<String, dynamic>);
  }

  Future<PassengerRequest> createRequest({
    required PickupPreset pickup,
    required DateTime preferredTime,
    required int passengerCount,
  }) async {
    final json = await apiClient.postJson(
      '/passenger/requests',
      token: await _token(),
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
    final json = await apiClient.patchJson(
      '/passenger/requests/$id/cancel',
      token: await _token(),
    );
    return PassengerRequest.fromJson(json['request'] as Map<String, dynamic>);
  }

  Future<String> _token() async => await tokenStorage.readToken() ?? '';

  List<PassengerRequest> _requests(Map<String, dynamic> json) {
    final list = json['requests'];
    if (list is! List) throw const FormatException('Missing requests');
    return list
        .cast<Map<String, dynamic>>()
        .map(PassengerRequest.fromJson)
        .toList();
  }
}
