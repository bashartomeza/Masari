import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:masari_mobile/features/canonical_routes/domain/canonical_route_models.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/maps/osrm_route_service.dart';
import '../../../core/presentation/localized_labels.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/theme/semantic_colors.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_map.dart';
import '../../../core/widgets/state_views.dart';
import '../../security/presentation/session_status_banner.dart';
import '../application/passenger_trip_controller.dart';

class PassengerTripScreen extends ConsumerStatefulWidget {
  const PassengerTripScreen({
    required this.tripId,
    super.key,
  });

  final String tripId;

  @override
  ConsumerState<PassengerTripScreen> createState() =>
      _PassengerTripScreenState();
}

class _PassengerTripScreenState extends ConsumerState<PassengerTripScreen>
    with WidgetsBindingObserver {
  Future<OsrmRouteResult>? _routeFuture;
  String? _routeKey;

  // Modern navy and orange palette.
  static const Color _navy = Color(0xFF102A43);
  static const Color _navyLight = Color(0xFF1D4260);
  static const Color _orange = Color(0xFFF97316);
  static const Color _pageBackground = Color(0xFFF4F7FA);
  static const Color _mutedText = Color(0xFF64748B);
  static const Color _border = Color(0xFFE2E8F0);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = ref.read(
      passengerTripControllerProvider(widget.tripId).notifier,
    );

    if (state == AppLifecycleState.resumed) {
      controller.resumePolling();
    }

    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      controller.pausePolling();
    }
  }

  Future<OsrmRouteResult> _loadRoute(
    double originLat,
    double originLng,
    double destinationLat,
    double destinationLng,
  ) async {
    try {
      final result = await const OsrmRouteService().getRoute(
        start: LatLng(originLat, originLng),
        end: LatLng(destinationLat, destinationLng),
      );

      if (result.points.length >= 2) {
        return result;
      }
    } catch (_) {
      // Fall back to the direct line if OSRM is unavailable.
    }

    return const OsrmRouteResult(
      points: [],
      durationSeconds: 0,
      distanceMeters: 0,
    );
  }

  Future<OsrmRouteResult> _getRouteFuture(
    PassengerTripState data,
  ) {
    final trip = data.trip;

    if (!trip.hasRouteCoordinates) {
      return Future.value(
        const OsrmRouteResult(
          points: [],
          durationSeconds: 0,
          distanceMeters: 0,
        ),
      );
    }

    // --------------------------------------------------------------
    // ROUTE START
    //
    // If the driver's latest location is available, use it as the
    // current route starting point.
    //
    // Otherwise, fall back to the original trip origin.
    // --------------------------------------------------------------
    final startLat = data.location?.lat ?? trip.originLat!;
    final startLng = data.location?.lng ?? trip.originLng!;

    final destinationLat = trip.destinationLat!;
    final destinationLng = trip.destinationLng!;

    // --------------------------------------------------------------
    // Include the driver's current location in the key.
    //
    // This is important because the route must be recalculated
    // whenever the driver's location changes.
    // --------------------------------------------------------------
    final key =
        '$startLat,$startLng|'
        '$destinationLat,$destinationLng';

    if (_routeFuture == null || _routeKey != key) {
      _routeKey = key;

      _routeFuture = _loadRoute(
        startLat,
        startLng,
        destinationLat,
        destinationLng,
      );
    }

    return _routeFuture!;
  }

  List<GeoPoint> _fallbackRoutePoints(
    PassengerTripState data,
  ) {
    final trip = data.trip;

    if (!trip.hasRouteCoordinates) {
      return const [];
    }

    // If the driver's current location is available,
    // draw the fallback line from the driver to the destination.
    final startLat = data.location?.lat ?? trip.originLat!;
    final startLng = data.location?.lng ?? trip.originLng!;

    return [
      GeoPoint(
        startLat,
        startLng,
      ),
      GeoPoint(
        trip.destinationLat!,
        trip.destinationLng!,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(
      passengerTripControllerProvider(widget.tripId),
    );

    return Scaffold(
      backgroundColor: _pageBackground,
      appBar: _buildAppBar(context, l10n),
      body: SafeArea(
        child: state.when(
          loading: () => const Center(
            child: CircularProgressIndicator(
              color: _orange,
            ),
          ),
          error: (_, _) => _buildErrorState(context, l10n),
          data: (data) => _buildTripContent(context, l10n, data),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(
    BuildContext context,
    AppLocalizations l10n,
  ) {
    return AppBar(
      backgroundColor: _navy,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
      toolbarHeight: 76,
      leading: IconButton(
        tooltip: 'Back',
        icon: const Icon(
          Icons.arrow_back_rounded,
          size: 26,
        ),
        onPressed: () => context.go('/passenger'),
      ),
      title: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            l10n.passengerTrip,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 7),
          Container(
            width: 34,
            height: 3,
            decoration: BoxDecoration(
              color: _orange,
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ],
      ),
      actions: const [
        Padding(
          padding: EdgeInsetsDirectional.only(end: 8),
          child: LanguageSwitch(),
        ),
      ],
    );
  }

  Widget _buildErrorState(
    BuildContext context,
    AppLocalizations l10n,
  ) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: _ModernCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                size: 48,
                color: _mutedText,
              ),
              const SizedBox(height: 16),
              Text(
                l10n.retry,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: _navy,
                ),
              ),
              const SizedBox(height: 20),
              _OrangeButton(
                label: l10n.retry,
                icon: Icons.refresh_rounded,
                onPressed: () => ref
                    .read(
                      passengerTripControllerProvider(
                        widget.tripId,
                      ).notifier,
                    )
                    .refresh(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTripContent(
    BuildContext context,
    AppLocalizations l10n,
    PassengerTripState data,
  ) {
    final trip = data.trip;

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        16,
        18,
        16,
        28,
      ),
      children: [
        const SessionStatusBanner(),
        const SizedBox(height: 18),

        // 1. Trip summary.
        _buildTripSummary(context, l10n, data),

        const SizedBox(height: 18),

        // 2. Map section.
        _buildMapSection(context, l10n, data),

        const SizedBox(height: 18),

        // 3. Location details.
        _buildLocationDetails(context, l10n, data),

        const SizedBox(height: 20),

        // 4. Refresh action.
        _OrangeButton(
          label: l10n.refresh,
          icon: Icons.refresh_rounded,
          onPressed: () => ref
              .read(
                passengerTripControllerProvider(
                  widget.tripId,
                ).notifier,
              )
              .refresh(),
        ),

        const SizedBox(height: 12),

        Center(
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Text(
              trip.id,
              style: const TextStyle(
                color: _mutedText,
                fontSize: 11,
                letterSpacing: 0.2,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTripSummary(
    BuildContext context,
    AppLocalizations l10n,
    PassengerTripState data,
  ) {
    final trip = data.trip;

    return _ModernCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  l10n.selectedRoute,
                  style: const TextStyle(
                    color: _mutedText,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              _StatusBadge(
                label: _statusLabel(l10n, trip.status),
                status: trip.status,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            trip.routeLabel,
            style: const TextStyle(
              color: _navy,
              fontSize: 21,
              height: 1.3,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 18),

          // ------------------------------------------------------------
          // START -> DESTINATION
          // ------------------------------------------------------------
          Row(
            children: [
              _RoutePoint(
                icon: Icons.trip_origin_rounded,
                label: 'Hebron',
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.directions_car_rounded,
                        color: _orange,
                        size: 27,
                      ),
                      const SizedBox(height: 5),
                      Container(
                        height: 2,
                        decoration: BoxDecoration(
                          color: _border,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              _RoutePoint(
                icon: Icons.flag_rounded,
                label: 'Bethlehem',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMapSection(
    BuildContext context,
    AppLocalizations l10n,
    PassengerTripState data,
  ) {
    return _ModernCard(
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 6, 8, 12),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _orange.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.map_rounded,
                    color: _orange,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.latestLocation,
                        style: const TextStyle(
                          color: _navy,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        l10n.selectedRoute,
                        style: const TextStyle(
                          color: _mutedText,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: FutureBuilder<OsrmRouteResult>(
              future: _getRouteFuture(data),
              builder: (
                context,
                snapshot,
              ) {
                final routeResult = snapshot.data;

                final routedPoints = routeResult?.points
                    .map(
                      (point) => GeoPoint(
                        point.latitude,
                        point.longitude,
                      ),
                    )
                    .toList(growable: false);

                final fallbackPoints = _fallbackRoutePoints(data);

                final pathPoints =
                    routedPoints != null &&
                            routedPoints.length >= 2
                        ? routedPoints
                        : fallbackPoints;

                final trip = data.trip;

                // --------------------------------------------------------
                // ORIGINAL TRIP START
                // --------------------------------------------------------
                final origin = trip.hasRouteCoordinates
                    ? GeoPoint(
                        trip.originLat!,
                        trip.originLng!,
                      )
                    : null;

                // --------------------------------------------------------
                // TRIP DESTINATION
                // --------------------------------------------------------
                final destination = trip.hasRouteCoordinates
                    ? GeoPoint(
                        trip.destinationLat!,
                        trip.destinationLng!,
                      )
                    : null;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    MasariMap(
                      emptyLabel: l10n.noLocationYet,
                      attributionLabel: l10n.mapAttribution,
                      height: 390,
                      banner: data.locationIsStale
                          ? OfflineBanner(
                              message: l10n.locationIsStale,
                            )
                          : null,
                      paths: [
                        if (pathPoints.length >= 2)
                          MasariMapPath(
                            points: pathPoints,
                            color: _navyLight,
                            width: 6,
                          ),
                      ],
                      markers: [
                        // ------------------------------------------------
                        // ORIGINAL START
                        // ------------------------------------------------
                        if (origin != null)
                          MasariMapMarker(
                            position: origin,
                            icon: Icons.trip_origin_rounded,
                            color: SemanticColors.upcomingRoute,
                            label: l10n.mapOriginLabel(
                              'Hebron',
                            ),
                            size: 42,
                          ),

                        // ------------------------------------------------
                        // DESTINATION
                        // ------------------------------------------------
                        if (destination != null)
                          MasariMapMarker(
                            position: destination,
                            icon: Icons.flag_rounded,
                            color: SemanticColors.completedRoute,
                            label: l10n.mapDestinationLabel(
                              'Bethlehem',
                            ),
                            size: 42,
                          ),

                        // ------------------------------------------------
                        // CURRENT DRIVER LOCATION
                        // ------------------------------------------------
                        if (data.location != null)
                          MasariMapMarker(
                            position: GeoPoint(
                              data.location!.lat,
                              data.location!.lng,
                            ),
                            icon: Icons.local_shipping_rounded,
                            color: _orange,
                            label:
                                '${l10n.latestLocation} — '
                                '${l10n.recordedTime}: '
                                '${data.location!.recordedAt}',
                            size: 50,
                          ),
                      ],
                    ),

                    // ------------------------------------------------------
                    // REMAINING ROUTE INFORMATION
                    // ------------------------------------------------------
                    if (routeResult != null &&
                        routeResult.durationSeconds > 0) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _navy,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.access_time_rounded,
                              color: _orange,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'الوقت المتبقي: '
                                '${routeResult.formattedDuration}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            Text(
                              '${routeResult.distanceKilometers.toStringAsFixed(1)} km',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 8),

                    // ------------------------------------------------------
                    // MAP HELP
                    // ------------------------------------------------------
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 3,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.touch_app_outlined,
                            size: 18,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant,
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'المسار يتحدث حسب موقع السائق الحالي',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationDetails(
    BuildContext context,
    AppLocalizations l10n,
    PassengerTripState data,
  ) {
    final location = data.location;

    return _ModernCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.latestLocation,
            style: const TextStyle(
              color: _navy,
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 16),

          if (location == null)
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: _border.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    Icons.location_searching_rounded,
                    color: _mutedText,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    l10n.noLocationYet,
                    style: const TextStyle(
                      color: _mutedText,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            )
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: _orange.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    Icons.local_shipping_rounded,
                    color: _orange,
                    size: 23,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        localizedLocationSource(
                          l10n,
                          location.source,
                        ),
                        style: const TextStyle(
                          color: _navy,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${l10n.recordedTime}: ${location.recordedAt}',
                        style: const TextStyle(
                          color: _mutedText,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                _LocationStatus(
                  isStale: data.locationIsStale,
                  l10n: l10n,
                ),
              ],
            ),

          if (location != null) ...[
            const SizedBox(height: 16),
            const Divider(
              height: 1,
              color: _border,
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _InfoItem(
                    icon: Icons.route_rounded,
                    label: l10n.sequence,
                    value: '${location.sequence}',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _InfoItem(
                    icon: Icons.source_rounded,
                    label: l10n.source,
                    value: localizedLocationSource(
                      l10n,
                      location.source,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _statusLabel(
    AppLocalizations l10n,
    String status,
  ) =>
      switch (status) {
        'pending' => l10n.statusPending,
        'matched' => l10n.statusMatched,
        'accepted' => l10n.statusAccepted,
        'picked_up' => l10n.statusPickedUp,
        'in_transit' => l10n.statusInTransit,
        'delivered' => l10n.statusDelivered,
        'cancelled' => l10n.statusCancelled,
        'completed' => l10n.statusCompleted,
        'pickup_started' => l10n.statusPickupStarted,
        _ => status,
      };
}

// ---------------------------------------------------------------------------
// Reusable visual components.
// ---------------------------------------------------------------------------

class _ModernCard extends StatelessWidget {
  const _ModernCard({
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.035),
            blurRadius: 18,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _OrangeButton extends StatelessWidget {
  const _OrangeButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(
          icon,
          color: Colors.white,
          size: 22,
        ),
        label: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFF97316),
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
    required this.status,
  });

  final String label;
  final String status;

  @override
  Widget build(BuildContext context) {
    final isCompleted =
        status == 'completed' || status == 'delivered';
    final isCancelled = status == 'cancelled';

    final color = isCancelled
        ? const Color(0xFFDC2626)
        : isCompleted
            ? const Color(0xFF16A34A)
            : const Color(0xFFF97316);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 7),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _RoutePoint extends StatelessWidget {
  const _RoutePoint({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          color: const Color(0xFFF97316),
          size: 27,
        ),
        const SizedBox(height: 5),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF102A43),
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _InfoItem extends StatelessWidget {
  const _InfoItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 18,
          color: const Color(0xFFF97316),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                value,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF102A43),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LocationStatus extends StatelessWidget {
  const _LocationStatus({
    required this.isStale,
    required this.l10n,
  });

  final bool isStale;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final color = isStale
        ? const Color(0xFFF97316)
        : const Color(0xFF16A34A);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Container(
          width: 9,
          height: 9,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          isStale
              ? l10n.locationIsStale
              : l10n.latestLocation,
          style: TextStyle(
            color: color,
            fontSize: 10,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}