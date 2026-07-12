import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:masari_mobile/app.dart';
import 'package:masari_mobile/core/config/app_config.dart';
import 'package:masari_mobile/core/i18n/domain_labels.dart';
import 'package:masari_mobile/features/shell/presentation/welcome_screen.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('AppConfig reads API_BASE_URL default', () {
    const config = AppConfig.fromEnvironment();
    expect(config.apiBaseUrl, 'http://10.0.2.2:3000');
  });

  testWidgets('Arabic is default with RTL direction', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const ProviderScope(child: MasariApp()));
    await tester.pumpAndSettle();

    expect(find.text('مصاري'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('مصاري'))),
      TextDirection.rtl,
    );
    expect(find.textContaining('counter', findRichText: true), findsNothing);
  });

  testWidgets('Switching to English changes locale and persists it', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const ProviderScope(child: MasariApp()));
    await tester.pumpAndSettle();

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

  testWidgets('Saved English is restored', (tester) async {
    SharedPreferences.setMockInitialValues({
      DomainLabels.localeStorageKey: 'en',
    });
    await tester.pumpWidget(const ProviderScope(child: MasariApp()));
    await tester.pumpAndSettle();

    expect(find.text('Welcome to Masari'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('Welcome to Masari'))),
      TextDirection.ltr,
    );
  });

  testWidgets('Welcome shell renders configured API URL', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: const Locale('en'),
        home: const ProviderScope(
          child: WelcomeScreen(
            config: AppConfig(apiBaseUrl: 'http://example.test'),
          ),
        ),
      ),
    );

    expect(find.text('http://example.test'), findsOneWidget);
    expect(
      find.text('You have pushed the button this many times:'),
      findsNothing,
    );
  });
}
