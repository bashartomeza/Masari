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

  static const _deviceName = 'Masari App';

  Future<LoginResult> login({
    required String email,
    required String password,
    String deviceName = _deviceName,
  }) async {
    return _authRequest(
      '/auth/login',
      body: {'email': email, 'password': password, 'device_name': deviceName},
    );
  }

  Future<LoginResult> register({
    required String name,
    required String email,
    required String password,
    String deviceName = _deviceName,
  }) async {
    return _authRequest(
      '/auth/register',
      body: {
        'name': name,
        'email': email,
        'password': password,
        'device_name': deviceName,
      },
    );
  }

  Future<LoginResult> loginWithGoogle({
    required String idToken,
    String deviceName = _deviceName,
  }) async {
    return _authRequest(
      '/auth/google',
      body: {'id_token': idToken, 'device_name': deviceName},
    );
  }

  Future<LoginResult> _authRequest(
    String path, {
    required Map<String, dynamic> body,
  }) async {
    final json = await apiClient.postJson(path, body: body);
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
