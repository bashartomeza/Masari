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
import 'package:shared_preferences/shared_preferences.dart';

import 'test_app_config.dart';

void main() {
  testWidgets('enabled config shows invited account CTA', (tester) async {
    await _pumpApp(tester, onboardingEnabled: true);

    expect(
      find.byKey(const ValueKey('createInvitedAccountButton')),
      findsOneWidget,
    );
    expect(find.text('إنشاء حساب بدعوة'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('مساري'))),
      TextDirection.rtl,
    );
  });

  testWidgets('disabled config hides registration CTA', (tester) async {
    await _pumpApp(tester);

    expect(
      find.byKey(const ValueKey('createInvitedAccountButton')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('checkApplicationStatusButton')),
      findsNothing,
    );
  });

  testWidgets('config failure does not enable registration', (tester) async {
    await _pumpApp(tester, failConfig: true);

    expect(
      find.byKey(const ValueKey('createInvitedAccountButton')),
      findsNothing,
    );
  });

  testWidgets('direct onboarding route while disabled returns safely', (
    tester,
  ) async {
    await _pumpApp(tester);

    GoRouter.of(tester.element(find.text('مساري'))).go('/onboarding');
    await tester.pumpAndSettle();

    expect(find.text('التسجيل غير متاح مؤقتاً.'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsWidgets);
  });

  testWidgets('rapid role taps publish one selected role state', (
    tester,
  ) async {
    await _pumpApp(tester, onboardingEnabled: true);

    await tester.tap(find.byKey(const ValueKey('createInvitedAccountButton')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('onboarding-role-passenger')));
    await tester.tap(find.byKey(const ValueKey('onboarding-role-passenger')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('invitationCodeField')), findsOneWidget);
    expect(find.byKey(const ValueKey('onboardingPhoneField')), findsOneWidget);
  });
}

Future<void> _pumpApp(
  WidgetTester tester, {
  bool onboardingEnabled = false,
  bool failConfig = false,
  AppConfig config = demoTestAppConfig,
}) async {
  tester.view.physicalSize = const Size(900, 2000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  SharedPreferences.setMockInitialValues({});
  FlutterSecureStorage.setMockInitialValues({});
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
        httpClientProvider.overrideWithValue(
          MockClient((request) async {
            if (request.url.path.endsWith('/onboarding/config')) {
              if (failConfig) throw http.ClientException('offline');
              if (!onboardingEnabled) {
                return http.Response(
                  '{"enabled":false,"registration_roles":[],"request_id":"req"}',
                  200,
                );
              }
              return http.Response(
                '{"enabled":true,"registration_roles":["passenger","driver","merchant"],"supported_region":"PS","supported_locales":["ar","en"],"password_policy":{"minimum_characters":15,"maximum_characters":64,"maximum_utf8_bytes":72},"otp_digits":6,"resend_cooldown_seconds":60,"request_id":"req"}',
                200,
              );
            }
            return http.Response('{"error":"not_found"}', 404);
          }),
        ),
      ],
      child: const MasariApp(),
    ),
  );
  await tester.pumpAndSettle();
}
