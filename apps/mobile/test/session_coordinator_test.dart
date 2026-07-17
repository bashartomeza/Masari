import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:masari_mobile/core/api/api_error.dart';
import 'package:masari_mobile/features/auth/data/session_coordinator.dart';
import 'package:masari_mobile/features/auth/domain/auth_models.dart';

import 'support/auth_test_support.dart';

void main() {
  final fixedNow = DateTime.utc(2026, 7, 17, 10);

  test('safely valid access token does not refresh', () async {
    var refreshCalls = 0;
    String? authorization;
    final harness = TestAuthenticatedClient(
      now: () => fixedNow,
      bundle: _bundle(fixedNow, accessExpiresIn: const Duration(minutes: 10)),
      handler: (request) async {
        if (request.url.path.endsWith('/auth/refresh')) refreshCalls += 1;
        authorization = request.headers[HttpHeaders.authorizationHeader];
        return http.Response('{"ok":true}', 200);
      },
    );

    await harness.client.getJson('/dashboard');

    expect(refreshCalls, 0);
    expect(authorization, 'Bearer old-access');
  });

  test('near-expiry concurrent requests share exactly one refresh', () async {
    var refreshCalls = 0;
    final authorizations = <String?>[];
    final transitions = <SessionTransitionType>[];
    final harness = TestAuthenticatedClient(
      now: () => fixedNow,
      bundle: _bundle(fixedNow, accessExpiresIn: const Duration(seconds: 30)),
      handler: (request) async {
        if (request.url.path.endsWith('/auth/refresh')) {
          refreshCalls += 1;
          await Future<void>.delayed(const Duration(milliseconds: 20));
          return http.Response(
            _refreshResponse('new-access', 'new-refresh'),
            200,
          );
        }
        authorizations.add(request.headers[HttpHeaders.authorizationHeader]);
        return http.Response('{"ok":true}', 200);
      },
    );
    harness.coordinator.setListener((event) => transitions.add(event.type));

    final results = await Future.wait(
      List.generate(6, (_) => harness.client.getJson('/dashboard')),
    );

    expect(results, everyElement({'ok': true}));
    expect(refreshCalls, 1);
    expect(authorizations, everyElement('Bearer new-access'));
    expect(harness.storage.bundle?.refreshToken, 'new-refresh');
    expect(transitions, [
      SessionTransitionType.refreshing,
      SessionTransitionType.refreshed,
    ]);
  });

  test(
    'failed single-flight reaches all waiters and a later refresh can run',
    () async {
      var refreshCalls = 0;
      var failRefresh = true;
      final harness = TestAuthenticatedClient(
        now: () => fixedNow,
        bundle: _bundle(fixedNow, accessExpiresIn: const Duration(seconds: 20)),
        handler: (request) async {
          if (request.url.path.endsWith('/auth/refresh')) {
            refreshCalls += 1;
            await Future<void>.delayed(const Duration(milliseconds: 20));
            if (failRefresh) throw http.ClientException('offline');
            return http.Response(
              _refreshResponse('later-access', 'later-refresh'),
              200,
            );
          }
          return http.Response('{"ok":true}', 200);
        },
      );

      final errors = await Future.wait(
        List.generate(4, (_) async {
          try {
            await harness.client.getJson('/dashboard');
            return null;
          } catch (error) {
            return error;
          }
        }),
      );

      expect(refreshCalls, 1);
      expect(errors, everyElement(isA<ApiException>()));
      expect(
        errors.cast<ApiException>().map((error) => error.type),
        everyElement(ApiErrorType.network),
      );
      expect(harness.storage.bundle?.refreshToken, 'old-refresh');

      failRefresh = false;
      await harness.client.getJson('/dashboard');
      expect(refreshCalls, 2);
      expect(harness.storage.bundle?.refreshToken, 'later-refresh');
    },
  );

  test('exact access expiry refreshes and retries the request once', () async {
    var refreshCalls = 0;
    var dataCalls = 0;
    final harness = TestAuthenticatedClient(
      now: () => fixedNow,
      bundle: _bundle(fixedNow, accessExpiresIn: const Duration(minutes: 10)),
      handler: (request) async {
        if (request.url.path.endsWith('/auth/refresh')) {
          refreshCalls += 1;
          return http.Response(
            _refreshResponse('retry-access', 'retry-refresh'),
            200,
          );
        }
        dataCalls += 1;
        if (dataCalls == 1) {
          return http.Response('{"error":"access_token_expired"}', 401);
        }
        expect(
          request.headers[HttpHeaders.authorizationHeader],
          'Bearer retry-access',
        );
        return http.Response('{"ok":true}', 200);
      },
    );

    final result = await harness.client.postJson(
      '/passenger/requests',
      body: const {'passenger_count': 1},
    );

    expect(result, {'ok': true});
    expect(refreshCalls, 1);
    expect(dataCalls, 2);
  });

  test('a retried request is never retried more than once', () async {
    var refreshCalls = 0;
    var dataCalls = 0;
    final harness = TestAuthenticatedClient(
      now: () => fixedNow,
      bundle: _bundle(fixedNow, accessExpiresIn: const Duration(minutes: 10)),
      handler: (request) async {
        if (request.url.path.endsWith('/auth/refresh')) {
          refreshCalls += 1;
          return http.Response(
            _refreshResponse('retry-access', 'retry-refresh'),
            200,
          );
        }
        dataCalls += 1;
        return http.Response('{"error":"access_token_expired"}', 401);
      },
    );

    await expectLater(
      harness.client.getJson('/dashboard'),
      throwsA(
        isA<ApiException>().having(
          (error) => error.message,
          'code',
          'access_token_expired',
        ),
      ),
    );

    expect(refreshCalls, 1);
    expect(dataCalls, 2);
    expect(harness.storage.bundle, isNull);
  });

  test('forbidden domain errors do not refresh or log out', () async {
    var refreshCalls = 0;
    final harness = TestAuthenticatedClient(
      now: () => fixedNow,
      bundle: _bundle(fixedNow, accessExpiresIn: const Duration(minutes: 10)),
      handler: (request) async {
        if (request.url.path.endsWith('/auth/refresh')) refreshCalls += 1;
        return http.Response('{"error":"forbidden"}', 403);
      },
    );

    await expectLater(
      harness.client.getJson('/admin-only'),
      throwsA(isA<ApiException>()),
    );

    expect(refreshCalls, 0);
    expect(harness.storage.bundle, isNotNull);
  });

  for (final code in [
    'session_revoked',
    'session_expired',
    'invalid_session',
    'invalid_token',
    'account_unavailable',
  ]) {
    test('$code terminates without attempting refresh', () async {
      var refreshCalls = 0;
      final harness = TestAuthenticatedClient(
        now: () => fixedNow,
        bundle: _bundle(fixedNow, accessExpiresIn: const Duration(minutes: 10)),
        handler: (request) async {
          if (request.url.path.endsWith('/auth/refresh')) refreshCalls += 1;
          final status = code == 'account_unavailable' ? 403 : 401;
          return http.Response('{"error":"$code"}', status);
        },
      );

      await expectLater(
        harness.client.getJson('/dashboard'),
        throwsA(isA<ApiException>()),
      );

      expect(refreshCalls, 0);
      expect(harness.storage.bundle, isNull);
    });
  }

  test('refresh reuse is terminal and clears the bundle', () async {
    final harness = TestAuthenticatedClient(
      now: () => fixedNow,
      bundle: _bundle(fixedNow, accessExpiresIn: const Duration(seconds: 10)),
      handler: (request) async {
        return http.Response('{"error":"refresh_token_reused"}', 401);
      },
    );

    await expectLater(
      harness.client.getJson('/dashboard'),
      throwsA(isA<ApiException>()),
    );

    expect(harness.storage.bundle, isNull);
    expect(harness.coordinator.lastTerminationReason, SessionEndReason.ended);
  });

  test('network refresh failure preserves the credential bundle', () async {
    final harness = TestAuthenticatedClient(
      now: () => fixedNow,
      bundle: _bundle(fixedNow, accessExpiresIn: const Duration(seconds: 10)),
      handler: (request) async => throw http.ClientException('offline'),
    );

    await expectLater(
      harness.client.getJson('/dashboard'),
      throwsA(
        isA<ApiException>().having(
          (error) => error.type,
          'type',
          ApiErrorType.network,
        ),
      ),
    );

    expect(harness.storage.bundle?.accessToken, 'old-access');
    expect(harness.storage.clearCount, 0);
  });

  test('authoritative expiry logs out without decoding JWT payload', () async {
    var networkCalls = 0;
    final harness = TestAuthenticatedClient(
      now: () => fixedNow,
      bundle: AuthTokenBundle(
        accessToken: 'header.future-looking-payload.signature',
        accessTokenExpiresAt: fixedNow.subtract(const Duration(seconds: 1)),
      ),
      handler: (request) async {
        networkCalls += 1;
        return http.Response('{"ok":true}', 200);
      },
    );

    await expectLater(
      harness.client.getJson('/dashboard'),
      throwsA(isA<ApiException>()),
    );

    expect(networkCalls, 0);
    expect(harness.storage.bundle, isNull);
    expect(harness.coordinator.lastTerminationReason, SessionEndReason.expired);
  });
}

AuthTokenBundle _bundle(DateTime now, {required Duration accessExpiresIn}) {
  return AuthTokenBundle(
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    accessTokenExpiresAt: now.add(accessExpiresIn),
    refreshTokenExpiresAt: now.add(const Duration(days: 1)),
    sessionId: 'session_1',
  );
}

String _refreshResponse(String accessToken, String refreshToken) {
  return jsonEncode({
    'token': accessToken,
    'access_token': accessToken,
    'access_token_expires_in': 120,
    'refresh_token': refreshToken,
    'refresh_token_expires_in': 3600,
    'session': {
      'id': 'session_1',
      'client_type': 'mobile',
      'device_name': 'Masari Android',
      'created_at': '2026-07-17T10:00:00.000Z',
      'last_used_at': '2026-07-17T10:00:00.000Z',
      'expires_at': '2026-07-17T11:00:00.000Z',
      'is_current': true,
      'revoked': false,
    },
    'user': {
      'id': 'user_1',
      'name': 'Passenger',
      'phone': '+970590000001',
      'role': 'passenger',
      'demo_account': false,
    },
  });
}
