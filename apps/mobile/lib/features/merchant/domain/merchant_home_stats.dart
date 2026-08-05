import '../data/merchant_models.dart';

/// A consolidation opportunity the merchant can act on.
///
/// Derived entirely from real orders: an order that is submitted and not yet
/// batched can be consolidated, and `POST /merchant/orders/:id/batch` is the
/// action behind it. Nothing here is predicted or invented — the "suggestion"
/// is simply the app surfacing an action the API already allows.
class BatchSuggestion {
  const BatchSuggestion({
    required this.orderId,
    required this.parcelCount,
    required this.destinationLabel,
  });

  final String orderId;
  final int parcelCount;
  final String destinationLabel;
}

/// The headline figures on the merchant's home screen.
///
/// | Field                | Backing data                                     |
/// |----------------------|--------------------------------------------------|
/// | [distanceSavedKm]    | summed `MerchantBatch.estimated_distance_saved`  |
/// | [waitingForDriver]   | matches awaiting a driver — real                 |
/// | [activeShipments]    | active trips — real                              |
/// | [suggestions]        | orders where `canBatch` — real                   |
/// | [moneySavedLabel]    | **none** — the schema has no fare or price column |
class MerchantHomeStats {
  const MerchantHomeStats({
    required this.distanceSavedKm,
    required this.waitingForDriver,
    required this.activeShipments,
    required this.suggestions,
    this.moneySavedLabel,
    this.isSample = false,
  });

  /// Total distance saved by consolidation, in kilometres. Real.
  final double distanceSavedKm;

  final int waitingForDriver;
  final int activeShipments;
  final List<BatchSuggestion> suggestions;

  /// Already formatted with its currency. Null outside demo builds, because
  /// the schema records distance saved but never money.
  final String? moneySavedLabel;

  final bool isSample;

  bool get hasSavings => distanceSavedKm > 0 || moneySavedLabel != null;

  static MerchantHomeStats from(
    MerchantDashboardSnapshot snapshot, {
    String? moneySavedLabel,
    bool isSample = false,
  }) {
    var saved = 0.0;
    for (final order in snapshot.orders) {
      for (final batch in order.batches) {
        saved += batch.estimatedDistanceSaved;
      }
    }

    return MerchantHomeStats(
      distanceSavedKm: saved,
      waitingForDriver: snapshot.waitingForDriver,
      activeShipments: snapshot.activeShipments,
      moneySavedLabel: moneySavedLabel,
      isSample: isSample,
      suggestions: [
        for (final order in snapshot.orders)
          if (order.canBatch && order.parcels.isNotEmpty)
            BatchSuggestion(
              orderId: order.id,
              parcelCount: order.parcels.length,
              destinationLabel: order.parcels.first.destinationLabel,
            ),
      ],
    );
  }
}

/// The slice of dashboard state the stats need, so the model stays testable
/// without constructing a whole controller state.
class MerchantDashboardSnapshot {
  const MerchantDashboardSnapshot({
    required this.orders,
    required this.waitingForDriver,
    required this.activeShipments,
  });

  final List<MerchantOrder> orders;
  final int waitingForDriver;
  final int activeShipments;
}
