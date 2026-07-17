import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/authenticated_api_client.dart';
import '../../auth/domain/auth_models.dart';

final sessionRepositoryProvider = Provider<SessionRepository>((ref) {
  return SessionRepository(
    apiClient: ref.watch(authenticatedApiClientProvider),
  );
});

class SessionRepository {
  const SessionRepository({required this.apiClient});

  final AuthenticatedApiClient apiClient;

  Future<List<AuthSessionSummary>> listSessions() async {
    final json = await apiClient.getJson('/auth/sessions');
    final sessions = json['sessions'];
    if (sessions is! List) throw const FormatException('Missing sessions');
    return sessions
        .map((value) {
          if (value is! Map<String, dynamic>) {
            throw const FormatException('Invalid session summary');
          }
          return AuthSessionSummary.fromJson(value);
        })
        .toList(growable: false);
  }

  Future<void> revokeSession(String id) async {
    await apiClient.deleteJson('/auth/sessions/${Uri.encodeComponent(id)}');
  }

  Future<void> logout() async {
    await apiClient.postJson('/auth/logout', body: const {});
  }

  Future<void> logoutAll() async {
    await apiClient.postJson('/auth/logout-all', body: const {});
  }
}
