import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/authenticated_api_client.dart';
import 'matching_models.dart';

final matchingRepositoryProvider = Provider<MatchingRepository>((ref) {
  return MatchingRepository(
    apiClient: ref.watch(authenticatedApiClientProvider),
  );
});

class MatchingRepository {
  const MatchingRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

  Future<MatchResult> runForPassengerRequest(String requestId) async {
    final json = await apiClient.postJson(
      '/matches/run',
      body: {'passengerRequestId': requestId},
    );
    return _match(json);
  }

  Future<MatchResult> detail(String id) async {
    final json = await apiClient.getJson('/matches/$id');
    return _match(json);
  }

  MatchResult _match(Map<String, dynamic> json) {
    return MatchResult.fromJson(
      json['match'] as Map<String, dynamic>,
      json['scoringBreakdown'] as Map<String, dynamic>,
    );
  }
}
