import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_error.dart';
import '../../trips/data/trip_models.dart';
import '../data/driver_models.dart';
import '../data/driver_repository.dart';

class DriverDashboardState {
  const DriverDashboardState({
    required this.routes,
    required this.matches,
    required this.trips,
  });

  final List<DriverRoute> routes;
  final List<DriverMatch> matches;
  final List<DriverTrip> trips;

  DriverRoute? get currentRoute {
    for (final route in routes) {
      if (route.isOperational) return route;
    }
    return null;
  }

  int get proposedMatchCount => matches
      .where(
        (match) =>
            match.status == 'proposed' || match.status == 'sent_to_driver',
      )
      .length;

  DriverTrip? get activeTrip {
    for (final trip in trips) {
      if (trip.isActive) return trip;
    }
    return null;
  }
}

final driverDashboardProvider =
    AsyncNotifierProvider.autoDispose<
      DriverDashboardController,
      DriverDashboardState
    >(DriverDashboardController.new);

class DriverDashboardController extends AsyncNotifier<DriverDashboardState> {
  @override
  Future<DriverDashboardState> build() => refresh();

  Future<DriverDashboardState> refresh() async {
    final repository = ref.read(driverRepositoryProvider);
    final routes = await repository.listRoutes();
    final matches = await repository.listMatches();
    final trips = await repository.listTrips();
    final next = DriverDashboardState(
      routes: routes,
      matches: matches,
      trips: trips,
    );
    state = AsyncData(next);
    return next;
  }
}

class DriverRouteState {
  const DriverRouteState(this.routes);
  final List<DriverRoute> routes;

  DriverRoute? get currentRoute {
    for (final route in routes) {
      if (route.isOperational) return route;
    }
    return null;
  }
}

final driverRouteControllerProvider =
    AsyncNotifierProvider.autoDispose<DriverRouteController, DriverRouteState>(
      DriverRouteController.new,
    );

class DriverRouteController extends AsyncNotifier<DriverRouteState> {
  @override
  Future<DriverRouteState> build() => refresh();

  Future<DriverRouteState> refresh() async {
    final repository = ref.read(driverRepositoryProvider);
    final activeRoutes = await repository.activeRoutes();
    final routeHistory = await repository.listRoutes();
    final seen = <String>{};
    final routes = [
      ...activeRoutes.where((route) => seen.add(route.id)),
      ...routeHistory.where((route) => seen.add(route.id)),
    ];
    final next = DriverRouteState(routes);
    state = AsyncData(next);
    return next;
  }

  Future<DriverRoute> create({
    required int seatsAvailable,
    required int parcelCapacityAvailable,
  }) async {
    final current = state.value?.currentRoute;
    if (current != null) {
      throw const ApiException(ApiErrorType.validation, 'route_already_active');
    }
    final route = await ref
        .read(driverRepositoryProvider)
        .createRoute(
          seatsAvailable: seatsAvailable,
          parcelCapacityAvailable: parcelCapacityAvailable,
        );
    await refresh();
    ref.invalidate(driverDashboardProvider);
    return route;
  }

  Future<void> deactivate(String id) async {
    await ref.read(driverRepositoryProvider).deactivateRoute(id);
    await refresh();
    ref.invalidate(driverDashboardProvider);
  }
}

final driverMatchInboxProvider =
    AsyncNotifierProvider.autoDispose<
      DriverMatchInboxController,
      List<DriverMatch>
    >(DriverMatchInboxController.new);

class DriverMatchInboxController extends AsyncNotifier<List<DriverMatch>> {
  @override
  Future<List<DriverMatch>> build() => refresh();

  Future<List<DriverMatch>> refresh({String? status}) async {
    final matches = await ref
        .read(driverRepositoryProvider)
        .listMatches(status: status);
    final indexed = matches.indexed.toList();
    indexed.sort((left, right) {
      final priority = _matchPriority(
        left.$2.status,
      ).compareTo(_matchPriority(right.$2.status));
      if (priority != 0) return priority;
      final created = right.$2.createdAt.compareTo(left.$2.createdAt);
      return created != 0 ? created : left.$1.compareTo(right.$1);
    });
    final next = indexed.map((entry) => entry.$2).toList();
    state = AsyncData(next);
    return next;
  }
}

int _matchPriority(String status) =>
    status == 'proposed' || status == 'sent_to_driver' ? 0 : 1;

final driverMatchDetailProvider = AsyncNotifierProvider.autoDispose
    .family<DriverMatchDetailController, DriverMatch, String>(
      DriverMatchDetailController.new,
    );

class DriverMatchDetailController extends AsyncNotifier<DriverMatch> {
  DriverMatchDetailController(this._matchId);
  final String _matchId;

  @override
  Future<DriverMatch> build() => refresh();

  Future<DriverMatch> refresh() async {
    final match = await ref
        .read(driverRepositoryProvider)
        .matchDetail(_matchId);
    state = AsyncData(match);
    return match;
  }

  Future<DriverTripReference> accept() async {
    final trip = await ref.read(driverRepositoryProvider).acceptMatch(_matchId);
    ref.invalidate(driverMatchInboxProvider);
    ref.invalidate(driverDashboardProvider);
    return trip;
  }

