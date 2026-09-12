import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/core/widgets/status_chip.dart';
import 'package:masari_mobile/features/canonical_routes/domain/canonical_route_models.dart';
import 'package:masari_mobile/features/trips/data/trip_models.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/config/app_config.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/theme/semantic_colors.dart';
import '../../../core/presentation/localized_labels.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../../core/widgets/masari_map.dart';
import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/route_chip.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/timeline_tracker.dart';
import '../../checkpoints/application/checkpoint_controller.dart';
import '../../checkpoints/domain/checkpoint_models.dart';
import '../../security/presentation/session_status_banner.dart';
import '../application/driver_controller.dart';
import '../data/driver_models.dart';
import 'driver_ui.dart';

class DriverTripScreen extends ConsumerStatefulWidget {
  const DriverTripScreen({
    required this.tripId,
    this.showAppBar = true,
    super.key,
  });

  final String tripId;
  final bool showAppBar;

  @override
  ConsumerState<DriverTripScreen> createState() => _DriverTripScreenState();
}

class _DriverTripScreenState extends ConsumerState<DriverTripScreen>
    with WidgetsBindingObserver {
  String? _error;

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
      driverTripControllerProvider(widget.tripId).notifier,
    );

    if (state == AppLifecycleState.resumed) {
      controller.resumePolling();
    }

    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      controller.pausePolling();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tripState = ref.watch(
      driverTripControllerProvider(widget.tripId),
    );

    return Scaffold(
      appBar: widget.showAppBar
          ? AppBar(
              title: Text(l10n.driverTrip),
              actions: const [
                LanguageSwitch(),
                SizedBox(width: AppTokens.spaceSmall),
              ],
            )
          : null,
      body: SafeArea(
        top: false,
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () => ref
              .read(
                driverTripControllerProvider(widget.tripId).notifier,
              )
              .refresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppTokens.marginMobile,
              AppTokens.spaceMedium,
              AppTokens.marginMobile,
              AppTokens.spaceExtraLarge,
            ),
            children: [
              const SessionStatusBanner(),
              const SizedBox(height: AppTokens.spaceMedium),
              tripState.when(
                loading: () => const Column(
                  children: [
                    LoadingSkeleton.card(),
                    SizedBox(height: AppTokens.spaceMedium),
                    LoadingSkeleton.card(),
                  ],
                ),
                error: (error, _) => ErrorStateView(
                  title: driverErrorLabel(l10n, error),
                  retryLabel: l10n.retry,
                  onRetry: () => ref
                      .read(
                        driverTripControllerProvider(widget.tripId).notifier,
                      )
                      .refresh(),
                ),
                data: (state) => _tripContent(l10n, state),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tripContent(
    AppLocalizations l10n,
    DriverTripState state,
  ) {
    final trip = state.trip;
    final location = state.location;

    final demoFeaturesEnabled = ref
        .watch(appConfigProvider)
        .demoFeaturesEnabled;

    final checkpoints = ref.watch(checkpointsProvider);
    final checkpointSnapshot =
        checkpoints.value ?? CheckpointSnapshot.empty;

    final progress = location == null
        ? 0.0
        : ((location.sequence + 1) / 7).clamp(0.0, 1.0);

    final currentIndex = driverTripTimeline.indexOf(trip.status);
    final nextStatus = trip.nextStatus;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ============================================================
        // 1. BIG CURRENT STATUS
        // ============================================================
        _TripHeroCard(
          l10n: l10n,
          trip: trip,
          locationAvailable: location != null,
        ),

        if (_error != null) ...[
          const SizedBox(height: AppTokens.spaceMedium),
          OfflineBanner(
            message: _error!,
            tone: BannerTone.error,
          ),
        ],

        const SizedBox(height: AppTokens.spaceMedium),

        // ============================================================
        // 2. LARGE MAP
        // ============================================================
        _DriverMapSection(
          l10n: l10n,
          trip: trip,
          location: location,
          snapshot: checkpointSnapshot,
          checkpointsLoading: checkpoints.isLoading,
          checkpointsError: checkpoints.hasError,
        ),

        const SizedBox(height: AppTokens.spaceLarge),

        // ============================================================
        // 3. SIMPLE ROUTE SUMMARY
        // ============================================================
        _RouteSummaryCard(
          l10n: l10n,
          trip: trip,
          location: location,
        ),

        const SizedBox(height: AppTokens.spaceLarge),

        // ============================================================
        // 4. PASSENGER / PARCEL SUMMARY
        // ============================================================
        _AssignmentSummary(
          l10n: l10n,
          trip: trip,
        ),

        const SizedBox(height: AppTokens.spaceLarge),

        // ============================================================
        // 5. CHECKPOINTS
        // ============================================================
        MasariSection(
          title: l10n.checkpoints,
          child: _DriverCheckpointsPanel(
            l10n: l10n,
            state: checkpoints,
          ),
        ),

        const SizedBox(height: AppTokens.spaceLarge),

        // ============================================================
        // 6. TRIP STATUS
        // ============================================================
        MasariSection(
          title: l10n.statusTimeline,
          child: MasariCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TimelineTracker(
                  steps: [
                    for (final (index, status)
                        in driverTripTimeline.indexed)
                      TimelineStep(
                        title: driverStatusLabel(l10n, status),
                        state: switch (currentIndex.compareTo(index)) {
                          > 0 => TimelineStepState.completed,
                          0 => TimelineStepState.current,
                          _ => TimelineStepState.upcoming,
                        },
                      ),
                  ],
                ),
                if (nextStatus != null) ...[
                  const SizedBox(height: AppTokens.spaceLarge),
                  SizedBox(
                    height: 54,
                    child: FilledButton.icon(
                      key: ValueKey('tripAction-$nextStatus'),
                      onPressed:
                          state.actionInProgress ? null : _advance,
                      icon: const Icon(Icons.arrow_forward_rounded),
                      label: Text(
                        nextTripActionLabel(
                          l10n,
                          nextStatus,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),

        const SizedBox(height: AppTokens.spaceLarge),

        // ============================================================
        // 7. LOCATION / DEMO DETAILS
        // ============================================================
        MasariSection(
          title: demoFeaturesEnabled
              ? l10n.trackingSimulation
              : l10n.latestLocation,
          child: _LocationDetailsCard(
            l10n: l10n,
            state: state,
            progress: progress,
            demoFeaturesEnabled: demoFeaturesEnabled,
            onSimulate: _simulate,
            onReset: _reset,
          ),
        ),
      ],
    );
  }

  Future<void> _advance() => _action(
        () => ref
            .read(
              driverTripControllerProvider(widget.tripId).notifier,
            )
            .advanceStatus(),
      );

  Future<void> _simulate() => _action(
        () => ref
            .read(
              driverTripControllerProvider(widget.tripId).notifier,
            )
            .simulateStep(),
      );

  Future<void> _reset() => _action(
        () => ref
            .read(
              driverTripControllerProvider(widget.tripId).notifier,
            )
            .resetSimulation(),
      );

  Future<void> _action(
    Future<void> Function() action,
  ) async {
    setState(() => _error = null);

    try {
      await action();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = driverErrorLabel(
            AppLocalizations.of(context),
            error,
          ),
        );

        await ref
            .read(
              driverTripControllerProvider(widget.tripId).notifier,
            )
            .refresh();
      }
    }
  }
}

// ============================================================================
// HERO STATUS CARD
// ============================================================================

class _TripHeroCard extends StatelessWidget {
  const _TripHeroCard({
    required this.l10n,
    required this.trip,
    required this.locationAvailable,
  });

  final AppLocalizations l10n;
  final DriverTrip trip;
  final bool locationAvailable;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = driverStatusLabel(
      l10n,
      trip.status,
    );

    final tone = statusToneFor(trip.status);

    return MasariCard(
      child: Container(
        padding: const EdgeInsets.all(
          AppTokens.spaceMedium,
        ),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(
            AppTokens.radiusLarge,
          ),
          color: theme.colorScheme.surfaceContainerHighest
              .withValues(alpha: 0.55),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Icon(
                    Icons.local_shipping_rounded,
                    size: 31,
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
                const SizedBox(
                  width: AppTokens.spaceMedium,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.driverTrip,
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(
                        height: AppTokens.spaceExtraSmall,
                      ),
                      Text(
                        status,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                _StatusBadge(
                  label: status,
                  tone: tone,
                ),
              ],
            ),
            const SizedBox(
              height: AppTokens.spaceLarge,
            ),
            RouteChip(
              from: localizedOrigin(
                context,
                trip.route.originLabel,
              ),
              to: l10n.bethlehem,
              compact: false,
            ),
            const SizedBox(
              height: AppTokens.spaceMedium,
            ),
            Row(
              children: [
                Expanded(
                  child: _HeroMiniInfo(
                    icon: Icons.navigation_rounded,
                    title: locationAvailable
                        ? l10n.latestLocation
                        : l10n.noLocationYet,
                  ),
                ),
                const SizedBox(width: AppTokens.spaceSmall),
                Expanded(
                  child: _HeroMiniInfo(
                    icon: Icons.people_outline_rounded,
                    title: trip.passengerRequest == null
                        ? '0'
                        : '${trip.passengerRequest!.passengerCount}',
                  ),
                ),
                const SizedBox(width: AppTokens.spaceSmall),
                Expanded(
                  child: _HeroMiniInfo(
                    icon: Icons.inventory_2_outlined,
                    title: trip.merchantOrder == null
                        ? '0'
                        : '${trip.merchantOrder!.parcelCount}',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroMiniInfo extends StatelessWidget {
  const _HeroMiniInfo({
    required this.icon,
    required this.title,
  });

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.spaceSmall,
        vertical: AppTokens.spaceSmall,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(
          AppTokens.radiusDefault,
        ),
        border: Border.all(
          color: theme.colorScheme.outlineVariant,
        ),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            size: 21,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(
            width: AppTokens.spaceExtraSmall,
          ),
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
    required this.tone,
  });

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final color = switch (tone) {
      StatusTone.success => SemanticColors.success,
      StatusTone.warning => SemanticColors.warning,
      StatusTone.error => SemanticColors.error,
      _ => theme.colorScheme.primary,
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 11,
        vertical: 7,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// DRIVER MAP
// ============================================================================

class _DriverMapSection extends StatelessWidget {
  const _DriverMapSection({
    required this.l10n,
    required this.trip,
    required this.location,
    required this.snapshot,
    required this.checkpointsLoading,
    required this.checkpointsError,
  });

  final AppLocalizations l10n;
  final DriverTrip trip;
  final TripLocation? location;
  final CheckpointSnapshot snapshot;
  final bool checkpointsLoading;
  final bool checkpointsError;

  @override
  Widget build(BuildContext context) {
    final route = trip.route;

    final origin = GeoPoint(
      route.originLat,
      route.originLng,
    );

    final destination = GeoPoint(
      route.destinationLat,
      route.destinationLng,
    );

    final markers = <MasariMapMarker>[
      MasariMapMarker(
        position: origin,
        icon: Icons.trip_origin_rounded,
        color: SemanticColors.upcomingRoute,
        label: l10n.mapOriginLabel(
          localizedOrigin(
            context,
            route.originLabel,
          ),
        ),
        size: 38,
      ),

      MasariMapMarker(
        position: destination,
        icon: Icons.flag_rounded,
        color: SemanticColors.completedRoute,
        label: l10n.mapDestinationLabel(
          l10n.bethlehem,
        ),
        size: 38,
      ),

      if (location != null)
        MasariMapMarker(
          position: GeoPoint(
            location!.lat,
            location!.lng,
          ),
          icon: Icons.local_shipping_rounded,
          color: SemanticColors.passenger,
          label: l10n.mapYourLocation,
          size: 46,
        ),

      for (final checkpoint in snapshot.checkpoints)
        MasariMapMarker(
          position: checkpoint.position,
          icon: _checkpointIcon(checkpoint.status),
          color: _checkpointColor(checkpoint.status),
          foreground: checkpoint.status ==
                  CheckpointStatus.unknown
              ? AppTheme.onSurface
              : Colors.white,
          label: l10n.checkpointLabel(
            _checkpointName(
              l10n,
              checkpoint,
              Localizations.localeOf(context).languageCode == 'ar',
            ),
            _checkpointStatus(
              l10n,
              checkpoint.status,
            ),
          ),
          size: 32,
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MasariMap(
          height: 380,
          emptyLabel: l10n.mapRouteMissingCoordinates,
          attributionLabel: l10n.mapAttribution,
          paths: [
            MasariMapPath(
              points: [
                origin,
                destination,
              ],
              color: SemanticColors.upcomingRoute,
              width: 6,
            ),
          ],
          markers: markers,
          banner: checkpointsLoading
              ? _MapNotice(
                  icon: Icons.sync_rounded,
                  message: l10n.checkpointsUnavailable,
                )
              : checkpointsError
                  ? _MapNotice(
                      icon: Icons.warning_amber_rounded,
                      message: l10n.checkpointsUnavailable,
                    )
                  : null,
          overlay: _MapLegend(
            l10n: l10n,
            hasDriverLocation: location != null,
          ),
        ),
        const SizedBox(
          height: AppTokens.spaceSmall,
        ),
        Row(
          children: [
            Icon(
              Icons.touch_app_outlined,
              size: 18,
              color: Theme.of(context)
                  .colorScheme
                  .onSurfaceVariant,
            ),
            const SizedBox(
              width: AppTokens.spaceExtraSmall,
            ),
            Expanded(
              child: Text(
                'اضغط على أي علامة لمعرفة تفاصيلها',
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
      ],
    );
  }
}

class _MapLegend extends StatelessWidget {
  const _MapLegend({
    required this.l10n,
    required this.hasDriverLocation,
  });

  final AppLocalizations l10n;
  final bool hasDriverLocation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surface.withValues(
        alpha: 0.94,
      ),
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 9,
        ),
        child: Wrap(
          spacing: 13,
          runSpacing: 7,
          children: [
            if (hasDriverLocation)
              _LegendItem(
                icon: Icons.local_shipping_rounded,
                color: SemanticColors.passenger,
                label: l10n.mapYourLocation,
              ),
            _LegendItem(
              icon: Icons.trip_origin_rounded,
              color: SemanticColors.upcomingRoute,
              label: 'البداية',
            ),
            _LegendItem(
              icon: Icons.flag_rounded,
              color: SemanticColors.completedRoute,
              label: 'الوصول',
            ),
            _LegendItem(
              icon: Icons.block_rounded,
              color: SemanticColors.error,
              label: l10n.checkpointClosed,
            ),
          ],
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  const _LegendItem({
    required this.icon,
    required this.color,
    required this.label,
  });

  final IconData icon;
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 16,
          color: color,
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context)
              .textTheme
              .labelSmall
              ?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
      ],
    );
  }
}

class _MapNotice extends StatelessWidget {
  const _MapNotice({
    required this.icon,
    required this.message,
  });

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surface.withValues(
        alpha: 0.94,
      ),
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: 13,
          vertical: 9,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 7),
            Flexible(
              child: Text(
                message,
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// ROUTE SUMMARY
// ============================================================================

class _RouteSummaryCard extends StatelessWidget {
  const _RouteSummaryCard({
    required this.l10n,
    required this.trip,
    required this.location,
  });

  final AppLocalizations l10n;
  final DriverTrip trip;
  final TripLocation? location;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'مسار الرحلة',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(
            height: AppTokens.spaceMedium,
          ),
          _RoutePoint(
            icon: Icons.trip_origin_rounded,
            color: SemanticColors.upcomingRoute,
            title: 'من',
            value: localizedOrigin(
              context,
              trip.route.originLabel,
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.only(
              start: 12,
            ),
            child: Container(
              width: 2,
              height: 25,
              color: theme.colorScheme.outlineVariant,
            ),
          ),
          _RoutePoint(
            icon: Icons.flag_rounded,
            color: SemanticColors.completedRoute,
            title: 'إلى',
            value: l10n.bethlehem,
          ),
          if (location != null) ...[
            const SizedBox(
              height: AppTokens.spaceMedium,
            ),
            Container(
              padding: const EdgeInsets.all(
                AppTokens.spaceSmall,
              ),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer
                    .withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(
                  AppTokens.radiusDefault,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.my_location_rounded,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(
                    width: AppTokens.spaceSmall,
                  ),
                  Expanded(
                    child: Text(
                      'آخر موقع مسجل للسائق متوفر',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _RoutePoint extends StatelessWidget {
  const _RoutePoint({
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
          width: 27,
          height: 27,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.14),
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            size: 17,
            color: color,
          ),
        ),
        const SizedBox(
          width: AppTokens.spaceSmall,
        ),
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
// ASSIGNMENT SUMMARY
// ============================================================================

class _AssignmentSummary extends StatelessWidget {
  const _AssignmentSummary({
    required this.l10n,
    required this.trip,
  });

  final AppLocalizations l10n;
  final DriverTrip trip;

  @override
  Widget build(BuildContext context) {
    return MasariSection(
      title: 'تفاصيل الحمولة',
      child: Row(
        children: [
          if (trip.passengerRequest != null)
            Expanded(
              child: _LargeMetricCard(
                icon: Icons.people_alt_rounded,
                value:
                    '${trip.passengerRequest!.passengerCount}',
                label: l10n.passengerCount,
              ),
            ),
          if (trip.passengerRequest != null &&
              trip.merchantOrder != null)
            const SizedBox(
              width: AppTokens.spaceSmall,
            ),
          if (trip.merchantOrder != null)
            Expanded(
              child: _LargeMetricCard(
                icon: Icons.inventory_2_rounded,
                value:
                    '${trip.merchantOrder!.parcelCount}',
                label: l10n.parcelCount,
              ),
            ),
          if (trip.passengerRequest == null &&
              trip.merchantOrder == null)
            Expanded(
              child: _LargeMetricCard(
                icon: Icons.local_shipping_rounded,
                value: '—',
                label: l10n.activeTrip,
              ),
            ),
        ],
      ),
    );
  }
}

class _LargeMetricCard extends StatelessWidget {
  const _LargeMetricCard({
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

    return MasariCard(
      child: Column(
        children: [
          Icon(
            icon,
            size: 30,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(
            height: AppTokens.spaceSmall,
          ),
          Text(
            value,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(
            height: AppTokens.spaceExtraSmall,
          ),
          Text(
            label,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
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
// CHECKPOINTS
// ============================================================================

class _DriverCheckpointsPanel extends StatelessWidget {
  const _DriverCheckpointsPanel({
    required this.l10n,
    required this.state,
  });

  final AppLocalizations l10n;
  final AsyncValue<CheckpointSnapshot> state;

  @override
  Widget build(BuildContext context) {
    final arabic =
        Localizations.localeOf(context).languageCode == 'ar';

    return state.when(
      loading: () => const LoadingSkeleton.card(),
      error: (_, _) => MasariInfoCard(
        title: l10n.checkpointsUnavailable,
        subtitle: l10n.checkpointsUnavailableBody,
        icon: Icons.warning_amber_rounded,
      ),
      data: (snapshot) {
        if (snapshot.checkpoints.isEmpty) {
          return MasariInfoCard(
            title: l10n.checkpointsEmpty,
            subtitle: l10n.checkpointCount(0),
            icon: Icons.check_circle_outline_rounded,
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _CheckpointSummary(
              l10n: l10n,
              checkpoints: snapshot.checkpoints,
            ),
            const SizedBox(
              height: AppTokens.spaceMedium,
            ),
            for (final checkpoint in snapshot.checkpoints) ...[
              _CheckpointCard(
                l10n: l10n,
                checkpoint: checkpoint,
                arabic: arabic,
              ),
              const SizedBox(
                height: AppTokens.spaceSmall,
              ),
            ],
            if (snapshot.stale)
              Padding(
                padding: const EdgeInsets.only(
                  top: AppTokens.spaceSmall,
                ),
                child: OfflineBanner(
                  message: l10n.checkpointsStale,
                ),
              ),
          ],
        );
      },
    );
  }
}

class _CheckpointSummary extends StatelessWidget {
  const _CheckpointSummary({
    required this.l10n,
    required this.checkpoints,
  });

  final AppLocalizations l10n;
  final List<Checkpoint> checkpoints;

  @override
  Widget build(BuildContext context) {
    final open = checkpoints
        .where(
          (checkpoint) =>
              checkpoint.status == CheckpointStatus.open,
        )
        .length;

    final congested = checkpoints
        .where(
          (checkpoint) =>
              checkpoint.status ==
              CheckpointStatus.congested,
        )
        .length;

    final closed = checkpoints
        .where(
          (checkpoint) =>
              checkpoint.status ==
              CheckpointStatus.closed,
        )
        .length;

    return Row(
      children: [
        Expanded(
          child: _CheckpointCount(
            icon: Icons.check_circle_rounded,
            color: SemanticColors.success,
            value: open,
            label: l10n.checkpointOpen,
          ),
        ),
        const SizedBox(width: AppTokens.spaceSmall),
        Expanded(
          child: _CheckpointCount(
            icon: Icons.hourglass_bottom_rounded,
            color: SemanticColors.warning,
            value: congested,
            label: l10n.checkpointCongested,
          ),
        ),
        const SizedBox(width: AppTokens.spaceSmall),
        Expanded(
          child: _CheckpointCount(
            icon: Icons.block_rounded,
            color: SemanticColors.error,
            value: closed,
            label: l10n.checkpointClosed,
          ),
        ),
      ],
    );
  }
}

class _CheckpointCount extends StatelessWidget {
  const _CheckpointCount({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final Color color;
  final int value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(
        vertical: AppTokens.spaceSmall,
        horizontal: 6,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(
          AppTokens.radiusDefault,
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: color,
            size: 22,
          ),
          const SizedBox(height: 3),
          Text(
            '$value',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckpointCard extends StatelessWidget {
  const _CheckpointCard({
    required this.l10n,
    required this.checkpoint,
    required this.arabic,
  });

  final AppLocalizations l10n;
  final Checkpoint checkpoint;
  final bool arabic;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _checkpointColor(
      checkpoint.status,
    );

    final name = _checkpointName(
      l10n,
      checkpoint,
      arabic,
    );

    final status = _checkpointStatus(
      l10n,
      checkpoint.status,
    );

    return Container(
      padding: const EdgeInsets.all(
        AppTokens.spaceMedium,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(
          AppTokens.radiusDefault,
        ),
        border: Border.all(
          color: theme.colorScheme.outlineVariant,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.13),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _checkpointIcon(checkpoint.status),
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(
            width: AppTokens.spaceMedium,
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(
                  height: AppTokens.spaceExtraSmall,
                ),
                Text(
                  status,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// LOCATION DETAILS
// ============================================================================

class _LocationDetailsCard extends StatelessWidget {
  const _LocationDetailsCard({
    required this.l10n,
    required this.state,
    required this.progress,
    required this.demoFeaturesEnabled,
    required this.onSimulate,
    required this.onReset,
  });

  final AppLocalizations l10n;
  final DriverTripState state;
  final double progress;
  final bool demoFeaturesEnabled;
  final VoidCallback onSimulate;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final location = state.location;
    final theme = Theme.of(context);

    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (demoFeaturesEnabled) ...[
            Row(
              children: [
                Icon(
                  Icons.route_rounded,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(
                  width: AppTokens.spaceSmall,
                ),
                Expanded(
                  child: Text(
                    l10n.routeProgress,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Text(
                  '${(progress * 100).round()}%',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(
              height: AppTokens.spaceSmall,
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: LinearProgressIndicator(
                key: const ValueKey('routeProgress'),
                value: progress,
                minHeight: 9,
              ),
            ),
            const SizedBox(
              height: AppTokens.spaceLarge,
            ),
          ],
          if (location == null)
            Container(
              padding: const EdgeInsets.all(
                AppTokens.spaceMedium,
              ),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(
                  AppTokens.radiusDefault,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.location_searching_rounded,
                    color: theme.colorScheme.onSurfaceVariant,
                    size: 27,
                  ),
                  const SizedBox(
                    width: AppTokens.spaceSmall,
                  ),
                  Expanded(
                    child: Text(
                      l10n.noLocationYet,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            )
          else ...[
            Text(
              'آخر موقع مسجل',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(
              height: AppTokens.spaceSmall,
            ),
            DetailRow(
              label: l10n.latitude,
              value: '${location.lat}',
              icon: Icons.vertical_align_center_rounded,
            ),
            DetailRow(
              label: l10n.longitude,
              value: '${location.lng}',
              icon: Icons.horizontal_distribute_rounded,
            ),
            DetailRow(
              label: l10n.sequence,
              value: '${location.sequence}',
              icon: Icons.format_list_numbered_rounded,
            ),
            DetailRow(
              label: l10n.source,
              value: localizedLocationSource(
                l10n,
                location.source,
              ),
              icon: Icons.sensors_rounded,
            ),
            DetailRow(
              label: l10n.recordedTime,
              value: _formatTime(
                context,
                location.recordedAt,
              ),
              icon: Icons.access_time_rounded,
            ),
          ],
          if (demoFeaturesEnabled) ...[
            const SizedBox(
              height: AppTokens.spaceLarge,
            ),
            SizedBox(
              height: 52,
              child: FilledButton.icon(
                key: const ValueKey(
                  'simulateStepButton',
                ),
                onPressed:
                    state.actionInProgress ? null : onSimulate,
                icon: const Icon(
                  Icons.play_arrow_rounded,
                ),
                label: Text(
                  l10n.simulateNextPoint,
                ),
              ),
            ),
            const SizedBox(
              height: AppTokens.spaceSmall,
            ),
            SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                key: const ValueKey(
                  'resetSimulationButton',
                ),
                onPressed:
                    state.actionInProgress ? null : onReset,
                icon: const Icon(
                  Icons.restart_alt_rounded,
                ),
                label: Text(
                  l10n.resetSimulation,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatTime(
    BuildContext context,
    DateTime value,
  ) {
    final material = MaterialLocalizations.of(context);
    final local = value.toLocal();

    return '${material.formatCompactDate(local)} '
        '${material.formatTimeOfDay(
      TimeOfDay.fromDateTime(local),
    )}';
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
  final preferred = arabic
      ? checkpoint.nameAr
      : checkpoint.nameEn;

  return preferred ??
      checkpoint.nameEn ??
      checkpoint.nameAr ??
      l10n.checkpointUnnamed;
}

String _checkpointStatus(
  AppLocalizations l10n,
  CheckpointStatus status,
) =>
    switch (status) {
      CheckpointStatus.open => l10n.checkpointOpen,
      CheckpointStatus.congested =>
        l10n.checkpointCongested,
      CheckpointStatus.closed => l10n.checkpointClosed,
      CheckpointStatus.unknown =>
        l10n.checkpointUnknown,
    };

IconData _checkpointIcon(
  CheckpointStatus status,
) =>
    switch (status) {
      CheckpointStatus.open => Icons.check_rounded,
      CheckpointStatus.congested =>
        Icons.hourglass_bottom_rounded,
      CheckpointStatus.closed => Icons.block_rounded,
      CheckpointStatus.unknown =>
        Icons.question_mark_rounded,
    };

Color _checkpointColor(
  CheckpointStatus status,
) =>
    switch (status) {
      CheckpointStatus.open => SemanticColors.success,
      CheckpointStatus.congested => SemanticColors.warning,
      CheckpointStatus.closed => SemanticColors.error,
      CheckpointStatus.unknown =>
        SemanticColors.pendingContainer,
    };