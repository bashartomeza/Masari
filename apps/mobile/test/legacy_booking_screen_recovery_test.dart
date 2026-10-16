import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:masari_mobile/core/widgets/masari_map.dart';
import 'package:masari_mobile/features/auth/application/auth_actor_binding.dart';
import 'package:masari_mobile/features/matching/data/matching_repository.dart';
import 'package:masari_mobile/features/passenger/data/passenger_repository.dart';
import 'package:masari_mobile/features/passenger/presentation/create_request_screen.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/auth_test_support.dart';

void main() {
  testWidgets(
    'lost create response recovers after reopening using the same durable identity',
    (tester) async {
      final saved = <String, Map<String, dynamic>>{};
      final keys = <String>[];
      var loseResponse = true;
      Future<http.Response> handler(http.Request request) async {
        if (!request.url.path.endsWith('/passenger/requests')) {
          return http.Response('{"error":"no_compatible_driver"}', 409);
        }
        final key = request.headers['idempotency-key'] ?? '';
        keys.add(key);
        final result = saved.putIfAbsent(
          key,
          () => {
            ...jsonDecode(request.body) as Map<String, dynamic>,
            'id': 'durable-request',
            'status': 'pending',
            'created_at': DateTime.now().toUtc().toIso8601String(),
          },
        );
        if (loseResponse) {
          loseResponse = false;
          throw http.ClientException('response lost after commit');
        }
        return http.Response(jsonEncode({'request': result}), 201);
      }

      await _pump(tester, handler);
      await _select(
        tester,
        'اختاري موقع الانطلاق',
        'Saved origin',
        const LatLng(31.72, 35.21),
      );
      await _select(
        tester,
        'اختاري الوجهة',
        'Saved destination',
        const LatLng(32.21, 35.29),
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Submit request'));
      await tester.pumpAndSettle();
      expect(find.text('Verify booking'), findsOneWidget);
      expect(keys.single, isNotEmpty);
      expect(
        tester
            .widget<DropdownButtonFormField<int>>(
              find.byType(DropdownButtonFormField<int>),
            )
            .onChanged,
        isNull,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await _pump(tester, handler, preserveStorage: true);
      await tester.pumpAndSettle();
      expect(find.text('Saved durable-request'), findsOneWidget);
      expect(saved.length, 1);
      expect(keys, [keys.first, keys.first]);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets('a time earlier today is rejected before a request is sent', (
    tester,
  ) async {
    var calls = 0;
    await _pump(tester, (request) async {
      if (request.url.path.endsWith('/passenger/requests')) {
        calls++;
        return http.Response(
          jsonEncode({
            'request': {
              ...jsonDecode(request.body) as Map<String, dynamic>,
              'id': 'past-request',
              'status': 'pending',
              'created_at': DateTime.now().toUtc().toIso8601String(),
            },
          }),
          201,
        );
      }
      return http.Response('{"error":"no_compatible_driver"}', 409);
    });
    await _select(
      tester,
      'اختاري موقع الانطلاق',
      'Origin square',
      const LatLng(31.72, 35.21),
    );
    await _select(
      tester,
      'اختاري الوجهة',
      'Destination station',
      const LatLng(32.21, 35.29),
    );
    await tester.tap(find.byIcon(Icons.schedule_rounded));
    await tester.pumpAndSettle();
    await tester.tap(find.text('OK').last);
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.keyboard_outlined));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, '00');
    await tester.enterText(find.byType(TextField).last, '00');
    await tester.tap(find.text('OK').last);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Submit request'));
    await tester.pumpAndSettle();
    expect(calls, 0);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'foreground resume verifies an uncertain saved booking with its original key',
    (tester) async {
      final keys = <String>[];
      Map<String, dynamic>? saved;
      await _pump(tester, (request) async {
        if (!request.url.path.endsWith('/passenger/requests')) {
          return http.Response('{"error":"no_compatible_driver"}', 409);
        }
        keys.add(request.headers['idempotency-key']!);
        saved ??= {
          ...jsonDecode(request.body) as Map<String, dynamic>,
          'id': 'resume-request',
          'status': 'pending',
          'created_at': DateTime.now().toUtc().toIso8601String(),
        };
        if (keys.length == 1) throw http.ClientException('response lost');
        return http.Response(jsonEncode({'request': saved}), 200);
      });
      await _select(
        tester,
        'اختاري موقع الانطلاق',
        'Origin',
        const LatLng(31.72, 35.21),
      );
      await _select(
        tester,
        'اختاري الوجهة',
        'Destination',
        const LatLng(32.21, 35.29),
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Submit request'));
      await tester.pumpAndSettle();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(find.text('Saved resume-request'), findsOneWidget);
      expect(keys, [keys.first, keys.first]);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets('two rapid submit events persist only one named request', (
    tester,
  ) async {
    final response = Completer<http.Response>();
    var calls = 0;
    Map<String, dynamic>? body;
    await _pump(tester, (request) async {
      if (request.url.path.endsWith('/passenger/requests')) {
        calls++;
        body = jsonDecode(request.body) as Map<String, dynamic>;
        return response.future;
      }
      return http.Response('{"error":"no_compatible_driver"}', 409);
    });
    await _select(
      tester,
      'اختاري موقع الانطلاق',
      'Origin square',
      const LatLng(31.72, 35.21),
    );
    await _select(
      tester,
      'اختاري الوجهة',
      'Destination station',
      const LatLng(32.21, 35.29),
    );
    final submit = tester
        .widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Submit request'),
        )
        .onPressed!;
    submit();
    submit();
    await tester.pump();
    try {
      expect(calls, 1);
    } finally {
      response.complete(
        http.Response(
          jsonEncode({
            'request': {
              ...body!,
              'id': 'saved-request',
              'status': 'pending',
              'created_at': DateTime.now().toUtc().toIso8601String(),
            },
          }),
          201,
        ),
      );
      await tester.pumpAndSettle();
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });
}

Future<void> _pump(
  WidgetTester tester,
  Future<http.Response> Function(http.Request) handler, {
  bool preserveStorage = false,
}) async {
  tester.view.physicalSize = const Size(1000, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  SharedPreferences.setMockInitialValues({});
  if (!preserveStorage) FlutterSecureStorage.setMockInitialValues({});
  final client = TestAuthenticatedClient(handler: handler);
  final actor = AuthenticatedActorBinding()..bind('passenger-fixture');
  final router = GoRouter(
    initialLocation: '/create',
    routes: [
      GoRoute(path: '/create', builder: (_, _) => const CreateRequestScreen()),
      GoRoute(
        path: '/passenger/request/:id',
        builder: (_, state) =>
            Scaffold(body: Text('Saved ${state.pathParameters['id']}')),
      ),
      GoRoute(
        path: '/passenger/match/:id',
        builder: (_, _) => const Scaffold(body: Text('Matched')),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authenticatedActorBindingProvider.overrideWithValue(actor),
        passengerRepositoryProvider.overrideWithValue(
          PassengerRepository(apiClient: client.client),
        ),
        matchingRepositoryProvider.overrideWithValue(
          MatchingRepository(apiClient: client.client),
        ),
      ],
      child: MaterialApp.router(
        routerConfig: router,
        locale: const Locale('en'),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child!,
        ),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _select(
  WidgetTester tester,
  String prompt,
  String name,
  LatLng point,
) async {
  await tester.tap(find.text(prompt));
  await tester.pumpAndSettle();
  tester.widget<MasariMap>(find.byType(MasariMap).last).onTap!(point);
  await tester.pump();
  await tester.enterText(find.byType(TextField), name);
  await tester.tap(find.text('تأكيد الموقع'));
  await tester.pumpAndSettle();
}
