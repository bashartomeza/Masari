import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../auth/data/token_storage.dart';
import 'trip_models.dart';

final tripRepositoryProvider = Provider<TripRepository>((ref) {
  return TripRepository(
    apiClient: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

class TripRepository {
  const TripRepository({required this.apiClient, required this.tokenStorage});

  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  Future<List<PassengerTrip>> listTrips() async {
    final json = await apiClient.getJson('/trips', token: await _token());
    final list = json['trips'];
    if (list is! List) throw const FormatException('Missing trips');
    return list
        .cast<Map<String, dynamic>>()
        .map(PassengerTrip.fromJson)
        .toList();
  }

  Future<PassengerTrip> tripDetail(String id) async {
    final json = await apiClient.getJson('/trips/$id', token: await _token());
    return PassengerTrip.fromJson(json['trip'] as Map<String, dynamic>);
  }

  Future<TripLocation?> latestLocation(String id) async {
    final json = await apiClient.getJson(
      '/trips/$id/location',
      token: await _token(),
    );
    final location = json['location'];
    if (location == null) return null;
    return TripLocation.fromJson(location as Map<String, dynamic>);
  }

  Future<String> _token() async => await tokenStorage.readToken() ?? '';
}
