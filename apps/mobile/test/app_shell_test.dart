import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:masari_mobile/app.dart';
import 'package:masari_mobile/core/api/api_client.dart';
import 'package:masari_mobile/core/config/app_config.dart';
import 'package:masari_mobile/core/i18n/domain_labels.dart';
import 'package:masari_mobile/core/routing/app_router.dart';
import 'package:masari_mobile/features/auth/data/token_storage.dart';
import 'package:masari_mobile/features/auth/domain/auth_models.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('AppConfig reads API_BASE_URL default', () {
    const config = AppConfig.fromEnvironment();
    expect(config.apiBaseUrl, 'http://10.0.2.2:3000');
  });

  test('routeForRole maps admin safely', () {
    expect(routeForRole(UserRole.passenger), '/passenger');
    expect(routeForRole(UserRole.driver), '/driver');
    expect(routeForRole(UserRole.merchant), '/merchant');
    expect(routeForRole(UserRole.admin), '/unsupported-role');
  });

  testWidgets('Arabic login screen defaults to RTL', (tester) async {
    await _pumpApp(tester);

    expect(find.text('مصاري'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsWidgets);
    expect(
      Directionality.of(tester.element(find.text('مصاري'))),
      TextDirection.rtl,
    );
    expect(find.textContaining('counter', findRichText: true), findsNothing);
  });

  testWidgets('English switch uses LTR and persists', (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();

    expect(find.text('Masari'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('Masari'))),
      TextDirection.ltr,
    );
    final preferences = await SharedPreferences.getInstance();
    expect(preferences.getString(DomainLabels.localeStorageKey), 'en');
  });

  testWidgets('saved English is restored', (tester) async {
    await _pumpApp(tester, localeValues: {DomainLabels.localeStorageKey: 'en'});

    expect(find.text('Sign in'), findsWidgets);
    expect(
      Directionality.of(tester.element(find.text('Masari'))),
      TextDirection.ltr,
    );
  });

  testWidgets('demo account preset fills correct values', (tester) async {
    await _pumpApp(tester);

    await tester.ensureVisible(find.byKey(const ValueKey('demo-passenger')));
    await tester.tap(find.byKey(const ValueKey('demo-passenger')));
    await tester.pump();

    final phone = tester.widget<TextField>(
      find.byKey(const ValueKey('phoneField')),
    );
    final password = tester.widget<TextField>(
      find.byKey(const ValueKey('passwordField')),
    );
    expect(phone.controller?.text, '+970590000001');
    expect(password.controller?.text, 'demo-passenger-123');
  });

  testWidgets('loading disables login button', (tester) async {
    final response = Completer<http.Response>();
    await _pumpApp(tester, handler: (request) => response.future);

    await tester.ensureVisible(find.byKey(const ValueKey('demo-passenger')));
    await tester.tap(find.byKey(const ValueKey('demo-passenger')));
    await tester.pump();
    await tester.ensureVisible(find.byKey(const ValueKey('loginButton')));
    await tester.tap(find.byKey(const ValueKey('loginButton')));
    await tester.pump();
    await tester.drag(find.byType(ListView), const Offset(0, 500));
    await tester.pump();

    final button = tester.widget<FilledButton>(
      find.byKey(const ValueKey('loginButton')),
    );
    expect(button.onPressed, isNull);
    response.complete(http.Response(_loginBody('passenger'), 200));
    await tester.pumpAndSettle();
  });

  testWidgets('invalid credentials display translated error', (tester) async {
    await _pumpApp(
      tester,
      handler: (request) async =>
          http.Response('{"error":"invalid_credentials"}', 401),
    );

    await tester.ensureVisible(find.byKey(const ValueKey('demo-passenger')));
    await tester.tap(find.byKey(const ValueKey('demo-passenger')));
    await tester.pump();
    await tester.ensureVisible(find.byKey(const ValueKey('loginButton')));
    await tester.tap(find.byKey(const ValueKey('loginButton')));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('رقم الهاتف أو كلمة المرور غير صحيحة.'), findsOneWidget);
  });

  testWidgets('passenger reaches passenger home', (tester) async {
    await _pumpApp(
      tester,
      secureValues: {TokenStorage.tokenKey: 'token'},
      handler: _passengerHandler,
    );

    expect(find.text('لوحة المسافر'), findsOneWidget);
    expect(find.textContaining('Demo Passenger'), findsOneWidget);
  });

  testWidgets(
    'driver reaches driver home and cannot navigate to passenger home',
    (tester) async {
      await _pumpApp(
        tester,
        secureValues: {TokenStorage.tokenKey: 'token'},
        handler: _meHandler('driver'),
      );

      expect(find.text('سائق'), findsWidgets);
      expect(find.textContaining('Demo Driver'), findsOneWidget);

      GoRouter.of(
        tester.element(find.textContaining('Demo Driver')),
      ).go('/passenger');
      await tester.pumpAndSettle();

      expect(find.textContaining('Demo Driver'), findsOneWidget);
      expect(find.text('مسافر'), findsNothing);
    },
  );

  testWidgets('merchant reaches merchant home', (tester) async {
    await _pumpApp(
      tester,
      secureValues: {TokenStorage.tokenKey: 'token'},
      handler: _meHandler('merchant'),
    );

    expect(find.text('تاجر'), findsWidgets);
    expect(find.textContaining('Demo Merchant'), findsOneWidget);
  });

  testWidgets('admin reaches unsupported-role screen', (tester) async {
    await _pumpApp(
      tester,
      secureValues: {TokenStorage.tokenKey: 'token'},
      handler: _meHandler('admin'),
    );

    expect(
      find.text('لوحة تحكم المسؤول متاحة عبر تطبيق الويب.'),
      findsOneWidget,
    );
  });

  testWidgets('logout returns to login and preserves selected locale', (
    tester,
  ) async {
    await _pumpApp(
      tester,
      localeValues: {DomainLabels.localeStorageKey: 'en'},
      secureValues: {TokenStorage.tokenKey: 'token'},
      handler: _passengerHandler,
    );

    expect(find.textContaining('Demo Passenger'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('logoutButton')));
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Arabic'), findsOneWidget);
  });
}

