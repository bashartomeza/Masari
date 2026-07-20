import 'dart:convert';

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
import 'package:masari_mobile/features/onboarding/data/onboarding_storage.dart';
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

  testWidgets('stale enabled CTA revalidates before route entry', (
    tester,
  ) async {
    await _pumpApp(
      tester,
      onboardingEnabled: true,
      disableAfterFirstConfig: true,
    );

    await tester.tap(find.byKey(const ValueKey('createInvitedAccountButton')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('invitationCodeField')), findsNothing);
    expect(
      find.byKey(const ValueKey('createInvitedAccountButton')),
      findsNothing,
    );
    expect(find.byKey(const ValueKey('loginButton')), findsOneWidget);
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

  testWidgets('registration entry preserves normal back navigation', (
    tester,
  ) async {
    await _pumpApp(tester, onboardingEnabled: true);

    await tester.tap(find.byKey(const ValueKey('createInvitedAccountButton')));
    await tester.pumpAndSettle();

    expect(find.byTooltip('رجوع'), findsOneWidget);
    await tester.tap(find.byTooltip('رجوع'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('loginButton')), findsOneWidget);
  });

  testWidgets('status recovery entry preserves normal back navigation', (
    tester,
  ) async {
    await _pumpApp(tester, onboardingEnabled: true);

    await tester.tap(
      find.byKey(const ValueKey('checkApplicationStatusButton')),
    );
    await tester.pumpAndSettle();

    expect(find.byTooltip('رجوع'), findsOneWidget);
    await tester.tap(find.byTooltip('رجوع'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('loginButton')), findsOneWidget);
  });

  testWidgets('consent version change clears all prior acceptance', (
    tester,
  ) async {
    var consentVersion = 0;
    final future = DateTime.now().toUtc().add(const Duration(hours: 1));
    final bundle = {
      'version': 1,
      'type': 'continuation',
      'safe_stage': 'enteringAccountDetails',
      'locale': 'ar',
      'selected_role': 'passenger',
      'attempt_id': 'attempt_1',
      'continuation_token': 'continuation-token',
      'continuation_expires_at': future.toIso8601String(),
      'registration_grant': 'registration-grant',
      'registration_grant_expires_at': future.toIso8601String(),
    };
    await _pumpApp(
      tester,
      onboardingEnabled: true,
      secureInitialValues: {OnboardingStorage.bundleKey: jsonEncode(bundle)},
      handler: (request) async {
        if (request.url.path.endsWith('/onboarding/config')) {
          return http.Response(_enabledConfigBody, 200);
        }
        if (request.url.path.endsWith('/onboarding/status')) {
          return http.Response(
            '{"role":"passenger","onboarding_status":"phone_verified","next_action":"complete_registration","request_id":"req"}',
            200,
          );
        }
        if (request.url.path.endsWith('/onboarding/consents')) {
          consentVersion += 1;
          return http.Response(_consentBody('v$consentVersion'), 200);
        }
        if (request.url.path.endsWith('/complete')) {
          return http.Response('{"error":"consent_version_changed"}', 409);
        }
        return http.Response('{"error":"not_found"}', 404);
      },
    );

    expect(
      find.byKey(const ValueKey('createInvitedAccountButton')),
      findsNothing,
    );
    await tester.tap(find.text('متابعة التسجيل'));
    await tester.pumpAndSettle();

    expect(find.byTooltip('رجوع'), findsOneWidget);
    await tester.tap(find.byTooltip('رجوع'));
    await tester.pumpAndSettle();
    expect(find.text('مغادرة التسجيل'), findsWidgets);
    await tester.tap(find.text('إلغاء'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('displayNameField')), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('displayNameField')),
      'Secure User',
    );
    await tester.enterText(
      find.byKey(const ValueKey('onboardingPasswordField')),
      'first secure password',
    );
    await tester.enterText(
      find.byKey(const ValueKey('confirmPasswordField')),
      'first secure password',
    );
    for (var index = 0; index < 3; index += 1) {
      await tester.tap(find.byType(CheckboxListTile).at(index));
    }
    await tester.tap(find.byKey(const ValueKey('createAccountButton')));
    await tester.pumpAndSettle();

    final checkboxes = tester
        .widgetList<CheckboxListTile>(find.byType(CheckboxListTile))
        .toList();
    expect(checkboxes.map((checkbox) => checkbox.value), everyElement(isFalse));
    expect(find.textContaining('v2'), findsWidgets);
  });

  testWidgets('server-valid pending bundle restores to the pending screen', (
    tester,
  ) async {
    final future = DateTime.now().toUtc().add(const Duration(hours: 1));
    final bundle = {
      'version': 1,
      'type': 'pendingStatus',
      'safe_stage': 'pendingReview',
      'locale': 'ar',
      'selected_role': 'driver',
      'pending_status_token': 'pending-token',
      'pending_status_expires_at': future.toIso8601String(),
    };
    await _pumpApp(
      tester,
      onboardingEnabled: true,
      secureInitialValues: {OnboardingStorage.bundleKey: jsonEncode(bundle)},
      handler: (request) async {
        if (request.url.path.endsWith('/onboarding/config')) {
          return http.Response(_enabledConfigBody, 200);
        }
        if (request.url.path.endsWith('/onboarding/status')) {
          return http.Response(
            '{"role":"driver","onboarding_status":"pending_review","next_action":"await_approval","request_id":"req"}',
            200,
          );
        }
        return http.Response('{"error":"not_found"}', 404);
      },
    );

    expect(find.text('الطلب قيد المراجعة'), findsOneWidget);
    expect(find.text('سائق'), findsOneWidget);
    expect(find.byKey(const ValueKey('loginButton')), findsNothing);
  });
}

