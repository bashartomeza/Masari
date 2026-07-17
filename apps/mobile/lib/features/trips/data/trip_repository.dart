import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/authenticated_api_client.dart';
import 'trip_models.dart';

final tripRepositoryProvider = Provider<TripRepository>((ref) {
  return TripRepository(apiClient: ref.watch(authenticatedApiClientProvider));
});

class TripRepository {
  const TripRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

  Future<List<PassengerTrip>> listTrips() async {
    final json = await apiClient.getJson('/trips');
    final list = json['trips'];
    if (list is! List) throw const FormatException('Missing trips');
    return list
        .cast<Map<String, dynamic>>()
        .map(PassengerTrip.fromJson)
        .toList();
  }

  Future<PassengerTrip> tripDetail(String id) async {
    final json = await apiClient.getJson('/trips/$id');
    return PassengerTrip.fromJson(json['trip'] as Map<String, dynamic>);
  }

  Future<TripLocation?> latestLocation(String id) async {
    final json = await apiClient.getJson('/trips/$id/location');
    final location = json['location'];
    if (location == null) return null;
    return TripLocation.fromJson(location as Map<String, dynamic>);
  }
}