Future<void> _pumpApp(
  WidgetTester tester, {
  Map<String, Object> localeValues = const {},
  Map<String, String> secureValues = const {},
  Future<http.Response> Function(http.Request request)? handler,
}) async {
  tester.view.physicalSize = const Size(900, 2000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  SharedPreferences.setMockInitialValues(localeValues);
  FlutterSecureStorage.setMockInitialValues(
    Map<String, String>.of(secureValues),
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        httpClientProvider.overrideWithValue(
          MockClient(
            handler ??
                (request) async => http.Response('{"error":"not_found"}', 404),
          ),
        ),
      ],
      child: const MasariApp(),
    ),
  );
  await tester.pumpAndSettle();
}

Future<http.Response> Function(http.Request request) _meHandler(String role) {
  return (request) async => http.Response(_meBody(role), 200);
}

Future<http.Response> _passengerHandler(http.Request request) async {
  final path = request.url.path;
  if (path.endsWith('/me')) return http.Response(_meBody('passenger'), 200);
  if (path.endsWith('/passenger/requests/active')) {
    return http.Response('{"requests":[${_requestBody()}]}', 200);
  }
  if (path.endsWith('/trips')) return http.Response('{"trips":[]}', 200);
  return http.Response('{"error":"not_found"}', 404);
}

String _loginBody(String role) =>
    '{"token":"jwt-token","user":${_userBody(role)}}';

String _meBody(String role) => '{"user":${_userBody(role)}}';

String _requestBody() =>
    '{"id":"request_1","pickup_label":"PPU Main Gate","pickup_lat":"31.550000","pickup_lng":"35.100000","destination_label":"Bethlehem Center","destination_lat":"31.705400","destination_lng":"35.202400","preferred_time":"2026-07-02T09:00:00.000Z","passenger_count":1,"status":"pending","created_at":"2026-07-01T09:00:00.000Z"}';

String _userBody(String role) {
  final name = switch (role) {
    'driver' => 'Demo Driver',
    'merchant' => 'Demo Merchant',
    'admin' => 'Demo Admin',
    _ => 'Demo Passenger',
  };
  final phone = switch (role) {
    'driver' => '+970590000002',
    'merchant' => '+970590000004',
    'admin' => '+970590000005',
    _ => '+970590000001',
  };
  return '{"id":"user_1","name":"$name","phone":"$phone","role":"$role","demo_account":true}';
}
