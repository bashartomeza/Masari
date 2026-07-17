import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import 'session_coordinator.dart';

final authenticatedApiClientProvider = Provider<AuthenticatedApiClient>((ref) {
  return AuthenticatedApiClient(
    apiClient: ref.watch(apiClientProvider),
    sessionCoordinator: ref.watch(authSessionCoordinatorProvider),
  );
});

class AuthenticatedApiClient {
  const AuthenticatedApiClient({
    required this.apiClient,
    required this.sessionCoordinator,
  });

  final ApiClient apiClient;
  final AuthSessionCoordinator sessionCoordinator;

  Future<Map<String, dynamic>> getJson(String path) {
    return sessionCoordinator.sendAuthenticated(
      (token) => apiClient.getJson(path, token: token),
    );
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    required Map<String, dynamic> body,
  }) {
    return sessionCoordinator.sendAuthenticated(
      (token) => apiClient.postJson(path, body: body, token: token),
    );
  }

  Future<Map<String, dynamic>> patchJson(
    String path, {
    Map<String, dynamic> body = const {},
  }) {
    return sessionCoordinator.sendAuthenticated(
      (token) => apiClient.patchJson(path, body: body, token: token),
    );
  }

  Future<Map<String, dynamic>> deleteJson(String path) {
    return sessionCoordinator.sendAuthenticated(
      (token) => apiClient.deleteJson(path, token: token),
    );
  }
}
