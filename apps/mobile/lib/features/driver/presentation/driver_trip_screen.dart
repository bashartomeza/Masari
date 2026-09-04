import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/config/app_config.dart';
import '../../../core/presentation/localized_labels.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/route_chip.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/timeline_tracker.dart';
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

  /// False when the screen is embedded in the driver's "My trip" tab, which
  /// supplies its own app bar. The full-screen route keeps its own.
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
    if (state == AppLifecycleState.resumed) controller.resumePolling();
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      controller.pausePolling();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tripState = ref.watch(driverTripControllerProvider(widget.tripId));

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
              .read(driverTripControllerProvider(widget.tripId).notifier)
              .refresh(),
          child: ListView(
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

  Widget _tripContent(AppLocalizations l10n, DriverTripState state) {
    final demoFeaturesEnabled = ref
        .watch(appConfigProvider)
        .demoFeaturesEnabled;
    final trip = state.trip;
    final nextStatus = trip.nextStatus;
    final location = state.location;
    final progress = location == null
        ? 0.0
        : ((location.sequence + 1) / 7).clamp(0.0, 1.0);
    final currentIndex = driverTripTimeline.indexOf(trip.status);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // The assignment: what the driver is carrying and where. Titled by the
        // kind of load rather than repeating the screen's own name.
        MasariInfoCard(
          title: switch ((trip.passengerRequest, trip.merchantOrder)) {
            (null, null) => l10n.activeTrip,
            (_?, _?) => l10n.combinedAssignment,
            (_?, null) => l10n.passengerRequest,
            (null, _?) => l10n.merchantOrder,
          },
          icon: Icons.local_shipping_outlined,
          statusLabel: driverStatusLabel(l10n, trip.status),
          statusTone: statusToneFor(trip.status),
          emphasis: true,
          body: Column(
            children: [
              RouteChip(
                from: localizedOrigin(context, trip.route.originLabel),
                to: l10n.bethlehem,
                compact: true,
              ),
              const SizedBox(height: AppTokens.spaceSmall),
              if (trip.passengerRequest != null) ...[
                DetailRow(
                  label: l10n.pickup,
                  value: localizedCorridorPlace(
                    context,
                    trip.passengerRequest!.pickupLabel,
                  ),
                  icon: Icons.person_pin_circle_outlined,
                ),
                DetailRow(
                  label: l10n.passengerCount,
                  value: '${trip.passengerRequest!.passengerCount}',
                  icon: Icons.people_outline,
                ),
              ],
              if (trip.merchantOrder != null)
                DetailRow(
                  label: l10n.parcelCount,
                  value: '${trip.merchantOrder!.parcelCount}',
                  icon: Icons.inventory_2_outlined,
                ),
            ],
          ),
        ),

        if (_error != null) ...[
          const SizedBox(height: AppTokens.spaceMedium),
          OfflineBanner(message: _error!, tone: BannerTone.error),
        ],

        // The status ladder. Advancing is the screen's one job, so its button
        // sits directly under the tracker rather than buried in the card above.
        const SizedBox(height: AppTokens.spaceLarge),
        MasariSection(
          title: l10n.statusTimeline,
          child: MasariCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TimelineTracker(
                  steps: [
                    for (final (index, status) in driverTripTimeline.indexed)
                      TimelineStep(
                        title: driverStatusLabel(l10n, status),
                        state: switch (currentIndex.compareTo(index)) {
                          // A status the trip has moved past, the one it is on,
                          // and the ones still ahead. `compareTo` keeps the
                          // three cases exhaustive without index arithmetic.
                          > 0 => TimelineStepState.completed,
                          0 => TimelineStepState.current,
                          _ => TimelineStepState.upcoming,
                        },
                      ),
                  ],
                ),
                if (nextStatus != null) ...[
                  const SizedBox(height: AppTokens.spaceLarge),
                  FilledButton(
                    key: ValueKey('tripAction-$nextStatus'),
                    onPressed: state.actionInProgress ? null : _advance,
                    child: Text(nextTripActionLabel(l10n, nextStatus)),
                  ),
                ],
              ],
            ),
          ),
        ),

        const SizedBox(height: AppTokens.spaceLarge),
        MasariSection(
          title: demoFeaturesEnabled
              ? l10n.trackingSimulation
              : l10n.latestLocation,
          child: MasariCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (demoFeaturesEnabled) ...[
                  Text(
                    l10n.routeProgress,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: AppTokens.spaceExtraSmall),
                  LinearProgressIndicator(
                    key: const ValueKey('routeProgress'),
                    value: progress,
                  ),
                  const SizedBox(height: AppTokens.spaceMedium),
                ],
                if (location == null)
                  Text(
                    l10n.noLocationYet,
                    style: Theme.of(context).textTheme.bodyMedium,
                  )
                else ...[
                  // Coordinates are Latin numerals in an otherwise RTL column,
                  // so they keep their own left-to-right run.
                  DetailRow(
                    label: l10n.latitude,
                    value: '${location.lat}',
                    icon: Icons.my_location_outlined,
                  ),
                  DetailRow(label: l10n.longitude, value: '${location.lng}'),
                  DetailRow(
                    label: l10n.sequence,
                    value: '${location.sequence}',
                  ),
                  DetailRow(
                    label: l10n.source,
                    value: localizedLocationSource(l10n, location.source),
                  ),
                  DetailRow(
                    label: l10n.recordedTime,
                    value: _formatTime(context, location.recordedAt),
                  ),
                ],
                if (demoFeaturesEnabled) ...[
                  const SizedBox(height: AppTokens.spaceMedium),
                  FilledButton(
                    key: const ValueKey('simulateStepButton'),
                    onPressed: state.actionInProgress ? null : _simulate,
                    child: Text(l10n.simulateNextPoint),
                  ),
                  const SizedBox(height: AppTokens.spaceSmall),
                  OutlinedButton(
                    key: const ValueKey('resetSimulationButton'),
                    onPressed: state.actionInProgress ? null : _reset,
                    child: Text(l10n.resetSimulation),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _advance() => _action(
    () => ref
        .read(driverTripControllerProvider(widget.tripId).notifier)
        .advanceStatus(),
  );

  Future<void> _simulate() => _action(
    () => ref
        .read(driverTripControllerProvider(widget.tripId).notifier)
        .simulateStep(),
  );

  Future<void> _reset() => _action(
    () => ref
        .read(driverTripControllerProvider(widget.tripId).notifier)
        .resetSimulation(),
  );

  /// A short local date and time.
  ///
  /// The raw `DateTime.toString()` this replaced printed a UTC-style stamp with
  /// microseconds, which is not something a driver reads mid-trip.
  String _formatTime(BuildContext context, DateTime value) {
    final material = MaterialLocalizations.of(context);
    final local = value.toLocal();
    return '${material.formatCompactDate(local)} '
        '${material.formatTimeOfDay(TimeOfDay.fromDateTime(local))}';
  }

  Future<void> _action(Future<void> Function() action) async {
    setState(() => _error = null);
    try {
      await action();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = driverErrorLabel(AppLocalizations.of(context), error),
        );
        await ref
            .read(driverTripControllerProvider(widget.tripId).notifier)
            .refresh();
      }
    }
  }
}
