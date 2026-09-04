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
import '../../../core/widgets/unavailable_tab.dart';
import '../../canonical_routes/domain/canonical_route_models.dart';
import '../../checkpoints/application/checkpoint_controller.dart';
import '../../checkpoints/domain/checkpoint_models.dart';
import '../application/passenger_map_controller.dart';

/// The passenger's "Map" tab.
///
/// Draws the diagram the product asks for, in this order: the rider's own
/// position, the route they requested, the leg they travel on it, the barriers
/// along it, and the destination.
///
/// Each layer fails independently. A refused location permission, an empty
/// barrier feed and a route without coordinates each produce their own notice
/// while the layers that did load stay on screen — the map never silently drops
/// a layer, because a missing barrier reads as a clear road.
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
        data: (data) => data.mapsAvailable
            ? _MapBody(view: data)
            : UnavailableTab(
                key: const ValueKey('passengerMapAlertsTab'),
                appBarTitle: l10n.navMapAlerts,
                title: l10n.mapsUnavailable,
                message: l10n.mapsUnavailableBody,
                icon: Icons.map_outlined,
              ),
      ),
    );
  }
}

class _MapBody extends ConsumerWidget {
  const _MapBody({required this.view});

  final PassengerMapView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final position = ref.watch(currentPositionProvider);
    final checkpoints = view.checkpointsAvailable
        ? ref.watch(checkpointsProvider)
        : const AsyncData(CheckpointSnapshot.empty);
    final snapshot = checkpoints.value ?? CheckpointSnapshot.empty;
    final route = view.route;
    final localeName = Localizations.localeOf(context).languageCode == 'ar';

    String stopName(CanonicalStop stop) => localeName ? stop.nameAr : stop.nameEn;

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(passengerMapViewProvider);
        if (view.checkpointsAvailable) {
          await ref.read(checkpointsProvider.notifier).refresh();
        }
      },
      child: ListView(
        padding: const EdgeInsets.all(AppTokens.spaceMedium),
        children: [
          MasariMap(
            height: 320,
            emptyLabel: route == null
                ? l10n.mapSelectRoute
                : l10n.mapRouteMissingCoordinates,
            attributionLabel: l10n.mapAttribution,
            banner: snapshot.stale
                ? OfflineBanner(message: l10n.checkpointsStale)
                : null,
            paths: [
              if (view.hasDrawableRoute)
                MasariMapPath(
                  points: route!.path,
                  color: SemanticColors.upcomingRoute,
                  width: 4,
                  dashed: true,
                ),
              // The passenger's own leg sits on top of the full corridor so
              // they can tell their portion from the rest of the route.
              if (view.leg.length >= 2)
                MasariMapPath(
                  points: view.leg,
                  color: SemanticColors.activeRoute,
                  width: 6,
                ),
            ],
            markers: [
              if (position.value != null)
                MasariMapMarker(
                  position: position.value!,
                  icon: Icons.my_location,
                  color: SemanticColors.passenger,
                  label: l10n.mapYourLocation,
                ),
              if (route != null)
                for (final stop in route.stops)
                  if (stop.position != null)
                    _stopMarker(l10n, stop, stopName(stop), route),
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
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          if (position.hasError)
            _Notice(
              icon: Icons.location_disabled_outlined,
              message: _locationMessage(l10n, position.error),
              actionLabel: l10n.locationEnable,
              onAction: () => ref.read(currentPositionProvider.notifier).refresh(),
            ),
          if (route != null && !view.hasDrawableRoute)
            _Notice(
              icon: Icons.wrong_location_outlined,
              message: l10n.mapRouteMissingCoordinates,
            ),
          MasariSection(
            title: l10n.checkpoints,
            child: _CheckpointsPanel(
              available: view.checkpointsAvailable,
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
      color: isDestination ? SemanticColors.completedRoute : SemanticColors.parcel,
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
  final preferred = arabic ? checkpoint.nameAr : checkpoint.nameEn;
  return preferred ?? checkpoint.nameEn ?? checkpoint.nameAr ?? l10n.checkpointUnnamed;
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
  // Grey, never green: an unconfirmed barrier must not read as passable.
  CheckpointStatus.unknown => SemanticColors.pendingContainer,
};

String _locationMessage(AppLocalizations l10n, Object? error) {
  if (error is! LocationException) return l10n.locationUnavailable;
  return switch (error.failure) {
    LocationFailure.serviceDisabled => l10n.locationServiceDisabled,
    LocationFailure.permissionDenied => l10n.locationPermissionDenied,
    LocationFailure.permanentlyDenied => l10n.locationPermanentlyDenied,
    LocationFailure.unavailable => l10n.locationUnavailable,
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
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    if (!available) {
      return MasariInfoCard(
        title: l10n.checkpointsUnavailable,
        subtitle: l10n.checkpointsDisabled,
        icon: Icons.block_outlined,
      );
    }
    return state.when(
      loading: () => const LoadingSkeleton.card(),
      // A failed barrier fetch is stated, not hidden — the rest of the map
      // stays usable and the rider knows barriers are missing from it.
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
          Expanded(
            child: Text(name, style: theme.textTheme.titleSmall),
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
