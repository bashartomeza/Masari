import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/location/location_service.dart';
import '../../../core/maps/osrm_route_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/theme/semantic_colors.dart';
import '../../../core/widgets/masari_card.dart';
import '../../../core/widgets/masari_map.dart';
import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/state_views.dart';
import '../../canonical_routes/domain/canonical_route_models.dart';
import '../../checkpoints/application/checkpoint_controller.dart';
import '../../checkpoints/domain/checkpoint_models.dart';
import '../../trips/application/passenger_trip_controller.dart';
import '../application/passenger_map_controller.dart';

/// The passenger's "Map" tab.
///
/// The map and checkpoints are always visible to the passenger,
/// regardless of whether the passenger is currently active.
///
/// Optional layers such as:
/// - passenger location
/// - requested route
/// - travel leg
/// - driver location
/// are displayed when their data is available.
///
/// Each layer fails independently:
/// - Location failure does not hide the map.
/// - Route without coordinates does not hide the map.
/// - Driver location failure does not hide the map.
/// - Checkpoint failure does not hide the map.
/// - Empty checkpoint data is explicitly shown.
/// - Passenger active/inactive state does not control map visibility.
class PassengerMapAlertsScreen extends ConsumerWidget {
  const PassengerMapAlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final view = ref.watch(passengerMapViewProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.navMapAlerts)),
      body: view.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(AppTokens.spaceMedium),
          child: LoadingSkeleton.card(),
        ),
        error: (_, _) => ErrorStateView(
          title: l10n.mapLoadFailed,
          message: l10n.mapLoadFailedBody,
          retryLabel: l10n.retry,
          onRetry: () => ref.invalidate(passengerMapViewProvider),
        ),

        // IMPORTANT:
        // The map is ALWAYS rendered.
        // We no longer use mapsAvailable to replace it
        // with an unavailable state.
        data: (data) => _MapBody(view: data),
      ),
    );
  }
}

/// Main passenger map content.
///
/// Stateful so the OSRM route is cached and is not requested again
/// every time Riverpod rebuilds this widget because of location polling,
/// checkpoint updates, or trip updates.
class _MapBody extends ConsumerStatefulWidget {
  const _MapBody({required this.view});

  final PassengerMapView view;

  @override
  ConsumerState<_MapBody> createState() => _MapBodyState();
}

class _MapBodyState extends ConsumerState<_MapBody> {
  // OSRM now returns OsrmRouteResult instead of List<LatLng>.
  Future<OsrmRouteResult>? _routeFuture;

  @override
  void initState() {
    super.initState();
    _loadRoute();
  }

  @override
  void didUpdateWidget(covariant _MapBody oldWidget) {
    super.didUpdateWidget(oldWidget);

    final oldRoute = oldWidget.view.route;
    final newRoute = widget.view.route;

    final oldStart = _routeStart(oldRoute);
    final oldEnd = _routeEnd(oldRoute);

    final newStart = _routeStart(newRoute);
    final newEnd = _routeEnd(newRoute);

    final routeChanged =
        oldStart?.latitude != newStart?.latitude ||
        oldStart?.longitude != newStart?.longitude ||
        oldEnd?.latitude != newEnd?.latitude ||
        oldEnd?.longitude != newEnd?.longitude;

    if (routeChanged) {
      _loadRoute();
    }
  }

  /// Returns the first point of the passenger route.
  LatLng? _routeStart(CanonicalRoute? route) {
    if (route == null || route.path.length < 2) {
      return null;
    }

    final point = route.path.first;

    return LatLng(point.latitude, point.longitude);
  }

  /// Returns the final point of the passenger route.
  LatLng? _routeEnd(CanonicalRoute? route) {
    if (route == null || route.path.length < 2) {
      return null;
    }

    final point = route.path.last;

    return LatLng(point.latitude, point.longitude);
  }

