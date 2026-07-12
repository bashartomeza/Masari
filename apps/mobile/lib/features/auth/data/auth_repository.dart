import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../domain/auth_models.dart';
import 'token_storage.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    apiClient: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

class AuthRepository {
  const AuthRepository({required this.apiClient, required this.tokenStorage});

  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  Future<LoginResult> login({
    required String phone,
    required String password,
  }) async {
    final json = await apiClient.postJson(
      '/auth/login',
      body: {'phone': phone, 'password': password},
    );
    return LoginResult.fromJson(json);
  }

  Future<AuthUser> me(String token) async {
    final json = await apiClient.getJson('/me', token: token);
    final userJson = json['user'];
    if (userJson is! Map<String, dynamic>) {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
    return AuthUser.fromJson(userJson);
  }
}
