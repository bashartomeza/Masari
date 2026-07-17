import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error.dart';
import '../domain/auth_models.dart';
import 'authenticated_api_client.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    apiClient: ref.watch(apiClientProvider),
    authenticatedApiClient: ref.watch(authenticatedApiClientProvider),
  );
});

class AuthRepository {
  const AuthRepository({
    required this.apiClient,
    required this.authenticatedApiClient,
  });

  final ApiClient apiClient;
  final AuthenticatedApiClient authenticatedApiClient;

  Future<LoginResult> login({
    required String phone,
    required String password,
    String deviceName = 'Masari Android',
  }) async {
    final json = await apiClient.postJson(
      '/auth/login',
      body: {'phone': phone, 'password': password, 'device_name': deviceName},
    );
    try {
      return LoginResult.fromJson(json);
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }

  Future<AuthUser> me() async {
    final json = await authenticatedApiClient.getJson('/me');
    final userJson = json['user'];
    if (userJson is! Map<String, dynamic>) {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
    try {
      return AuthUser.fromJson(userJson);
    } on FormatException {
      throw const ApiException(ApiErrorType.validation, 'invalid_response');
    }
  }
}
