/// The headline figures on the driver's home screen.
///
/// A presentation model, decoupled from any API shape, so the stat cards render
/// the same whether a figure came from the live API, was derived locally, or is
/// demo content. Anything the backend cannot supply is nullable and its card
/// shows an explicit "not available" state rather than a fabricated number.
///
/// | Field                 | Backing data                                      |
/// |-----------------------|---------------------------------------------------|
/// | [completedTripsToday] | derived from `GET /trips` — real                  |
/// | [isOnline]            | derived from `DriverRoute.status` — real          |
/// | [trustScore]          | `DriverProfile.trust_score` exists in the database |
/// |                       | but no endpoint returns it to the driver, so it is |
/// |                       | null outside demo builds                          |
/// | [todayEarningsLabel]  | **none** — the schema has no fare or price column  |
class DriverHomeStats {
  const DriverHomeStats({
    required this.completedTripsToday,
    required this.isOnline,
    this.trustScore,
    this.todayEarningsLabel,
    this.isSample = false,
  });

  /// Trips this driver completed today. Always real.
  final int completedTripsToday;

  /// Whether the driver has an operational route. Always real.
  final bool isOnline;

  /// 0..100, matching how the database stores it. Null when unavailable.
  final int? trustScore;

  /// Already formatted with its currency by the source. Null when unavailable.
  final String? todayEarningsLabel;

  /// Marks demo content so the screen can label it rather than imply it is live.
  final bool isSample;

  /// The trust score projected onto the 0..5 scale the gauge draws.
  double? get trustOutOfFive =>
      trustScore == null ? null : (trustScore! / 20).clamp(0.0, 5.0);
}
