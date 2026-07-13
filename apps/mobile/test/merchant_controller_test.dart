import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:masari_mobile/core/api/api_client.dart';
import 'package:masari_mobile/features/auth/data/token_storage.dart';
import 'package:masari_mobile/features/matching/data/matching_models.dart';
import 'package:masari_mobile/features/merchant/application/merchant_controller.dart';
import 'package:masari_mobile/features/merchant/data/merchant_models.dart';
import 'package:masari_mobile/features/merchant/data/merchant_repository.dart';
import 'package:masari_mobile/features/trips/data/trip_models.dart';

void main() {
  test(
    'dashboard exposes latest order, batch, waiting match, and trip',
    () async {
      final fake = _FakeMerchantRepository(
        orders: [_order()],
        matches: [_match()],
        trips: [_trip()],
      );
      final container = _container(fake);
      addTearDown(container.dispose);

      final state = await container.read(merchantDashboardProvider.future);
      expect(state.latestOrder?.id, 'order_1');
      expect(state.latestBatch?.id, 'batch_1');
      expect(state.waitingMatchCount, 1);
      expect(state.activeTrip?.id, 'trip_1');
    },
  );

  test('dashboard supports empty and error states', () async {
    final fake = _FakeMerchantRepository();
    final container = _container(fake);
    addTearDown(container.dispose);

    final state = await container.read(merchantDashboardProvider.future);
    expect(state.latestOrder, isNull);
    expect(state.latestBatch, isNull);
    expect(state.activeTrip, isNull);

    fake.failLists = true;
    await expectLater(
      container.read(merchantDashboardProvider.notifier).refresh(),
      throwsStateError,
    );
    expect(container.read(merchantDashboardProvider).hasError, isTrue);
  });

  test('parcel draft enforces one minimum and ten maximum', () {
    final container = _container(_FakeMerchantRepository());
    addTearDown(container.dispose);
    final controller = container.read(merchantOrderDraftProvider.notifier);

    controller.removeParcel(0);
    expect(container.read(merchantOrderDraftProvider), hasLength(1));
    for (var index = 0; index < 12; index += 1) {
      controller.addParcel();
    }
    expect(container.read(merchantOrderDraftProvider), hasLength(10));
    expect(controller.canAdd, isFalse);
    controller.updateParcel(1, size: 'L', priority: 'high');
    expect(container.read(merchantOrderDraftProvider)[1].size, 'L');
    controller.removeParcel(1);
    expect(container.read(merchantOrderDraftProvider), hasLength(9));
  });

  test(
    'order controller batches, then matches, without driver actions',
    () async {
      final fake = _FakeMerchantRepository(
        orders: [_order(status: 'submitted', batches: const [])],
      );
      final container = _container(fake);
      addTearDown(container.dispose);
      const orderId = 'order_1';

      var state = await container.read(merchantOrderProvider(orderId).future);
      expect(state.order.canBatch, isTrue);
      expect(state.canRunMatch, isFalse);

      await container
          .read(merchantOrderProvider(orderId).notifier)
          .createBatch();
      state = container.read(merchantOrderProvider(orderId)).value!;
      expect(fake.batchCalls, 1);
      expect(state.order.latestBatch?.id, 'batch_1');
      expect(state.canRunMatch, isTrue);

      await container.read(merchantOrderProvider(orderId).notifier).runMatch();
      state = container.read(merchantOrderProvider(orderId)).value!;
      expect(fake.matchCalls, 1);
      expect(state.latestMatch?.status, 'proposed');
      expect(state.canRunMatch, isFalse);
    },
  );

  test('trip polling has one trip, order, and location timer only', () async {
    final fake = _FakeMerchantRepository(
      orders: [_order(status: 'assigned')],
      trips: [_trip()],
    );
    final container = _container(fake);
    addTearDown(container.dispose);

    await container.read(merchantTripProvider('trip_1').future);
    final controller = container.read(merchantTripProvider('trip_1').notifier);
    expect(controller.activeTimerCount, 3);
    controller.resumePolling();
    expect(controller.activeTimerCount, 3);
    controller.pausePolling();
    expect(controller.isPolling, isFalse);
    controller.resumePolling();
    expect(controller.activeTimerCount, 3);
  });
}

