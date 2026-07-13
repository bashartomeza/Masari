import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:masari_mobile/core/api/api_client.dart';
import 'package:masari_mobile/core/api/api_error.dart';
import 'package:masari_mobile/features/auth/data/token_storage.dart';
import 'package:masari_mobile/features/driver/application/driver_controller.dart';
import 'package:masari_mobile/features/driver/data/driver_models.dart';
import 'package:masari_mobile/features/driver/data/driver_repository.dart';
import 'package:masari_mobile/features/matching/data/matching_models.dart';
import 'package:masari_mobile/features/trips/data/trip_models.dart';

void main() {
  test(
    'dashboard loads success, empty, and error states without fake data',
    () async {
      final fake = _FakeDriverRepository();
      final container = _container(fake);
      addTearDown(container.dispose);

      expect(container.read(driverDashboardProvider).isLoading, isTrue);
      final empty = await container.read(driverDashboardProvider.future);
      expect(empty.currentRoute, isNull);
      expect(empty.proposedMatchCount, 0);
      expect(empty.activeTrip, isNull);

      fake.failLists = true;
      await expectLater(
        container.read(driverDashboardProvider.notifier).refresh(),
        throwsStateError,
      );
      expect(container.read(driverDashboardProvider).hasError, isTrue);
    },
  );

  test('dashboard exposes route, proposed count, and active trip', () async {
    final fake = _FakeDriverRepository(
      routes: [_route()],
      matches: [
        _match('proposed', DateTime(2026, 7, 13, 10)),
        _match('rejected', DateTime(2026, 7, 13, 9)),
      ],
      trips: [_trip()],
    );
    final container = _container(fake);
    addTearDown(container.dispose);

    final state = await container.read(driverDashboardProvider.future);
    expect(state.currentRoute?.id, 'route_1');
    expect(state.proposedMatchCount, 1);
    expect(state.activeTrip?.id, 'trip_1');
  });

  test('route controller creates only without an operational route', () async {
    final fake = _FakeDriverRepository();
    final container = _container(fake);
    addTearDown(container.dispose);
    await container.read(driverRouteControllerProvider.future);

    await container
        .read(driverRouteControllerProvider.notifier)
        .create(seatsAvailable: 3, parcelCapacityAvailable: 7);
    expect(fake.createCalls, 1);
    expect(fake.lastSeats, 3);
    expect(fake.lastParcels, 7);

    await expectLater(
      container
          .read(driverRouteControllerProvider.notifier)
          .create(seatsAvailable: 4, parcelCapacityAvailable: 8),
      throwsA(isA<ApiException>()),
    );
    expect(fake.createCalls, 1);
  });

  test('route deactivation refreshes success and surfaces failure', () async {
    final fake = _FakeDriverRepository(routes: [_route()]);
    final container = _container(fake);
    addTearDown(container.dispose);
    await container.read(driverRouteControllerProvider.future);

    await container
        .read(driverRouteControllerProvider.notifier)
        .deactivate('route_1');
    expect(
      container.read(driverRouteControllerProvider).value?.currentRoute,
      isNull,
    );

    fake.routes = [_route()];
    fake.failDeactivate = true;
    await expectLater(
      container
          .read(driverRouteControllerProvider.notifier)
          .deactivate('route_1'),
      throwsStateError,
    );
  });

  test('match inbox handles empty, ordering, filter, and error', () async {
    final fake = _FakeDriverRepository();
    final container = _container(fake);
    addTearDown(container.dispose);
    expect(await container.read(driverMatchInboxProvider.future), isEmpty);

    fake.matches = [
      _match('accepted', DateTime(2026, 7, 13, 12)),
      _match('proposed', DateTime(2026, 7, 13, 10)),
      _match('sent_to_driver', DateTime(2026, 7, 13, 11)),
    ];
    final ordered = await container
        .read(driverMatchInboxProvider.notifier)
        .refresh(status: 'proposed');
    expect(fake.lastMatchStatus, 'proposed');
    expect(ordered.map((match) => match.status), [
      'sent_to_driver',
      'proposed',
      'accepted',
    ]);

    fake.failLists = true;
    await expectLater(
      container.read(driverMatchInboxProvider.notifier).refresh(),
      throwsStateError,
    );
  });

  test('accept returns trip and reject refreshes match state', () async {
    final fake = _FakeDriverRepository(
      matches: [_match('proposed', DateTime(2026, 7, 13, 10))],
    );
    final container = _container(fake);
    addTearDown(container.dispose);
    const matchId = 'match_proposed';
    await container.read(driverMatchDetailProvider(matchId).future);

    final trip = await container
        .read(driverMatchDetailProvider(matchId).notifier)
        .accept();
    expect(trip.id, 'trip_1');
    expect(fake.acceptCalls, 1);

    await container.read(driverMatchDetailProvider(matchId).notifier).reject();
    expect(fake.rejectCalls, 1);
    expect(
      container.read(driverMatchDetailProvider(matchId)).value?.status,
      'rejected',
    );
  });

  test('trip exposes only the valid next status', () {
    expect(_trip(status: 'accepted').nextStatus, 'pickup_started');
    expect(_trip(status: 'pickup_started').nextStatus, 'picked_up');
    expect(_trip(status: 'picked_up').nextStatus, 'in_transit');
    expect(_trip(status: 'in_transit').nextStatus, 'delivered');
    expect(_trip(status: 'delivered').nextStatus, 'completed');
    expect(_trip(status: 'completed').nextStatus, isNull);
    expect(_trip(status: 'cancelled').nextStatus, isNull);
  });

  test(
    'trip polling starts, avoids duplicate timers, pauses, and resumes',
    () async {
      final fake = _FakeDriverRepository(trips: [_trip()]);
      final container = _container(fake);
      addTearDown(container.dispose);
      await container.read(driverTripControllerProvider('trip_1').future);
      final notifier = container.read(
        driverTripControllerProvider('trip_1').notifier,
      );

      expect(notifier.activeTimerCount, 2);
      notifier.resumePolling();
      expect(notifier.activeTimerCount, 2);
      notifier.pausePolling();
      expect(notifier.isPolling, isFalse);
      notifier.resumePolling();
      expect(notifier.activeTimerCount, 2);
    },
  );
}

