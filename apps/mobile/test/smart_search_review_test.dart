import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:masari_mobile/features/auth/data/authenticated_api_client.dart';
import 'package:masari_mobile/features/passenger/presentation/create_request_screen.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import 'support/auth_test_support.dart';

void main() {
  testWidgets('review is editable and confirm alone calls the search API', (
    tester,
  ) async {
    var searchCalls = 0;
    Uri? searchUri;
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

    await tester.pumpWidget(_testApp(client));

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
  });
}

Widget _testApp(AuthenticatedApiClient client) {
  return ProviderScope(
    overrides: [authenticatedApiClientProvider.overrideWithValue(client)],
    child: MaterialApp(
      locale: const Locale('en'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const CreateRequestScreen(),
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
  'remaining_seats': 3,
  'driver': {'name': 'Demo Driver', 'vehicle_type': 'sedan', 'trust_score': 86},
};
