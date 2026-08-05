import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/driver_controller.dart';
import '../domain/driver_home_stats.dart';
import 'driver_repository.dart';

/// The driver's own trust score, from `GET /me`.
///
/// Previously the home screen showed a hardcoded `96` in demo builds because
/// no endpoint returned `DriverProfile.trust_score` to its owner. `/me` now
/// includes `driver_profile`, so the figure is real. It stays nullable: a
/// non-driver, or a driver without a profile row, has no score and the card
/// says so rather than inventing one.
final driverTrustScoreProvider = FutureProvider<int?>((ref) async {
  return ref.watch(driverRepositoryProvider).ownTrustScore();
});

/// Combines the real dashboard state with the driver's real trust score.
///
/// `todayEarningsLabel` is always null: the schema has no fare, price or tariff
/// column anywhere, so there is nothing to derive earnings from. The card
/// renders its explicit "not available" state instead of a fabricated figure.
final driverHomeStatsProvider = Provider<AsyncValue<DriverHomeStats>>((ref) {
  final trustScore = ref.watch(driverTrustScoreProvider);

  return ref.watch(driverDashboardProvider).whenData((state) {
    final now = DateTime.now();
    final completedToday = state.trips.where((trip) {
      if (trip.status != 'completed') return false;
      final at = trip.completedAt ?? trip.createdAt;
      final local = at.toLocal();
      return local.year == now.year &&
          local.month == now.month &&
          local.day == now.day;
    }).length;

    return DriverHomeStats(
      completedTripsToday: completedToday,
      isOnline: state.currentRoute?.isOperational ?? false,
      trustScore: trustScore.asData?.value,
      todayEarningsLabel: null,
    );
  });
});
