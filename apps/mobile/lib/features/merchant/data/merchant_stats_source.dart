import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/merchant_controller.dart';
import '../domain/merchant_home_stats.dart';

/// Merchant dashboard figures, all from the API.
///
/// `moneySavedLabel` is always null. Distance saved is real and comes from the
/// batch itself (`ParcelBatch.estimated_distance_saved`), but there is no fare
/// or tariff column anywhere in the schema to convert it into currency, so the
/// card shows its "not available" state rather than a fabricated shekel figure.
final merchantHomeStatsProvider = Provider<AsyncValue<MerchantHomeStats>>((
  ref,
) {
  return ref.watch(merchantDashboardProvider).whenData((state) {
    return MerchantHomeStats.from(
      MerchantDashboardSnapshot(
        orders: state.orders,
        waitingForDriver: state.waitingMatchCount,
        activeShipments: state.trips.where((trip) => trip.isActive).length,
      ),
      moneySavedLabel: null,
    );
  });
});
