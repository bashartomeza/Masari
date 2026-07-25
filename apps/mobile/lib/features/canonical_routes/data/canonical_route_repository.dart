import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_error.dart';
import '../../auth/data/authenticated_api_client.dart';
import '../domain/canonical_route_models.dart';

final canonicalRouteRepositoryProvider = Provider<CanonicalRouteRepository>((
  ref,
) {
  return CanonicalRouteRepository(
    apiClient: ref.watch(authenticatedApiClientProvider),
  );
});

class CanonicalRouteRepository {
  const CanonicalRouteRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

  Future<MobileCapabilities> capabilities() async {
    final json = await apiClient.getJson('/capabilities');
    return MobileCapabilities.fromJson(json);
  }

  Future<List<CanonicalRoute>> routes() async {
    final json = await apiClient.getJson('/routes?limit=50');
    if (json['enabled'] != true) return const [];
    final rawRoutes = json['routes'];
    if (rawRoutes is! List) throw const FormatException('Invalid routes');
    final routes = <CanonicalRoute>[];
    for (final raw in rawRoutes) {
      final route = CanonicalRoute.fromJson(_map(raw));
      final stopsJson = await apiClient.getJson(
        '/route-versions/${Uri.encodeComponent(route.versionId)}/stops',
      );
      final rawStops = stopsJson['stops'];
      if (rawStops is! List) throw const FormatException('Invalid stops');
      final stops =
          rawStops
              .map((value) => CanonicalStop.fromMembership(_map(value)))
              .toList(growable: false)
            ..sort((left, right) => left.sequence.compareTo(right.sequence));
      routes.add(route.withStops(stops));
    }
    return List.unmodifiable(routes.where((route) => route.currentlyEligible));
  }

  Future<void> requireFreshRoute(String routeVersionId) async {
    final currentCapabilities = await capabilities();
    if (!currentCapabilities.routeCatalogAvailable ||
        !currentCapabilities.multiRouteEntryAvailable) {
      throw const ApiException(
        ApiErrorType.forbidden,
        'canonical_entry_disabled',
        statusCode: 404,
      );
    }
    final currentRoutes = await routes();
    if (!currentRoutes.any((route) => route.versionId == routeVersionId)) {
      throw const ApiException(
        ApiErrorType.validation,
        'route_unavailable',
        statusCode: 409,
      );
    }
  }

  Future<List<DriverAvailability>> availabilities() async {
    final json = await apiClient.getJson('/driver/availabilities');
    final raw = json['availabilities'];
    if (raw is! List) throw const FormatException('Invalid availabilities');
    return raw
        .map((value) => DriverAvailability.fromJson(_map(value)))
        .toList(growable: false);
  }

  Future<DriverAvailability> createAvailability({
    required Map<String, dynamic> payload,
    required String idempotencyKey,
  }) async {
    final json = await apiClient.postJson(
      '/driver/availabilities',
      body: payload,
      headers: {'Idempotency-Key': idempotencyKey},
    );
    return DriverAvailability.fromJson(_map(json['availability']));
  }

  Future<DriverAvailability> updateAvailability(
    String id,
    Map<String, dynamic> payload,
  ) async {
    final json = await apiClient.patchJson(
      '/driver/availabilities/${Uri.encodeComponent(id)}',
      body: payload,
    );
    return DriverAvailability.fromJson(_map(json['availability']));
  }

  Future<DriverAvailability> transitionAvailability(
    DriverAvailability availability,
    String action,
  ) async {
    if (!const {'activate', 'pause', 'resume', 'cancel'}.contains(action)) {
      throw ArgumentError.value(action, 'action');
    }
    final json = await apiClient.postJson(
      '/driver/availabilities/${Uri.encodeComponent(availability.id)}/$action',
      body: {'expected_revision': availability.revision},
    );
    return DriverAvailability.fromJson(_map(json['availability']));
  }

  Future<CanonicalPassengerRequest> createPassengerRequest({
    required Map<String, dynamic> payload,
    required String idempotencyKey,
  }) async {
    final json = await apiClient.postJson(
      '/passenger/route-requests',
      body: payload,
      headers: {'Idempotency-Key': idempotencyKey},
    );
    return CanonicalPassengerRequest.fromEnvelope(json);
  }

  Future<CanonicalMerchantOrder> createMerchantOrder({
    required Map<String, dynamic> payload,
    required String idempotencyKey,
  }) async {
    final json = await apiClient.postJson(
      '/merchant/route-orders',
      body: payload,
      headers: {'Idempotency-Key': idempotencyKey},
    );
    return CanonicalMerchantOrder.fromEnvelope(json);
  }
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map<String, dynamic>) return value;
  throw const FormatException('Expected object');
}