Future<void> _pumpApp(
  WidgetTester tester, {
  bool onboardingEnabled = false,
  bool failConfig = false,
  bool disableAfterFirstConfig = false,
  AppConfig config = demoTestAppConfig,
  Map<String, String> secureInitialValues = const {},
  Future<http.Response> Function(http.Request request)? handler,
}) async {
  var configRequests = 0;
  tester.view.physicalSize = const Size(900, 2000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  SharedPreferences.setMockInitialValues({});
  FlutterSecureStorage.setMockInitialValues(Map.of(secureInitialValues));
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
        httpClientProvider.overrideWithValue(
          MockClient(
            handler ??
                (request) async {
                  if (request.url.path.endsWith('/onboarding/config')) {
                    configRequests += 1;
                    if (failConfig) throw http.ClientException('offline');
                    if (!onboardingEnabled ||
                        (disableAfterFirstConfig && configRequests > 1)) {
                      return http.Response(
                        '{"enabled":false,"registration_roles":[],"request_id":"req"}',
                        200,
                      );
                    }
                    return http.Response(_enabledConfigBody, 200);
                  }
                  return http.Response('{"error":"not_found"}', 404);
                },
          ),
        ),
      ],
      child: const MasariApp(),
    ),
  );
  await tester.pumpAndSettle();
}

const _enabledConfigBody =
    '{"enabled":true,"registration_roles":["passenger","driver","merchant"],"supported_region":"PS","supported_locales":["ar","en"],"password_policy":{"minimum_characters":15,"maximum_characters":64,"maximum_utf8_bytes":72},"otp_digits":6,"resend_cooldown_seconds":60,"request_id":"req"}';

String _consentBody(String version) => jsonEncode({
  'documents': [
    for (final type in ['terms', 'privacy', 'adult_self_attestation'])
      {
        'id': '${type}_$version',
        'type': type,
        'version': version,
        'locale': 'ar',
        'content': '$type content',
        'content_hash': 'a' * 64,
        'effective_at': '2026-07-20T00:00:00.000Z',
      },
  ],
  'request_id': 'req',
});
