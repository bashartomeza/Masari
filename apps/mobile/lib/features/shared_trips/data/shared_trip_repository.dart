import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/authenticated_api_client.dart';
import '../../canonical_assignments/domain/canonical_assignment_models.dart';
import '../domain/shared_trip_models.dart';

final sharedTripRepositoryProvider = Provider<SharedTripRepository>((ref) {
  return SharedTripRepository(
    apiClient: ref.watch(authenticatedApiClientProvider),
  );
});

class SharedTripRepository {
  const SharedTripRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

  Future<SharedOfferPage> driverOffers({String? cursor, int limit = 25}) async {
    final query = <String, String>{'limit': '$limit'};
    if (cursor != null) query['cursor'] = cursor;
    final path = Uri(
      path: '/driver/canonical-shared-offers',
      queryParameters: query,
    ).toString();
    return SharedOfferPage.fromJson(await apiClient.getJson(path));
  }

  Future<SharedOfferEnvelope> driverOffer(String id) async {
    final json = await apiClient.getJson(
      '/driver/canonical-shared-offers/${Uri.encodeComponent(id)}',
    );
    return SharedOfferEnvelope.fromJson(json);
  }

  Future<SharedOfferEnvelope> acceptOffer({
    required String id,
    required String idempotencyKey,
    Future<void> Function()? beforeAuthRetry,
  }) async {
    final json = await apiClient.postJson(
      '/driver/canonical-shared-offers/${Uri.encodeComponent(id)}/accept',
      body: const {},
      headers: {'Idempotency-Key': idempotencyKey},
      beforeRetry: beforeAuthRetry,
    );
    return SharedOfferEnvelope.fromJson(json);
  }

  Future<SharedOfferEnvelope> rejectOffer({
    required String id,
    required CanonicalRejectReason reason,
    required String idempotencyKey,
    Future<void> Function()? beforeAuthRetry,
  }) async {
    final json = await apiClient.postJson(
      '/driver/canonical-shared-offers/${Uri.encodeComponent(id)}/reject',
      body: {'reason': reason.apiValue},
      headers: {'Idempotency-Key': idempotencyKey},
      beforeRetry: beforeAuthRetry,
    );
    return SharedOfferEnvelope.fromJson(json);
  }
}
