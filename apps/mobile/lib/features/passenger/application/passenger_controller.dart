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
  PassengerTrip? get activeTrip => trips.isEmpty ? null : trips.first;
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
