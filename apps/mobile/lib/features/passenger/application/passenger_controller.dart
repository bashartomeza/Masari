import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../trips/data/trip_models.dart';
import '../../trips/data/trip_repository.dart';
import '../data/passenger_models.dart';
import '../data/passenger_repository.dart';

class PassengerDashboardState {
  const PassengerDashboardState({
    required this.activeRequests,
    required this.trips,
  });

  final List<PassengerRequest> activeRequests;
  final List<PassengerTrip> trips;

  PassengerRequest? get activeRequest =>
      activeRequests.isEmpty ? null : activeRequests.first;

  PassengerTrip? get activeTrip {
    for (final trip in trips) {
      if (trip.status != 'completed' &&
          trip.status != 'cancelled' &&
          trip.status != 'failed') {
        return trip;
      }
    }
    return null;
  }

  PassengerTrip? tripForRequest(String requestId) {
    for (final trip in trips) {
      if (trip.passengerRequestId == requestId) return trip;
    }
    return null;
  }
}

final passengerDashboardProvider =
    AsyncNotifierProvider<
      PassengerDashboardController,
      PassengerDashboardState
    >(PassengerDashboardController.new);

class PassengerDashboardController
    extends AsyncNotifier<PassengerDashboardState> {
  @override
  Future<PassengerDashboardState> build() => refresh();

  Future<PassengerDashboardState> refresh() async {
    try {
      final requests = await ref
          .read(passengerRepositoryProvider)
          .activeRequests();
      final trips = await ref.read(tripRepositoryProvider).listTrips();
      final next = PassengerDashboardState(
        activeRequests: requests,
        trips: trips,
      );
      state = AsyncData(next);
      return next;
    } catch (error, stackTrace) {
      state = AsyncError(error, stackTrace);
      Error.throwWithStackTrace(error, stackTrace);
    }
  }
}

final passengerRequestDetailProvider = FutureProvider.autoDispose
    .family<PassengerRequest, String>((ref, id) {
      return ref.watch(passengerRepositoryProvider).requestDetail(id);
    });

final passengerTripForRequestProvider = FutureProvider.autoDispose
    .family<PassengerTrip?, String>((ref, requestId) async {
      final trips = await ref.watch(tripRepositoryProvider).listTrips();
      for (final trip in trips) {
        if (trip.passengerRequestId == requestId) return trip;
      }
      return null;
    });