  /// Requests a real road-following route from OSRM.
  ///
  /// If OSRM fails or returns an invalid route, the original
  /// application route is used as a fallback so the map never breaks.
  void _loadRoute() {
    final route = widget.view.route;

    if (route == null || route.path.length < 2) {
      _routeFuture = Future.value(
        const OsrmRouteResult(
          points: [],
          durationSeconds: 0,
          distanceMeters: 0,
        ),
      );
      return;
    }

    final start = _routeStart(route);
    final end = _routeEnd(route);

    if (start == null || end == null) {
      _routeFuture = Future.value(
        const OsrmRouteResult(
          points: [],
          durationSeconds: 0,
          distanceMeters: 0,
        ),
      );
      return;
    }

    _routeFuture = const OsrmRouteService().getRoute(start: start, end: end);
  }

  /// Converts the original route into the fallback format expected
  /// by the map widget.
  List<GeoPoint> _fallbackRoutePoints(CanonicalRoute? route) {
    if (route == null || route.path.length < 2) {
      return const [];
    }

    return route.path
        .map((point) => GeoPoint(point.latitude, point.longitude))
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    // ----------------------------------------------------------------------
    // Passenger's own location
    // ----------------------------------------------------------------------

    final position = ref.watch(currentPositionProvider);

    // ----------------------------------------------------------------------
    // Checkpoints
    // ----------------------------------------------------------------------

    // IMPORTANT:
    // Checkpoints are ALWAYS requested.
    // We do not depend on view.checkpointsAvailable.
    final checkpoints = ref.watch(checkpointsProvider);

    final snapshot = checkpoints.value ?? CheckpointSnapshot.empty;

    // ----------------------------------------------------------------------
    // Route
    // ----------------------------------------------------------------------

    final route = widget.view.route;

    // ----------------------------------------------------------------------
    // Passenger trip / driver location
    // ----------------------------------------------------------------------

    final tripId = widget.view.assignment?.trip?.id;

    final tripState = tripId == null
        ? null
        : ref.watch(passengerTripControllerProvider(tripId));

    final driverLocation = tripState?.value?.location;

    // ----------------------------------------------------------------------
    // Driver -> Passenger distance
    // ----------------------------------------------------------------------

    final driverToPickupDistanceKm =
        driverLocation == null || widget.view.pickup?.position == null
        ? null
        : const Distance().as(
            LengthUnit.Kilometer,
            LatLng(driverLocation.lat, driverLocation.lng),
            LatLng(
              widget.view.pickup!.position!.latitude,
              widget.view.pickup!.position!.longitude,
            ),
          );

    // ----------------------------------------------------------------------
    // Estimated ETA
    // ----------------------------------------------------------------------

    // The current TripLocation API does not expose driver speed.
    // Therefore ETA is an estimate based on an average assumed speed.
    const estimatedSpeedKmh = 30.0;

    final estimatedEtaMinutes = driverToPickupDistanceKm == null
        ? null
        : (driverToPickupDistanceKm / estimatedSpeedKmh * 60).ceil();

    // ----------------------------------------------------------------------
    // Localization
    // ----------------------------------------------------------------------

    final localeName = Localizations.localeOf(context).languageCode == 'ar';

    String stopName(CanonicalStop stop) {
      return localeName ? stop.nameAr : stop.nameEn;
    }

    // ----------------------------------------------------------------------
    // Original route fallback
    // ----------------------------------------------------------------------

    final fallbackRoutePoints = _fallbackRoutePoints(route);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(passengerMapViewProvider);

        // Always refresh checkpoints.
        await ref.read(checkpointsProvider.notifier).refresh();

        // Also refresh the current passenger trip/location.
        if (tripId != null) {
          await ref
              .read(passengerTripControllerProvider(tripId).notifier)
              .refresh();
        }
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppTokens.spaceMedium),
        children: [
          // ==================================================================
          // MAP
          // ==================================================================
          FutureBuilder<OsrmRouteResult>(
            future: _routeFuture,
            builder: (context, routeSnapshot) {
              // ------------------------------------------------------------
              // Get the route points from OsrmRouteResult.
              //
              // OSRM now returns:
              // OsrmRouteResult
              //
              // The actual map points are:
              // routeSnapshot.data?.points
              // ------------------------------------------------------------

              final routedPoints = routeSnapshot.data?.points
                  .map((point) => GeoPoint(point.latitude, point.longitude))
                  .toList(growable: false);

              // ------------------------------------------------------------
              // Use OSRM route when available.
              //
              // If OSRM fails, returns no route, or returns fewer than
              // two points, fall back to the application's original route.
              // ------------------------------------------------------------

              final pathPoints =
                  routedPoints != null && routedPoints.length >= 2
                  ? routedPoints
                  : fallbackRoutePoints;

              return MasariMap(
                height: 460,

                // The map itself remains visible even when there is
                // no route or no coordinates.
                emptyLabel: route == null
                    ? l10n.mapSelectRoute
                    : l10n.mapRouteMissingCoordinates,

                attributionLabel: l10n.mapAttribution,

                banner: snapshot.stale
                    ? OfflineBanner(message: l10n.checkpointsStale)
                    : null,

                paths: [
                  // ----------------------------------------------------------
                  // Full requested route.
                  //
                  // This now follows real roads through OSRM.
                  // It falls back to the original route automatically
                  // if OSRM is unavailable.
                  // ----------------------------------------------------------
                  if (pathPoints.length >= 2)
                    MasariMapPath(
                      points: pathPoints,
                      color: SemanticColors.upcomingRoute,
                      width: 4,
                      dashed: true,
                    ),

                  // ----------------------------------------------------------
                  // Passenger's own route leg.
                  //
                  // Kept unchanged because this is an application-specific
                  // leg and may represent a different logical segment.
                  // ----------------------------------------------------------
                  if (widget.view.leg.length >= 2)
                    MasariMapPath(
                      points: widget.view.leg,
                      color: SemanticColors.activeRoute,
                      width: 6,
                    ),
                ],

                markers: [
                  // ----------------------------------------------------------
                  // Passenger's current location
                  // ----------------------------------------------------------
                  if (position.value != null)
                    MasariMapMarker(
                      position: position.value!,
                      icon: Icons.my_location_rounded,
                      color: SemanticColors.passenger,
                      label: l10n.mapYourLocation,
                      size: 40,
                    ),

                  // ----------------------------------------------------------
                  // Driver's current location
                  // ----------------------------------------------------------
                  if (driverLocation != null)
                    MasariMapMarker(
                      position: GeoPoint(
                        driverLocation.lat,
                        driverLocation.lng,
                      ),
                      icon: Icons.local_shipping_rounded,
                      color: SemanticColors.passenger,
                      label: 'موقع السائق',
                      size: 46,
                    ),

                  // ----------------------------------------------------------
                  // Route stops
                  // ----------------------------------------------------------
                  if (route != null)
                    for (final stop in route.stops)
                      if (stop.position != null)
                        _stopMarker(l10n, stop, stopName(stop), route),

                  // ----------------------------------------------------------
                  // Checkpoints
                  // ----------------------------------------------------------

                  // IMPORTANT:
                  // Checkpoints are always drawn on the map.
                  for (final checkpoint in snapshot.checkpoints)
                    MasariMapMarker(
                      position: checkpoint.position,
                      icon: _checkpointIcon(checkpoint.status),
                      color: _checkpointColor(checkpoint.status),
                      foreground: checkpoint.status == CheckpointStatus.unknown
                          ? AppTheme.onSurface
                          : Colors.white,
                      label: l10n.checkpointLabel(
                        _checkpointName(l10n, checkpoint, localeName),
                        _checkpointStatus(l10n, checkpoint.status),
                      ),
                      size: 30,
                    ),
                ],
              );
            },
          ),

          // ==================================================================
          // DRIVER ARRIVAL CARD
          // ==================================================================
          if (driverLocation != null && driverToPickupDistanceKm != null) ...[
            const SizedBox(height: AppTokens.spaceSmall),
            _DriverArrivalCard(
              distanceKm: driverToPickupDistanceKm,
              etaMinutes: estimatedEtaMinutes,
            ),
          ],

          const SizedBox(height: AppTokens.spaceMedium),

          // ==================================================================
          // DRIVER LOCATION STATUS
          // ==================================================================
          if (tripId != null && tripState != null && tripState.hasError)
            _Notice(
              icon: Icons.location_disabled_outlined,
              message: 'تعذر تحديث موقع السائق حاليًا.',
              actionLabel: l10n.retry,
              onAction: () => ref
                  .read(passengerTripControllerProvider(tripId).notifier)
                  .refresh(),
            ),

          if (tripId != null &&
              tripState?.value?.location == null &&
              !tripState!.isLoading)
            _Notice(
              icon: Icons.location_searching_rounded,
              message: 'بانتظار آخر موقع مسجل للسائق.',
            ),

          // Location warning.
          // Does NOT hide the map.
          if (position.hasError)
            _Notice(
              icon: Icons.location_disabled_outlined,
              message: _locationMessage(l10n, position.error),
              actionLabel: l10n.locationEnable,
              onAction: () =>
                  ref.read(currentPositionProvider.notifier).refresh(),
            ),

          // Route warning.
          // Does NOT hide the map.
          if (route != null && !widget.view.hasDrawableRoute)
            _Notice(
              icon: Icons.wrong_location_outlined,
              message: l10n.mapRouteMissingCoordinates,
            ),

          // ==================================================================
          // ROUTE SUMMARY
          // ==================================================================
          if (widget.view.pickup != null || widget.view.dropoff != null) ...[
            const SizedBox(height: AppTokens.spaceSmall),
            _PassengerRouteSummary(
              l10n: l10n,
              view: widget.view,
              arabic: localeName,
            ),
          ],

          const SizedBox(height: AppTokens.spaceMedium),

          // ==================================================================
          // CHECKPOINTS
          // ==================================================================

          // IMPORTANT:
          // Always available to the passenger.
          MasariSection(
            title: l10n.checkpoints,
            child: _CheckpointsPanel(
              available: true,
              state: checkpoints,
              arabic: localeName,
            ),
          ),
        ],
      ),
    );
  }

  MasariMapMarker _stopMarker(
    AppLocalizations l10n,
    CanonicalStop stop,
    String name,
    CanonicalRoute route,
  ) {
    final isOrigin = stop.id == route.originStop?.id;

    final isDestination = stop.id == route.destinationStop?.id;

    return MasariMapMarker(
      position: stop.position!,
      icon: isOrigin
          ? Icons.trip_origin_rounded
          : isDestination
          ? Icons.flag_rounded
          : Icons.circle,
      color: isDestination
          ? SemanticColors.completedRoute
          : SemanticColors.parcel,
      label: isOrigin
          ? l10n.mapOriginLabel(name)
          : isDestination
          ? l10n.mapDestinationLabel(name)
          : l10n.mapStopLabel(name),
      size: isOrigin || isDestination ? 34 : 22,
    );
  }
}

