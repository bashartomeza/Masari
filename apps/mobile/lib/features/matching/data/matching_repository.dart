import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../auth/data/token_storage.dart';
import 'matching_models.dart';

final matchingRepositoryProvider = Provider<MatchingRepository>((ref) {
  return MatchingRepository(
    apiClient: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

class MatchingRepository {
  const MatchingRepository({
    required this.apiClient,
    required this.tokenStorage,
  });

  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  Future<MatchResult> runForPassengerRequest(String requestId) async {
    final json = await apiClient.postJson(
      '/matches/run',
      token: await _token(),
      body: {'passengerRequestId': requestId},
    );
    return _match(json);
  }

  Future<MatchResult> detail(String id) async {
    final json = await apiClient.getJson('/matches/$id', token: await _token());
    return _match(json);
  }

  Future<String> _token() async => await tokenStorage.readToken() ?? '';

  MatchResult _match(Map<String, dynamic> json) {
    return MatchResult.fromJson(
      json['match'] as Map<String, dynamic>,
      json['scoringBreakdown'] as Map<String, dynamic>,
    );
  }
}
