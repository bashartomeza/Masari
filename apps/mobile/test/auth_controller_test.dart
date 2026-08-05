import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:masari_mobile/core/api/api_client.dart';
import 'package:masari_mobile/core/config/app_config.dart';
import 'package:masari_mobile/features/auth/application/auth_controller.dart';
import 'package:masari_mobile/features/auth/data/token_storage.dart';
import 'package:masari_mobile/features/auth/domain/auth_models.dart';
import 'package:masari_mobile/features/onboarding/data/onboarding_storage.dart';
import 'package:masari_mobile/features/passenger/application/passenger_history_controller.dart';

import 'test_app_config.dart';

void main() {
  test('no token routes to login state', () async {
    FlutterSecureStorage.setMockInitialValues(<String, String>{});
    final container = _container((request) async => http.Response('{}', 500));
    addTearDown(container.dispose);

    final state = await container.read(authControllerProvider.future);

    expect(state.status, AuthStatus.unauthenticated);
  });

  test('valid saved token restores session', () async {
    FlutterSecureStorage.setMockInitialValues({
      TokenStorage.tokenKey: 'saved-token',
      OnboardingStorage.bundleKey: 'stale-onboarding-bundle',
    });
    final container = _container((request) async {
      return http.Response(
        '{"user":{"id":"user_1","name":"Demo Passenger","phone":"+970590000001","role":"passenger","demo_account":true}}',
        200,
      );
    });
    addTearDown(container.dispose);

    final state = await container.read(authControllerProvider.future);

    expect(state.status, AuthStatus.authenticated);
    expect(state.user?.role, UserRole.passenger);
    expect(
      await const FlutterSecureStorage().read(key: OnboardingStorage.bundleKey),
      isNull,
    );
  });

  test('terminal 401 removes token and exposes session-ended state', () async {
    FlutterSecureStorage.setMockInitialValues({
      TokenStorage.tokenKey: 'expired-token',
    });
    final container = _container(
      (request) async => http.Response('{"error":"invalid_token"}', 401),
    );
    addTearDown(container.dispose);

    final state = await container.read(authControllerProvider.future);
    final token = await container.read(tokenStorageProvider).readToken();

    expect(state.status, AuthStatus.sessionEnded);
    expect(state.sessionEndReason, SessionEndReason.ended);
    expect(token, isNull);
  });

  test(
    'new login persists access, refresh, expiries, and session as a bundle',
    () async {
      FlutterSecureStorage.setMockInitialValues(<String, String>{});
      final container = _container((request) async {
        if (request.url.path.endsWith('/auth/login')) {
          return http.Response(
            '{"token":"access-value","access_token":"access-value","access_token_expires_in":900,"refresh_token":"refresh-value","refresh_token_expires_in":3600,"session":{"id":"session_1","client_type":"mobile","device_name":"Masari Android","created_at":"2026-07-17T10:00:00.000Z","last_used_at":"2026-07-17T10:00:00.000Z","expires_at":"2026-07-17T11:00:00.000Z","is_current":true,"revoked":false},"user":{"id":"user_1","name":"Demo Passenger","phone":"+970590000001","role":"passenger","demo_account":true}}',
            200,
          );
        }
        return http.Response('{"error":"not_found"}', 404);
      });
      addTearDown(container.dispose);
      await container.read(authControllerProvider.future);

      await container
          .read(authControllerProvider.notifier)
          .login(phone: '+970590000001', password: 'password-value');
      final bundle = await container.read(tokenStorageProvider).readBundle();

      expect(bundle?.accessToken, 'access-value');
      expect(bundle?.refreshToken, 'refresh-value');
      expect(bundle?.sessionId, 'session_1');
      expect(bundle?.accessTokenExpiresAt, isNotNull);
      expect(bundle?.refreshTokenExpiresAt, isNotNull);
      expect(
        container.read(authControllerProvider).value?.status,
        AuthStatus.authenticated,
      );
    },
  );

  test('corrupt stored bundle clears safely and routes to login', () async {
    FlutterSecureStorage.setMockInitialValues({
      TokenStorage.bundleKey:
          '{"version":1,"access_token":"partial","refresh_token_expires_at":"not-a-time"}',
      TokenStorage.tokenKey: 'legacy-value',
    });
    final container = _container((request) async => http.Response('{}', 500));
    addTearDown(container.dispose);

    final state = await container.read(authControllerProvider.future);

    expect(state.status, AuthStatus.unauthenticated);
    expect(await container.read(tokenStorageProvider).readBundle(), isNull);
  });

  test(
    'temporary network failure preserves token and shows retry state',
    () async {
      FlutterSecureStorage.setMockInitialValues({
        TokenStorage.tokenKey: 'possibly-valid',
      });
      final container = _container(
        (request) async => throw http.ClientException('offline'),
      );
      addTearDown(container.dispose);

      final state = await container.read(authControllerProvider.future);
      final token = await container.read(tokenStorageProvider).readToken();

      expect(state.status, AuthStatus.restoreFailed);
      expect(token, 'possibly-valid');
    },
  );

  test('logout removes token', () async {
    FlutterSecureStorage.setMockInitialValues({
      TokenStorage.tokenKey: 'saved-token',
    });
    final container = _container((request) async {
      return http.Response(
        '{"user":{"id":"user_1","name":"Demo Passenger","phone":"+970590000001","role":"passenger","demo_account":true}}',
        200,
      );
    });
    addTearDown(container.dispose);

    await container.read(authControllerProvider.future);
    await container.read(authControllerProvider.notifier).logout();
    final token = await container.read(tokenStorageProvider).readToken();

    expect(token, isNull);
    expect(
      container.read(authControllerProvider).value?.status,
      AuthStatus.unauthenticated,
    );
  });

  // The trip history is not autoDispose, so without an explicit invalidation on
  // logout the next account would be served the previous passenger's trips
  // straight from the cache, as settled data, with no request going out.
  //
  // Riverpod keeps the stale value readable while the invalidated provider
  // reloads, so the assertion is on `isLoading`: that is what marks the cached
  // trips as no longer current. Drop the invalidation and this stays false.
  test('logout invalidates the passenger trip history', () async {
    FlutterSecureStorage.setMockInitialValues({
      TokenStorage.tokenKey: 'saved-token',
    });
    final container = _container((request) async {
      if (request.url.path.endsWith('/passenger/requests')) {
        return http.Response(
          '{"requests":[{"id":"request_1","pickup_label":"PPU Main Gate",'
          '"pickup_lat":31.5326,"pickup_lng":35.0998,'
          '"destination_label":"Bethlehem Center","destination_lat":31.7054,'
          '"destination_lng":35.2024,'
          '"preferred_time":"2026-07-17T09:00:00.000Z","passenger_count":1,'
          '"status":"completed","created_at":"2026-07-17T08:00:00.000Z"}]}',
          200,
        );
      }
      if (request.url.path.endsWith('/trips')) {
        return http.Response('{"trips":[]}', 200);
      }
      return http.Response(
        '{"user":{"id":"user_1","name":"Demo Passenger","phone":"+970590000001","role":"passenger","demo_account":true}}',
        200,
      );
    });
    addTearDown(container.dispose);

    await container.read(authControllerProvider.future);
    final loaded = await container.read(passengerHistoryProvider.future);
    expect(loaded.past, hasLength(1));
    expect(container.read(passengerHistoryProvider).isLoading, isFalse);

    await container.read(authControllerProvider.notifier).logout();

    expect(
      container.read(passengerHistoryProvider).isLoading,
      isTrue,
      reason: 'the previous account\'s trips must not survive as settled data',
    );
  });
}

ProviderContainer _container(
  Future<http.Response> Function(http.Request request) handler,
) {
  return ProviderContainer(
    overrides: [
      appConfigProvider.overrideWithValue(demoTestAppConfig),
      httpClientProvider.overrideWithValue(MockClient(handler)),
    ],
  );
}
