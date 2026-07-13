import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/trip_models.dart';
import '../data/trip_repository.dart';

class PassengerTripState {
  const PassengerTripState({required this.trip, required this.location});

  final PassengerTrip trip;
  final TripLocation? location;

  bool get locationIsStale {
    final current = location;
    if (current == null) {
      return false;
    }
    return DateTime.now().difference(current.recordedAt) >
        const Duration(minutes: 5);
  }
}

final passengerTripControllerProvider =
    AsyncNotifierProvider.family<
      PassengerTripController,
      PassengerTripState,
      String
    >(PassengerTripController.new);

class PassengerTripController extends AsyncNotifier<PassengerTripState> {
  PassengerTripController(this._tripId);

  final String _tripId;
  Timer? _tripTimer;
  Timer? _locationTimer;

  @override
  Future<PassengerTripState> build() async {
    ref.onDispose(_stopPolling);
    final initial = await _load();
    resumePolling();
    return initial;
  }

  Future<void> refresh() async {
    state = AsyncData(await _load());
  }

  void pausePolling() => _stopPolling();

  void resumePolling() {
    if (_tripTimer != null || _locationTimer != null) {
      return;
    }
    _tripTimer = Timer.periodic(const Duration(seconds: 5), (_) => refresh());
    _locationTimer = Timer.periodic(
      const Duration(seconds: 3),
      (_) => refresh(),
    );
  }

  Future<PassengerTripState> _load() async {
    final repo = ref.read(tripRepositoryProvider);
    final trip = await repo.tripDetail(_tripId);
    final location = await repo.latestLocation(_tripId);
    return PassengerTripState(trip: trip, location: location);
  }

  void _stopPolling() {
    _tripTimer?.cancel();
    _locationTimer?.cancel();
    _tripTimer = null;
    _locationTimer = null;
  }
}