ProviderContainer _container(_FakeDriverRepository fake) {
  return ProviderContainer(
    overrides: [driverRepositoryProvider.overrideWithValue(fake)],
  );
}

class _FakeDriverRepository extends DriverRepository {
  _FakeDriverRepository({
    List<DriverRoute>? routes,
    List<DriverMatch>? matches,
    List<DriverTrip>? trips,
  }) : routes = routes ?? [],
       matches = matches ?? [],
       trips = trips ?? [],
       super(
         apiClient: ApiClient(
           baseUrl: 'http://fake',
           client: MockClient(
             (_) async => http.Response('{"error":"unused"}', 500),
           ),
         ),
         tokenStorage: _TokenStorage(),
       );

  List<DriverRoute> routes;
  List<DriverMatch> matches;
  List<DriverTrip> trips;
  bool failLists = false;
  bool failDeactivate = false;
  int createCalls = 0;
  int acceptCalls = 0;
  int rejectCalls = 0;
  int? lastSeats;
  int? lastParcels;
  String? lastMatchStatus;

  @override
  Future<List<DriverRoute>> listRoutes() async {
    if (failLists) throw StateError('route failure');
    return routes;
  }

  @override
  Future<List<DriverRoute>> activeRoutes() async {
    if (failLists) throw StateError('active route failure');
    return routes.where((route) => route.status == 'active').toList();
  }

  @override
  Future<List<DriverMatch>> listMatches({String? status}) async {
    if (failLists) throw StateError('match failure');
    lastMatchStatus = status;
    return matches;
  }

  @override
  Future<List<DriverTrip>> listTrips() async {
    if (failLists) throw StateError('trip failure');
    return trips;
  }

