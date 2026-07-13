import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../auth/data/token_storage.dart';
import '../../trips/data/trip_models.dart';
import 'driver_models.dart';

const _compileTimeDemoFeatures = bool.fromEnvironment(
  'ENABLE_DEMO_FEATURES',
  defaultValue: !bool.fromEnvironment('dart.vm.product'),
);

final driverRepositoryProvider = Provider<DriverRepository>((ref) {
  return DriverRepository(
    apiClient: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

class DriverRepository {
  const DriverRepository({required this.apiClient, required this.tokenStorage});

  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  Future<List<DriverRoute>> listRoutes() async {
    final json = await apiClient.getJson(
      '/driver/routes',
      token: await _token(),
    );
    return _routes(json);
  }

  Future<List<DriverRoute>> activeRoutes() async {
    final json = await apiClient.getJson(
      '/driver/routes/active',
      token: await _token(),
    );
    return _routes(json);
  }

  Future<DriverRoute> createRoute({
    required int seatsAvailable,
    required int parcelCapacityAvailable,
  }) async {
    final json = await apiClient.postJson(
      '/driver/routes',
      token: await _token(),
      body: {
        'origin_label': lockedDriverOriginLabel,
        'destination_label': lockedDriverDestinationLabel,
        'corridor_key': lockedDriverCorridorKey,
        'seats_available': seatsAvailable,
        'parcel_capacity_available': parcelCapacityAvailable,
      },
    );
    return DriverRoute.fromJson(json['route'] as Map<String, dynamic>);
  }

  Future<DriverRoute> deactivateRoute(String id) async {
    final json = await apiClient.patchJson(
      '/driver/routes/$id/deactivate',
      token: await _token(),
    );
    return DriverRoute.fromJson(json['route'] as Map<String, dynamic>);
  }

  Future<List<DriverMatch>> listMatches({String? status}) async {
    final suffix = status == null
        ? ''
        : '?status=${Uri.encodeQueryComponent(status)}';
    final json = await apiClient.getJson(
      '/matches$suffix',
      token: await _token(),
    );
    final matches = json['matches'];
    if (matches is! List) throw const FormatException('Missing matches');
    return matches
        .cast<Map<String, dynamic>>()
        .map(DriverMatch.fromJson)
        .toList();
  }

  Future<DriverMatch> matchDetail(String id) async {
    final json = await apiClient.getJson('/matches/$id', token: await _token());
    return DriverMatch.fromJson(json['match'] as Map<String, dynamic>);
  }

  Future<DriverTripReference> acceptMatch(String id) async {
    final json = await apiClient.postJson(
      '/matches/$id/accept',
      token: await _token(),
      body: const {},
    );
    return DriverTripReference.fromJson(json['trip'] as Map<String, dynamic>);
  }

  Future<void> rejectMatch(String id) async {
    await apiClient.postJson(
      '/matches/$id/reject',
      token: await _token(),
      body: const {},
    );
  }

  Future<List<DriverTrip>> listTrips() async {
    final json = await apiClient.getJson('/trips', token: await _token());
    final trips = json['trips'];
    if (trips is! List) throw const FormatException('Missing trips');
    return trips.cast<Map<String, dynamic>>().map(DriverTrip.fromJson).toList();
  }

  Future<DriverTrip> tripDetail(String id) async {
    final json = await apiClient.getJson('/trips/$id', token: await _token());
    return DriverTrip.fromJson(json['trip'] as Map<String, dynamic>);
  }

  Future<void> updateTripStatus(String id, String status) async {
    await apiClient.postJson(
      '/trips/$id/status',
      token: await _token(),
      body: {'status': status},
    );
  }

  Future<TripLocation> simulateStep(String id) async {
    if (!_compileTimeDemoFeatures) {
      throw UnsupportedError('Demo simulation is not available in this build');
    }
    final json = await apiClient.postJson(
      '/trips/$id/simulate/step',
      token: await _token(),
      body: const {},
    );
    return TripLocation.fromJson(json['location'] as Map<String, dynamic>);
  }

  Future<void> resetSimulation(String id) async {
    if (!_compileTimeDemoFeatures) {
      throw UnsupportedError('Demo simulation is not available in this build');
    }
    await apiClient.postJson(
      '/trips/$id/simulate/reset',
      token: await _token(),
      body: const {},
    );
  }

  Future<TripLocation?> latestLocation(String id) async {
    final json = await apiClient.getJson(
      '/trips/$id/location',
      token: await _token(),
    );
    final location = json['location'];
    return location is Map<String, dynamic>
        ? TripLocation.fromJson(location)
        : null;
  }

  Future<String> _token() async => await tokenStorage.readToken() ?? '';

  List<DriverRoute> _routes(Map<String, dynamic> json) {
    final routes = json['routes'];
    if (routes is! List) throw const FormatException('Missing routes');
    return routes
        .cast<Map<String, dynamic>>()
        .map(DriverRoute.fromJson)
        .toList();
  }
}