// ============================================================================
// DRIVER ARRIVAL CARD
// ============================================================================

class _DriverArrivalCard extends StatelessWidget {
  const _DriverArrivalCard({
    required this.distanceKm,
    required this.etaMinutes,
  });

  final double distanceKm;
  final int? etaMinutes;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final distanceLabel = distanceKm < 1
        ? '${(distanceKm * 1000).round()} م'
        : '${distanceKm.toStringAsFixed(1)} كم';

    final etaLabel = etaMinutes == null ? '—' : '$etaMinutes د';

    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  Icons.local_shipping_rounded,
                  color: theme.colorScheme.onPrimaryContainer,
                  size: 28,
                ),
              ),
              const SizedBox(width: AppTokens.spaceMedium),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'السائق في الطريق إليك',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: AppTokens.spaceExtraSmall),
                    Text(
                      'المسافة والوقت المتبقي للوصول إلى نقطة الالتقاء',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          Row(
            children: [
              Expanded(
                child: _DriverArrivalMetric(
                  icon: Icons.route_rounded,
                  value: distanceLabel,
                  label: 'المسافة المتبقية',
                ),
              ),
              const SizedBox(width: AppTokens.spaceSmall),
              Expanded(
                child: _DriverArrivalMetric(
                  icon: Icons.access_time_rounded,
                  value: etaLabel,
                  label: 'وقت الوصول التقريبي',
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.spaceSmall),
          Text(
            'الوقت تقديري وقد يتغير حسب حركة الطريق.',
            textAlign: TextAlign.center,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _DriverArrivalMetric extends StatelessWidget {
  const _DriverArrivalMetric({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.spaceSmall,
        vertical: AppTokens.spaceMedium,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppTokens.radiusDefault),
      ),
      child: Column(
        children: [
          Icon(icon, color: theme.colorScheme.primary, size: 25),
          const SizedBox(height: AppTokens.spaceExtraSmall),
          Text(
            value,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// PASSENGER ROUTE SUMMARY
// ============================================================================

class _PassengerRouteSummary extends StatelessWidget {
  const _PassengerRouteSummary({
    required this.l10n,
    required this.view,
    required this.arabic,
  });

  final AppLocalizations l10n;
  final PassengerMapView view;
  final bool arabic;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    String stopName(CanonicalStop stop) {
      return arabic ? stop.nameAr : stop.nameEn;
    }

    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'مسار رحلتك',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          if (view.pickup != null)
            _PassengerRoutePoint(
              icon: Icons.location_on_rounded,
              color: SemanticColors.upcomingRoute,
              title: 'نقطة الالتقاء',
              value: stopName(view.pickup!),
            ),
          if (view.pickup != null && view.dropoff != null)
            Padding(
              padding: const EdgeInsetsDirectional.only(start: 12),
              child: Container(
                width: 2,
                height: 25,
                color: theme.colorScheme.outlineVariant,
              ),
            ),
          if (view.dropoff != null)
            _PassengerRoutePoint(
              icon: Icons.flag_rounded,
              color: SemanticColors.completedRoute,
              title: 'الوجهة',
              value: stopName(view.dropoff!),
            ),
        ],
      ),
    );
  }
}

class _PassengerRoutePoint extends StatelessWidget {
  const _PassengerRoutePoint({
    required this.icon,
    required this.color,
    required this.title,
    required this.value,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.14),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 18, color: color),
        ),
        const SizedBox(width: AppTokens.spaceSmall),
        Text(
          '$title: ',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodyLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// CHECKPOINTS
// ============================================================================

class _CheckpointsPanel extends ConsumerWidget {
  const _CheckpointsPanel({
    required this.available,
    required this.state,
    required this.arabic,
  });

  final bool available;
  final AsyncValue<CheckpointSnapshot> state;
  final bool arabic;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);

    // Kept for compatibility with the
    // existing widget API.
    // Passenger checkpoints are now always available.
    if (!available) {
      return MasariInfoCard(
        title: l10n.checkpointsUnavailable,
        subtitle: l10n.checkpointsDisabled,
        icon: Icons.block_outlined,
      );
    }

    return state.when(
      loading: () => const LoadingSkeleton.card(),

      // Checkpoint failure is shown explicitly.
      // The map itself remains usable.
      error: (_, _) => ErrorStateView(
        title: l10n.checkpointsUnavailable,
        message: l10n.checkpointsUnavailableBody,
        retryLabel: l10n.retry,
        onRetry: () => ref.read(checkpointsProvider.notifier).refresh(),
      ),

      data: (snapshot) {
        if (snapshot.checkpoints.isEmpty) {
          return MasariInfoCard(
            title: l10n.checkpointsEmpty,
            subtitle: l10n.checkpointCount(0),
            icon: Icons.check_circle_outline,
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final checkpoint in snapshot.checkpoints)
              Padding(
                padding: const EdgeInsets.only(bottom: AppTokens.spaceSmall),
                child: _CheckpointRow(
                  name: _checkpointName(l10n, checkpoint, arabic),
                  status: _checkpointStatus(l10n, checkpoint.status),
                  color: _checkpointColor(checkpoint.status),
                  icon: _checkpointIcon(checkpoint.status),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _CheckpointRow extends StatelessWidget {
  const _CheckpointRow({
    required this.name,
    required this.status,
    required this.color,
    required this.icon,
  });

  final String name;
  final String status;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(AppTokens.gutterMobile),
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainerLowest,
        border: Border.all(color: AppTheme.outlineVariant),
        borderRadius: BorderRadius.circular(AppTokens.radiusMedium),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: Colors.white),
          ),
          const SizedBox(width: AppTokens.gutterMobile),
          Expanded(child: Text(name, style: theme.textTheme.titleSmall)),
          Text(
            status,
            style: theme.textTheme.labelMedium?.copyWith(
              color: AppTheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// NOTICE
// ============================================================================

class _Notice extends StatelessWidget {
  const _Notice({
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: AppTokens.spaceMedium),
      padding: const EdgeInsets.all(AppTokens.gutterMobile),
      decoration: BoxDecoration(
        color: SemanticColors.warningContainer,
        borderRadius: BorderRadius.circular(AppTokens.radiusMedium),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: SemanticColors.onWarningContainer),
          const SizedBox(width: AppTokens.spaceSmall),
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.bodySmall?.copyWith(
                color: SemanticColors.onWarningContainer,
              ),
            ),
          ),
          if (actionLabel != null && onAction != null)
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

// ============================================================================
// CHECKPOINT HELPERS
// ============================================================================

String _checkpointName(
  AppLocalizations l10n,
  Checkpoint checkpoint,
  bool arabic,
) {
  final preferred = arabic ? checkpoint.nameAr : checkpoint.nameEn;

  return preferred ??
      checkpoint.nameEn ??
      checkpoint.nameAr ??
      l10n.checkpointUnnamed;
}

String _checkpointStatus(AppLocalizations l10n, CheckpointStatus status) =>
    switch (status) {
      CheckpointStatus.open => l10n.checkpointOpen,
      CheckpointStatus.congested => l10n.checkpointCongested,
      CheckpointStatus.closed => l10n.checkpointClosed,
      CheckpointStatus.unknown => l10n.checkpointUnknown,
    };

IconData _checkpointIcon(CheckpointStatus status) => switch (status) {
  CheckpointStatus.open => Icons.check,
  CheckpointStatus.congested => Icons.hourglass_bottom,
  CheckpointStatus.closed => Icons.block,
  CheckpointStatus.unknown => Icons.question_mark,
};

Color _checkpointColor(CheckpointStatus status) => switch (status) {
  CheckpointStatus.open => SemanticColors.success,
  CheckpointStatus.congested => SemanticColors.warning,
  CheckpointStatus.closed => SemanticColors.error,

  // Grey, never green:
  // an unconfirmed checkpoint must not
  // read as passable.
  CheckpointStatus.unknown => SemanticColors.pendingContainer,
};

// ============================================================================
// LOCATION HELPERS
// ============================================================================

String _locationMessage(AppLocalizations l10n, Object? error) {
  if (error is! LocationException) {
    return l10n.locationUnavailable;
  }

  return switch (error.failure) {
    LocationFailure.serviceDisabled => l10n.locationServiceDisabled,

    LocationFailure.permissionDenied => l10n.locationPermissionDenied,

    LocationFailure.permanentlyDenied => l10n.locationPermanentlyDenied,

    LocationFailure.unavailable => l10n.locationUnavailable,
  };
}
