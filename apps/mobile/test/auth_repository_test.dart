import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:masari_mobile/core/api/api_client.dart';
import 'package:masari_mobile/core/api/api_error.dart';
import 'package:masari_mobile/features/auth/data/auth_repository.dart';
import 'package:masari_mobile/features/auth/data/token_storage.dart';
import 'package:masari_mobile/features/auth/domain/auth_models.dart';

void main() {
  test('successful login parsing', () async {
    final repository = _repository((request) async {
      return http.Response(
        '{"token":"jwt-token","user":{"id":"user_1","name":"Demo Passenger","phone":"+970590000001","role":"passenger","demo_account":true}}',
        200,
      );
    });

    final result = await repository.login(
      phone: '+970590000001',
      password: 'demo-passenger-123',
    );

    expect(result.token, 'jwt-token');
    expect(result.user.role, UserRole.passenger);
    expect(result.user.demoAccount, isTrue);
  });

  test('failed login error mapping', () async {
    final repository = _repository((request) async {
      return http.Response('{"error":"invalid_credentials"}', 401);
    });

    await expectLater(
      repository.login(phone: '+970590000001', password: 'bad'),
      throwsA(
        isA<ApiException>().having(
          (error) => error.type,
          'type',
          ApiErrorType.unauthorized,
        ),
      ),
    );
  });

  test('/me parsing and authorization header is sent', () async {
    String? authorization;
    final repository = _repository((request) async {
      authorization = request.headers[HttpHeaders.authorizationHeader];
      return http.Response(
        '{"user":{"id":"user_2","name":"Demo Driver","phone":"+970590000002","role":"driver","demo_account":true}}',
        200,
      );
    });

    final user = await repository.me('secret-token');

    expect(authorization, 'Bearer secret-token');
    expect(user.role, UserRole.driver);
  });

  test('raw token is not exposed through errors', () async {
    final repository = _repository((request) async {
      return http.Response('{"error":"invalid_token"}', 401);
    });

    Object? caught;
    try {
      await repository.me('raw-secret-token');
    } catch (error) {
      caught = error;
    }

    expect(caught.toString(), isNot(contains('raw-secret-token')));
  });
}

AuthRepository _repository(
  Future<http.Response> Function(http.Request request) handler,
) {
  return AuthRepository(
    apiClient: ApiClient(
      baseUrl: 'http://api.test',
      client: MockClient(handler),
    ),
    tokenStorage: _NoopTokenStorage(),
  );
}

class _NoopTokenStorage implements TokenStorage {
  String? token;

  @override
  Future<void> clearToken() async => token = null;

  @override
  Future<String?> readToken() async => token;

  @override
  Future<void> saveToken(String token) async => this.token = token;
}