ProviderContainer _container(_FakeMerchantRepository fake) => ProviderContainer(
  overrides: [merchantRepositoryProvider.overrideWithValue(fake)],
);

class _FakeMerchantRepository extends MerchantRepository {
  _FakeMerchantRepository({
    List<MerchantOrder>? orders,
    List<MerchantMatch>? matches,
    List<MerchantTrip>? trips,
  }) : orders = orders ?? [],
       matches = matches ?? [],
       trips = trips ?? [],
       super(
         apiClient: ApiClient(
           baseUrl: 'http://fake',
           client: MockClient((_) async => http.Response('{}', 200)),
         ),
         tokenStorage: _TokenStorage(),
       );

  List<MerchantOrder> orders;
  List<MerchantMatch> matches;
  List<MerchantTrip> trips;
  bool failLists = false;
  int batchCalls = 0;
  int matchCalls = 0;

  @override
  Future<List<MerchantOrder>> listOrders() async {
    if (failLists) throw StateError('orders failed');
    return orders;
  }

  @override
  Future<MerchantOrder> orderDetail(String id) async => orders.first;

  @override
  Future<List<MerchantMatch>> listMatches({String? status}) async {
    if (failLists) throw StateError('matches failed');
    return matches;
  }

  @override
  Future<List<MerchantTrip>> listTrips() async {
    if (failLists) throw StateError('trips failed');
    return trips;
  }

  @override
  Future<MerchantBatch> createBatch(String orderId) async {
    batchCalls += 1;
    final batch = _batch();
    orders = [
      _order(batches: [batch]),
    ];
    return batch;
  }

  @override
  Future<MerchantMatch> runMatch(String orderId) async {
    matchCalls += 1;
    final value = _match();
    matches = [value];
    return value;
  }

  @override
  Future<MerchantTrip> tripDetail(String id) async => trips.first;

  @override
  Future<TripLocation?> latestLocation(String id) async => TripLocation(
    lat: 31.65,
    lng: 35.15,
    source: 'simulated',
    sequence: 2,
    recordedAt: _time,
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

final _time = DateTime.utc(2026, 7, 13, 8);

MerchantRouteSummary _route() => const MerchantRouteSummary(
  id: 'route_1',
  originLabel: 'Hebron / PPU / Bab Al-Zawiya',
  destinationLabel: 'Bethlehem',
  status: 'active',
  parcelCapacity: 5,
);

MerchantBatch _batch() => MerchantBatch(
  id: 'batch_1',
  status: 'created',
  estimatedDistanceSaved: 43.06,
  explanation: 'Three parcels share one route.',
  createdAt: _time,
  route: _route(),
);

MerchantOrder _order({
  String status = 'batched',
  List<MerchantBatch>? batches,
}) => MerchantOrder(
  id: 'order_1',
  pickupLabel: merchantPickupLabel,
  status: status,
  createdAt: _time,
  parcels: const [
    MerchantParcel(
      id: 'parcel_1',
      destinationLabel: 'Bethlehem Market',
      size: 'S',
      priority: 'normal',
      status: 'pending',
    ),
  ],
  batches: batches ?? [_batch()],
);

MerchantMatch _match() => MerchantMatch(
  id: 'match_1',
  status: 'proposed',
  score: 0.93,
  method: 'masari_route_score',
  explanation: 'Safe explanation',
  breakdown: const ScoringBreakdown(
    corridorOverlap: 0.95,
    pickupDistanceScore: 0.82,
    timingFit: 0.9,
    trustScore: 0.86,
    capacityFit: 1,
    finalScore: 0.93,
  ),
  createdAt: _time,
  route: _route(),
  order: const MerchantOrderSummary(
    id: 'order_1',
    pickupLabel: merchantPickupLabel,
    status: 'batched',
    parcelCount: 1,
  ),
  batch: null,
);

MerchantTrip _trip() => MerchantTrip(
  id: 'trip_1',
  status: 'accepted',
  createdAt: _time,
  route: _route(),
  order: _order(status: 'assigned'),
  batch: null,
);