  @override
  Future<DriverRoute> createRoute({
    required int seatsAvailable,
    required int parcelCapacityAvailable,
  }) async {
    createCalls += 1;
    lastSeats = seatsAvailable;
    lastParcels = parcelCapacityAvailable;
    final route = _route(
      seats: seatsAvailable,
      parcels: parcelCapacityAvailable,
    );
    routes = [route, ...routes];
    return route;
  }

  @override
  Future<DriverRoute> deactivateRoute(String id) async {
    if (failDeactivate) throw StateError('deactivate failure');
    routes = routes
        .map(
          (route) => route.id == id
              ? _route(status: 'inactive', seats: route.seatsAvailable)
              : route,
        )
        .toList();
    return routes.first;
  }

  @override
  Future<DriverMatch> matchDetail(String id) async => matches.first;

  @override
  Future<DriverTripReference> acceptMatch(String id) async {
    acceptCalls += 1;
    return const DriverTripReference(id: 'trip_1', status: 'accepted');
  }

  @override
  Future<void> rejectMatch(String id) async {
    rejectCalls += 1;
    matches = [_match('rejected', matches.first.createdAt)];
  }

  @override
  Future<DriverTrip> tripDetail(String id) async => trips.first;

  @override
  Future<TripLocation?> latestLocation(String id) async => TripLocation(
    lat: 31.5326,
    lng: 35.0998,
    source: 'simulated',
    sequence: 0,
    recordedAt: _fixedTime,
  );
}

class _TokenStorage implements TokenStorage {
  @override
  Future<void> clearToken() async {}
  @override
  Future<String?> readToken() async => 'token';
  @override
  Future<void> saveToken(String token) async {}
}

final _fixedTime = DateTime.utc(2026, 7, 13, 8);

DriverRoute _route({
  String status = 'active',
  int seats = 2,
  int parcels = 5,
}) => DriverRoute(
  id: 'route_1',
  originLabel: lockedDriverOriginLabel,
  originLat: lockedDriverOriginLat,
  originLng: lockedDriverOriginLng,
  destinationLabel: lockedDriverDestinationLabel,
  destinationLat: lockedDriverDestinationLat,
  destinationLng: lockedDriverDestinationLng,
  corridorKey: lockedDriverCorridorKey,
  seatsAvailable: seats,
  parcelCapacityAvailable: parcels,
  status: status,
  activatedAt: _fixedTime,
  completedAt: null,
);

DriverMatch _match(String status, DateTime createdAt) => DriverMatch(
  id: 'match_$status',
  status: status,
  score: 0.9317,
  method: 'masari_route_score',
  explanation: 'Safe explanation',
  breakdown: const ScoringBreakdown(
    corridorOverlap: 0.95,
    pickupDistanceScore: 0.82,
    timingFit: 0.9,
    trustScore: 0.86,
    capacityFit: 1,
    finalScore: 0.9317,
  ),
  createdAt: createdAt,
  route: const DriverRouteSummary(
    id: 'route_1',
    originLabel: lockedDriverOriginLabel,
    destinationLabel: lockedDriverDestinationLabel,
    corridorKey: lockedDriverCorridorKey,
    seatsAvailable: 2,
    parcelCapacityAvailable: 5,
    status: 'active',
  ),
  passengerRequest: const DriverPassengerSummary(
    id: 'request_1',
    pickupLabel: 'PPU Main Gate',
    destinationLabel: 'Bethlehem Center',
    passengerCount: 1,
    status: 'pending',
  ),
  merchantOrder: null,
  parcelBatch: null,
);

DriverTrip _trip({String status = 'accepted'}) => DriverTrip(
  id: 'trip_1',
  status: status,
  createdAt: _fixedTime,
  startedAt: _fixedTime,
  completedAt: null,
  route: _route(status: 'assigned'),
  passengerRequest: const DriverPassengerSummary(
    id: 'request_1',
    pickupLabel: 'PPU Main Gate',
    destinationLabel: 'Bethlehem Center',
    passengerCount: 1,
    status: 'accepted',
  ),
  merchantOrder: null,
  parcelBatch: null,
);
