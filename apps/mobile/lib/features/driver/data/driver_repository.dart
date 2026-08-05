import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/application/auth_actor_binding.dart';
import '../../auth/data/authenticated_api_client.dart';
import '../../trips/data/trip_models.dart';
import 'driver_models.dart';

const _compileTimeDemoFeatures = bool.fromEnvironment(
  'ENABLE_DEMO_FEATURES',
  defaultValue: !bool.fromEnvironment('dart.vm.product'),
);

final driverRepositoryProvider = Provider<DriverRepository>((ref) {
  return DriverRepository(apiClient: ref.watch(authenticatedApiClientProvider));
});

/// The signed-in driver's own trust score. This actor-private cache must be
/// invalidated with the rest of the authenticated providers on every terminal
/// session transition.
final driverTrustScoreProvider = FutureProvider.family<int?, String>((
  ref,
  actorId,
) async {
  final binding = ref.watch(authenticatedActorBindingProvider);
  if (binding.actorId != actorId) return null;
  try {
    final score = await ref.watch(driverRepositoryProvider).ownTrustScore();
    return binding.actorId == actorId ? score : null;
  } catch (error, stackTrace) {
    if (binding.actorId != actorId) return null;
    Error.throwWithStackTrace(error, stackTrace);
  }
});

class DriverRepository {
  const DriverRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

  Future<List<DriverRoute>> listRoutes() async {
    final json = await apiClient.getJson('/driver/routes');
    return _routes(json);
  }

  /// This driver's own trust score (0..100), or null when unavailable.
  ///
  /// `/me` returns `driver_profile` only for drivers, so a missing block is a
  /// legitimate "no score" rather than a failure.
  Future<int?> ownTrustScore() async {
    final json = await apiClient.getJson('/me');
    final profile = json['driver_profile'];
    if (profile is! Map) return null;
    final value = profile['trust_score'];
    return value is num ? value.toInt() : null;
  }

  Future<List<DriverRoute>> activeRoutes() async {
    final json = await apiClient.getJson('/driver/routes/active');
    return _routes(json);
  }

  Future<DriverRoute> createRoute({
    required int seatsAvailable,
    required int parcelCapacityAvailable,
  }) async {
    final json = await apiClient.postJson(
      '/driver/routes',
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
    final json = await apiClient.patchJson('/driver/routes/$id/deactivate');
    return DriverRoute.fromJson(json['route'] as Map<String, dynamic>);
  }

  Future<List<DriverMatch>> listMatches({String? status}) async {
    final suffix = status == null
        ? ''
        : '?status=${Uri.encodeQueryComponent(status)}';
    final json = await apiClient.getJson('/matches$suffix');
    final matches = json['matches'];
    if (matches is! List) throw const FormatException('Missing matches');
    return matches
        .cast<Map<String, dynamic>>()
        .map(DriverMatch.fromJson)
        .toList();
  }

  Future<DriverMatch> matchDetail(String id) async {
    final json = await apiClient.getJson('/matches/$id');
    return DriverMatch.fromJson(json['match'] as Map<String, dynamic>);
  }

  Future<DriverTripReference> acceptMatch(String id) async {
    final json = await apiClient.postJson(
      '/matches/$id/accept',
      body: const {},
    );
    return DriverTripReference.fromJson(json['trip'] as Map<String, dynamic>);
  }

  Future<void> rejectMatch(String id) async {
    await apiClient.postJson('/matches/$id/reject', body: const {});
  }

  Future<List<DriverTrip>> listTrips() async {
    final json = await apiClient.getJson('/trips');
    final trips = json['trips'];
    if (trips is! List) throw const FormatException('Missing trips');
    return trips.cast<Map<String, dynamic>>().map(DriverTrip.fromJson).toList();
  }

  Future<DriverTrip> tripDetail(String id) async {
    final json = await apiClient.getJson('/trips/$id');
    return DriverTrip.fromJson(json['trip'] as Map<String, dynamic>);
  }

  Future<void> updateTripStatus(String id, String status) async {
    await apiClient.postJson('/trips/$id/status', body: {'status': status});
  }

  Future<TripLocation> simulateStep(String id) async {
    if (!_compileTimeDemoFeatures) {
      throw UnsupportedError('Demo simulation is not available in this build');
    }
    final json = await apiClient.postJson(
      '/trips/$id/simulate/step',
      body: const {},
    );
    return TripLocation.fromJson(json['location'] as Map<String, dynamic>);
  }

  Future<void> resetSimulation(String id) async {
    if (!_compileTimeDemoFeatures) {
      throw UnsupportedError('Demo simulation is not available in this build');
    }
    await apiClient.postJson('/trips/$id/simulate/reset', body: const {});
  }

  Future<TripLocation?> latestLocation(String id) async {
    final json = await apiClient.getJson('/trips/$id/location');
    final location = json['location'];
    return location is Map<String, dynamic>
        ? TripLocation.fromJson(location)
        : null;
  }

  List<DriverRoute> _routes(Map<String, dynamic> json) {
    final routes = json['routes'];
    if (routes is! List) throw const FormatException('Missing routes');
    return routes
        .cast<Map<String, dynamic>>()
        .map(DriverRoute.fromJson)
        .toList();
  }
}
