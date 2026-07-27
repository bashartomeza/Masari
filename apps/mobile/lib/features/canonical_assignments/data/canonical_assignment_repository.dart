import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/authenticated_api_client.dart';
import '../domain/canonical_assignment_models.dart';

final canonicalAssignmentRepositoryProvider =
    Provider<CanonicalAssignmentRepository>((ref) {
      return CanonicalAssignmentRepository(
        apiClient: ref.watch(authenticatedApiClientProvider),
      );
    });

class CanonicalAssignmentRepository {
  const CanonicalAssignmentRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

  Future<CanonicalOfferPage> driverOffers({
    String? cursor,
    int limit = 25,
  }) async {
    final query = <String, String>{'limit': '$limit'};
    if (cursor != null) query['cursor'] = cursor;
    final path = Uri(
      path: '/driver/canonical-match-offers',
      queryParameters: query,
    ).toString();
    return CanonicalOfferPage.fromJson(await apiClient.getJson(path));
  }

  Future<CanonicalOfferEnvelope> driverOffer(String id) async {
    final json = await apiClient.getJson(
      '/driver/canonical-match-offers/${Uri.encodeComponent(id)}',
    );
    return CanonicalOfferEnvelope(
      offer: CanonicalDriverOffer.fromJson(_map(json['offer'])),
      serverNow: _date(json, 'server_now'),
    );
  }

  Future<CanonicalDriverOffer> acceptOffer({
    required String id,
    required String idempotencyKey,
  }) async {
    final json = await apiClient.postJson(
      '/driver/canonical-match-offers/${Uri.encodeComponent(id)}/accept',
      body: const {},
      headers: {'Idempotency-Key': idempotencyKey},
    );
    return CanonicalDriverOffer.fromJson(_map(json['offer']));
  }

  Future<CanonicalDriverOffer> rejectOffer({
    required String id,
    required CanonicalRejectReason reason,
    required String idempotencyKey,
  }) async {
    final json = await apiClient.postJson(
      '/driver/canonical-match-offers/${Uri.encodeComponent(id)}/reject',
      body: {'reason': reason.apiValue},
      headers: {'Idempotency-Key': idempotencyKey},
    );
    return CanonicalDriverOffer.fromJson(_map(json['offer']));
  }

  Future<List<CanonicalAssignment>> passengerAssignments({int limit = 50}) =>
      _assignmentList(
        '/passenger/route-requests?limit=$limit',
        collectionKey: 'requests',
      );

  Future<CanonicalAssignmentEnvelope> passengerAssignment(String id) =>
      _assignmentDetail(
        '/passenger/route-requests/${Uri.encodeComponent(id)}',
        resourceKey: 'request',
      );

  Future<List<CanonicalAssignment>> merchantAssignments({int limit = 50}) =>
      _assignmentList(
        '/merchant/route-orders?limit=$limit',
        collectionKey: 'orders',
      );

  Future<CanonicalAssignmentEnvelope> merchantAssignment(String id) =>
      _assignmentDetail(
        '/merchant/route-orders/${Uri.encodeComponent(id)}',
        resourceKey: 'order',
      );

  Future<List<CanonicalAssignment>> _assignmentList(
    String path, {
    required String collectionKey,
  }) async {
    final json = await apiClient.getJson(path);
    final raw = json[collectionKey];
    if (raw is! List) throw const FormatException('Invalid assignments');
    return List.unmodifiable(
      raw.map((value) => CanonicalAssignment.fromJson(_map(value))),
    );
  }

  Future<CanonicalAssignmentEnvelope> _assignmentDetail(
    String path, {
    required String resourceKey,
  }) async {
    final json = await apiClient.getJson(path);
    return CanonicalAssignmentEnvelope(
      assignment: CanonicalAssignment.fromJson(_map(json[resourceKey])),
      serverNow: _date(json, 'server_now'),
    );
  }
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map<String, dynamic>) return value;
  throw const FormatException('Expected object');
}

DateTime _date(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! String) throw FormatException('Invalid $key');
  final parsed = DateTime.tryParse(value);
  if (parsed == null) throw FormatException('Invalid $key');
  return parsed.toUtc();
}
