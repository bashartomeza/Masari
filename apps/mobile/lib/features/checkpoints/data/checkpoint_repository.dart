import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/authenticated_api_client.dart';
import '../domain/checkpoint_models.dart';

final checkpointRepositoryProvider = Provider<CheckpointRepository>((ref) {
  return CheckpointRepository(
    apiClient: ref.watch(authenticatedApiClientProvider),
  );
});

/// Reads barriers through Masari's own API.
///
/// The upstream feed is deliberately not called from the app: the key would
/// ship in the APK and the call would sit outside the session boundary. The
/// server proxies it, so this is an ordinary authenticated endpoint.
class CheckpointRepository {
  const CheckpointRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

  Future<CheckpointSnapshot> checkpoints() async {
    final json = await apiClient.getJson('/checkpoints');
    return CheckpointSnapshot.fromJson(json);
  }
}
