import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:masari_mobile/features/auth/data/authenticated_api_client.dart';
import 'package:masari_mobile/features/canonical_routes/domain/canonical_route_models.dart';
import 'package:masari_mobile/features/passenger/presentation/create_request_screen.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import 'support/auth_test_support.dart';

void main() {
  testWidgets('review is editable and confirm alone calls the search API', (
    tester,
  ) async {
    var searchCalls = 0;
    Uri? searchUri;
    PassengerRouteRequestDraft? selectedDraft;
    final client = TestAuthenticatedClient(
      handler: (request) async {
        if (request.url.path.endsWith('/passenger/available-departures')) {
          searchCalls += 1;
          searchUri = request.url;
          return _response({
            'departures': [_departure],
            'server_now': '2026-08-27T10:00:00.000Z',
          });
        }
        return http.Response('{"error":"not_found"}', 404);
      },
    ).client;

    await tester.pumpWidget(_testApp(client, (draft) => selectedDraft = draft));

    await tester.enterText(
      find.byKey(const ValueKey('smartRequestField')),
      'From: Bab Al-Zawiya To: Bethlehem Time: 3:00 PM Passengers: 2',
    );
    await tester.tap(find.byKey(const ValueKey('extractRequestButton')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('extractedReview')), findsOneWidget);
    expect(searchCalls, 0);
    expect(
      tester
          .widget<TextField>(
            find.byKey(const ValueKey('reviewDestinationField')),
          )
          .enabled,
      isTrue,
    );

    await tester.enterText(
      find.byKey(const ValueKey('reviewDestinationField')),
      'Bethlehem',
    );
    await tester.ensureVisible(
      find.byKey(const ValueKey('confirmSearchButton')),
    );
    await tester.tap(find.byKey(const ValueKey('confirmSearchButton')));
    await tester.pumpAndSettle();

    expect(searchCalls, 1);
    expect(searchUri?.queryParameters['seats'], '2');
    expect(searchUri?.queryParameters['departure_from'], isNotNull);
    expect(searchUri?.queryParameters['departure_until'], isNotNull);
    expect(find.byKey(const ValueKey('searchResults')), findsOneWidget);
    expect(find.text('Demo Driver'), findsOneWidget);

    await tester.ensureVisible(
      find.byKey(const ValueKey('bookOffer-availability_1')),
    );
    await tester.tap(find.byKey(const ValueKey('bookOffer-availability_1')));
    await tester.pumpAndSettle();

    expect(find.text('normal booking flow'), findsOneWidget);
    expect(selectedDraft?.routeVersionId, 'version_1');
    expect(selectedDraft?.pickupStopId, 'stop_bab');
    expect(selectedDraft?.dropoffStopId, 'stop_bethlehem');
    expect(selectedDraft?.passengerCount, 2);
    expect(
      selectedDraft!.departureUntil.isAfter(selectedDraft!.departureFrom),
      isTrue,
    );
  });
}

Widget _testApp(
  AuthenticatedApiClient client,
  ValueChanged<PassengerRouteRequestDraft> onDraft,
) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const CreateRequestScreen(),
      ),
      GoRoute(
        path: '/passenger',
        builder: (context, state) => const SizedBox.shrink(),
      ),
      GoRoute(
        path: '/passenger/routes/request/new',
        builder: (context, state) {
          final draft = state.extra! as PassengerRouteRequestDraft;
          onDraft(draft);
          return const Scaffold(body: Text('normal booking flow'));
        },
      ),
    ],
  );
  return ProviderScope(
    overrides: [authenticatedApiClientProvider.overrideWithValue(client)],
    child: MaterialApp.router(
      routerConfig: router,
      locale: const Locale('en'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    ),
  );
}

http.Response _response(Map<String, dynamic> value) => http.Response.bytes(
  utf8.encode(jsonEncode(value)),
  200,
  headers: const {'content-type': 'application/json; charset=utf-8'},
);

const _departure = {
  'id': 'availability_1',
  'route_version_id': 'version_1',
  'origin_label': 'Bab Al-Zawiya',
  'destination_label': 'Bethlehem Center',
  'departure_at': '2026-08-27T12:00:00.000Z',
  'availability_window_end': '2026-08-27T12:30:00.000Z',
  'remaining_seats': 3,
  'driver': {'name': 'Demo Driver', 'vehicle_type': 'sedan', 'trust_score': 86},
  'route': {
    'id': 'version_1',
    'name_ar': 'الخليل إلى بيت لحم',
    'name_en': 'Hebron to Bethlehem',
    'direction': 'outbound',
    'stops': [
      {
        'id': 'stop_bab',
        'name_ar': 'باب الزاوية',
        'name_en': 'Bab Al-Zawiya',
        'sequence': 1,
        'passenger_pickup': true,
        'passenger_dropoff': false,
      },
      {
        'id': 'stop_bethlehem',
        'name_ar': 'بيت لحم',
        'name_en': 'Bethlehem Center',
        'sequence': 2,
        'passenger_pickup': false,
        'passenger_dropoff': true,
      },
    ],
  },
};
