
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/location/location_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/theme/semantic_colors.dart';
import '../../../core/widgets/masari_map.dart';
import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/state_views.dart';
import '../../canonical_routes/domain/canonical_route_models.dart';
import '../../checkpoints/application/checkpoint_controller.dart';
import '../../checkpoints/domain/checkpoint_models.dart';
import '../application/passenger_map_controller.dart';

/// The passenger's "Map" tab.
///
/// The map and checkpoints are always visible to the passenger,
/// regardless of whether the passenger is currently active.
///
/// Optional layers such as the passenger location, requested route,
/// and travel leg are displayed when their data is available.
///
/// Each layer fails independently:
/// - Location failure does not hide the map.
/// - Route without coordinates does not hide the map.
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
      appBar: AppBar(
        title: Text(l10n.navMapAlerts),
      ),
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
        // We no longer use mapsAvailable to replace it with UnavailableTab.
        data: (data) => _MapBody(view: data),
      ),
    );
  }
}

class _MapBody extends ConsumerWidget {
  const _MapBody({
    required this.view,
  });

  final PassengerMapView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);

    final position = ref.watch(currentPositionProvider);

    // IMPORTANT:
    // Checkpoints are ALWAYS requested.
    // We no longer depend on view.checkpointsAvailable.
    final checkpoints = ref.watch(checkpointsProvider);

    final snapshot =
        checkpoints.value ?? CheckpointSnapshot.empty;

    final route = view.route;

    final localeName =
        Localizations.localeOf(context).languageCode == 'ar';

    String stopName(CanonicalStop stop) {
      return localeName ? stop.nameAr : stop.nameEn;
    }

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(passengerMapViewProvider);

        // Always refresh checkpoints.
        await ref.read(checkpointsProvider.notifier).refresh();
      },
      child: ListView(
        padding: const EdgeInsets.all(AppTokens.spaceMedium),
        children: [
          MasariMap(
            height: 320,

            // The map itself remains visible even when there is
            // no route or no coordinates.
            emptyLabel: route == null
                ? l10n.mapSelectRoute
                : l10n.mapRouteMissingCoordinates,

            attributionLabel: l10n.mapAttribution,

            banner: snapshot.stale
                ? OfflineBanner(
                    message: l10n.checkpointsStale,
                  )
                : null,

            paths: [
              // Full requested route.
              if (view.hasDrawableRoute)
                MasariMapPath(
                  points: route!.path,
                  color: SemanticColors.upcomingRoute,
                  width: 4,
                  dashed: true,
                ),

              // Passenger's own leg.
              if (view.leg.length >= 2)
                MasariMapPath(
                  points: view.leg,
                  color: SemanticColors.activeRoute,
                  width: 6,
                ),
            ],

            markers: [
              // Passenger's current location.
              if (position.value != null)
                MasariMapMarker(
                  position: position.value!,
                  icon: Icons.my_location,
                  color: SemanticColors.passenger,
                  label: l10n.mapYourLocation,
                ),

              // Route stops.
              if (route != null)
                for (final stop in route.stops)
                  if (stop.position != null)
                    _stopMarker(
                      l10n,
                      stop,
                      stopName(stop),
                      route,
                    ),

              // IMPORTANT:
              // Checkpoints are always drawn on the map.
              for (final checkpoint in snapshot.checkpoints)
                MasariMapMarker(
                  position: checkpoint.position,
                  icon: _checkpointIcon(checkpoint.status),
                  color: _checkpointColor(checkpoint.status),
                  foreground:
                      checkpoint.status == CheckpointStatus.unknown
                          ? AppTheme.onSurface
                          : Colors.white,
                  label: l10n.checkpointLabel(
                    _checkpointName(
                      l10n,
                      checkpoint,
                      localeName,
                    ),
                    _checkpointStatus(
                      l10n,
                      checkpoint.status,
                    ),
                  ),
                  size: 30,
                ),
            ],
          ),

          const SizedBox(
            height: AppTokens.spaceMedium,
          ),

          // Location warning.
          // Does NOT hide the map.
          if (position.hasError)
            _Notice(
              icon: Icons.location_disabled_outlined,
              message: _locationMessage(
                l10n,
                position.error,
              ),
              actionLabel: l10n.locationEnable,
              onAction: () => ref
                  .read(currentPositionProvider.notifier)
                  .refresh(),
            ),

          // Route warning.
          // Does NOT hide the map.
          if (route != null && !view.hasDrawableRoute)
            _Notice(
              icon: Icons.wrong_location_outlined,
              message: l10n.mapRouteMissingCoordinates,
            ),

          // Checkpoints section.
          //
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
          ? Icons.trip_origin
          : isDestination
              ? Icons.flag
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

String _checkpointName(
  AppLocalizations l10n,
  Checkpoint checkpoint,
  bool arabic,
) {
  final preferred =
      arabic ? checkpoint.nameAr : checkpoint.nameEn;

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
      CheckpointStatus.open =>
        l10n.checkpointOpen,

      CheckpointStatus.congested =>
        l10n.checkpointCongested,

      CheckpointStatus.closed =>
        l10n.checkpointClosed,

      CheckpointStatus.unknown =>
        l10n.checkpointUnknown,
    };

IconData _checkpointIcon(
  CheckpointStatus status,
) =>
    switch (status) {
      CheckpointStatus.open =>
        Icons.check,

      CheckpointStatus.congested =>
        Icons.hourglass_bottom,

      CheckpointStatus.closed =>
        Icons.block,

      CheckpointStatus.unknown =>
        Icons.question_mark,
    };

Color _checkpointColor(
  CheckpointStatus status,
) =>
    switch (status) {
      CheckpointStatus.open =>
        SemanticColors.success,

      CheckpointStatus.congested =>
        SemanticColors.warning,

      CheckpointStatus.closed =>
        SemanticColors.error,

      // Grey, never green:
      // an unconfirmed checkpoint must not read as passable.
      CheckpointStatus.unknown =>
        SemanticColors.pendingContainer,
    };

String _locationMessage(
  AppLocalizations l10n,
  Object? error,
) {
  if (error is! LocationException) {
    return l10n.locationUnavailable;
  }

  return switch (error.failure) {
    LocationFailure.serviceDisabled =>
      l10n.locationServiceDisabled,

    LocationFailure.permissionDenied =>
      l10n.locationPermissionDenied,

    LocationFailure.permanentlyDenied =>
      l10n.locationPermanentlyDenied,

    LocationFailure.unavailable =>
      l10n.locationUnavailable,
  };
}

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
  Widget build(
    BuildContext context,
    WidgetRef ref,
  ) {
    final l10n = AppLocalizations.of(context);

    // Kept for compatibility with the existing widget API.
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
        onRetry: () => ref
            .read(checkpointsProvider.notifier)
            .refresh(),
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
          crossAxisAlignment:
              CrossAxisAlignment.stretch,
          children: [
            for (final checkpoint in snapshot.checkpoints)
              Padding(
                padding: const EdgeInsets.only(
                  bottom: AppTokens.spaceSmall,
                ),
                child: _CheckpointRow(
                  name: _checkpointName(
                    l10n,
                    checkpoint,
                    arabic,
                  ),
                  status: _checkpointStatus(
                    l10n,
                    checkpoint.status,
                  ),
                  color: _checkpointColor(
                    checkpoint.status,
                  ),
                  icon: _checkpointIcon(
                    checkpoint.status,
                  ),
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
      padding: const EdgeInsets.all(
        AppTokens.gutterMobile,
      ),
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainerLowest,
        border: Border.all(
          color: AppTheme.outlineVariant,
        ),
        borderRadius: BorderRadius.circular(
          AppTokens.radiusMedium,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 18,
              color: Colors.white,
            ),
          ),

          const SizedBox(
            width: AppTokens.gutterMobile,
          ),

          Expanded(
            child: Text(
              name,
              style: theme.textTheme.titleSmall,
            ),
          ),

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
      margin: const EdgeInsets.only(
        bottom: AppTokens.spaceMedium,
      ),
      padding: const EdgeInsets.all(
        AppTokens.gutterMobile,
      ),
      decoration: BoxDecoration(
        color: SemanticColors.warningContainer,
        borderRadius: BorderRadius.circular(
          AppTokens.radiusMedium,
        ),
      ),
      child: Row(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 20,
            color:
                SemanticColors.onWarningContainer,
          ),

          const SizedBox(
            width: AppTokens.spaceSmall,
          ),

          Expanded(
            child: Text(
              message,
              style: theme.textTheme.bodySmall?.copyWith(
                color:
                    SemanticColors.onWarningContainer,
              ),
            ),
          ),

          if (actionLabel != null &&
              onAction != null)
            TextButton(
              onPressed: onAction,
              child: Text(actionLabel!),
            ),
        ],
      ),
    );
  }
}