  Future<void> reject() async {
    await ref.read(driverRepositoryProvider).rejectMatch(_matchId);
    await refresh();
    ref.invalidate(driverMatchInboxProvider);
    ref.invalidate(driverDashboardProvider);
  }
}

class DriverTripState {
  const DriverTripState({
    required this.trip,
    required this.location,
    this.actionInProgress = false,
  });

  final DriverTrip trip;
  final TripLocation? location;
  final bool actionInProgress;

  DriverTripState copyWith({
    DriverTrip? trip,
    TripLocation? location,
    bool clearLocation = false,
    bool? actionInProgress,
  }) {
    return DriverTripState(
      trip: trip ?? this.trip,
      location: clearLocation ? null : location ?? this.location,
      actionInProgress: actionInProgress ?? this.actionInProgress,
    );
  }
}

final driverTripControllerProvider = AsyncNotifierProvider.autoDispose
    .family<DriverTripController, DriverTripState, String>(
      DriverTripController.new,
    );

class DriverTripController extends AsyncNotifier<DriverTripState> {
  DriverTripController(this._tripId);
  final String _tripId;
  Timer? _tripTimer;
  Timer? _locationTimer;
  bool _tripRefreshRunning = false;
  bool _locationRefreshRunning = false;

  bool get isPolling => _tripTimer != null || _locationTimer != null;
  int get activeTimerCount =>
      (_tripTimer == null ? 0 : 1) + (_locationTimer == null ? 0 : 1);

  @override
  Future<DriverTripState> build() async {
    ref.onDispose(pausePolling);
    final initial = await _load();
    resumePolling();
    return initial;
  }

  Future<void> refresh() async {
    if (state.value?.actionInProgress == true) return;
    state = AsyncData(await _load());
  }

  void pausePolling() {
    _tripTimer?.cancel();
    _locationTimer?.cancel();
    _tripTimer = null;
    _locationTimer = null;
  }

  void resumePolling() {
    if (isPolling) return;
    _tripTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => unawaited(_refreshTrip()),
    );
    _locationTimer = Timer.periodic(
      const Duration(seconds: 3),
      (_) => unawaited(_refreshLocation()),
    );
  }

  Future<void> advanceStatus() async {
    final current = state.value;
    final next = current?.trip.nextStatus;
    if (current == null || current.actionInProgress || next == null) return;
    await _runAction(() async {
      await ref.read(driverRepositoryProvider).updateTripStatus(_tripId, next);
    });
    ref.invalidate(driverDashboardProvider);
  }

  Future<void> simulateStep() async {
    final current = state.value;
    if (current == null || current.actionInProgress) return;
    await _runAction(() async {
      await ref.read(driverRepositoryProvider).simulateStep(_tripId);
    });
  }

  Future<void> resetSimulation() async {
    final current = state.value;
    if (current == null || current.actionInProgress) return;
    state = AsyncData(current.copyWith(actionInProgress: true));
    try {
      await ref.read(driverRepositoryProvider).resetSimulation(_tripId);
      final trip = await ref.read(driverRepositoryProvider).tripDetail(_tripId);
      state = AsyncData(
        current.copyWith(
          trip: trip,
          clearLocation: true,
          actionInProgress: false,
        ),
      );
    } catch (_) {
      state = AsyncData(current.copyWith(actionInProgress: false));
      rethrow;
    }
  }

  Future<void> _runAction(Future<void> Function() action) async {
    final current = state.value!;
    state = AsyncData(current.copyWith(actionInProgress: true));
    try {
      await action();
      state = AsyncData((await _load()).copyWith(actionInProgress: false));
    } catch (_) {
      state = AsyncData(current.copyWith(actionInProgress: false));
      rethrow;
    }
  }

  Future<DriverTripState> _load() async {
    final repository = ref.read(driverRepositoryProvider);
    final trip = await repository.tripDetail(_tripId);
    final location = await repository.latestLocation(_tripId);
    return DriverTripState(trip: trip, location: location);
  }

  Future<void> _refreshTrip() async {
    if (_tripRefreshRunning || state.value?.actionInProgress == true) return;
    _tripRefreshRunning = true;
    try {
      final trip = await ref.read(driverRepositoryProvider).tripDetail(_tripId);
      final current = state.value;
      if (current != null) state = AsyncData(current.copyWith(trip: trip));
    } catch (_) {
      // Polling keeps the last good state; explicit actions surface errors.
    } finally {
      _tripRefreshRunning = false;
    }
  }

  Future<void> _refreshLocation() async {
    if (_locationRefreshRunning || state.value?.actionInProgress == true) {
      return;
    }
    _locationRefreshRunning = true;
    try {
      final location = await ref
          .read(driverRepositoryProvider)
          .latestLocation(_tripId);
      final current = state.value;
      if (current != null && location != null) {
        state = AsyncData(current.copyWith(location: location));
      }
    } catch (_) {
      // Polling keeps the last good state; explicit actions surface errors.
    } finally {
      _locationRefreshRunning = false;
    }
  }
}
