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

  Future<MatchResult?> latestForPassengerRequest(String requestId) async {
    final json = await apiClient.getJson('/matches');
    final matches = json['matches'];
    if (matches is! List) throw const FormatException('Missing matches');
    for (final raw in matches.cast<Map<String, dynamic>>()) {
      final passengerRequest = raw['passenger_request'];
      if (passengerRequest is Map && passengerRequest['id'] == requestId) {
        final scoring = raw['scoring_breakdown'];
        if (scoring is! Map<String, dynamic>) {
          throw const FormatException('Missing scoring breakdown');
        }
        return MatchResult.fromJson(raw, scoring);
      }
    }
    return null;
  }

  MatchResult _match(Map<String, dynamic> json) {
    return MatchResult.fromJson(
      json['match'] as Map<String, dynamic>,
      json['scoringBreakdown'] as Map<String, dynamic>,
    );
  }
}
