import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/config/app_config.dart';
import '../../../core/presentation/localized_labels.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../security/presentation/session_status_banner.dart';
import '../application/driver_controller.dart';
import '../data/driver_models.dart';
import 'driver_ui.dart';

class DriverTripScreen extends ConsumerStatefulWidget {
  const DriverTripScreen({required this.tripId, super.key});
  final String tripId;
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
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTokens.spaceLarge),
          children: [
            const Align(
              alignment: AlignmentDirectional.centerEnd,
              child: LanguageSwitch(),
            ),
            Text(
              l10n.driverTrip,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            const SessionStatusBanner(),
            const SizedBox(height: AppTokens.spaceMedium),
            tripState.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => FilledButton(
                onPressed: () => ref
                    .read(driverTripControllerProvider(widget.tripId).notifier)
                    .refresh(),
                child: Text(l10n.retry),
              ),
              data: (state) => _tripContent(l10n, state),
            ),
          ],
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
    return Column(
      children: [
        MasariCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              technicalText(trip.id, selectable: true),
              Text(
                '${l10n.currentStatus}: ${driverStatusLabel(l10n, trip.status)}',
              ),
              Text(
                '${l10n.selectedRoute}: ${localizedOrigin(context, trip.route.originLabel)} → ${l10n.bethlehem}',
              ),
              if (trip.passengerRequest != null) ...[
                Text(
                  '${l10n.passengerRequest}: ${trip.passengerRequest!.pickupLabel}',
                ),
                Text(
                  '${l10n.passengerCount}: ${trip.passengerRequest!.passengerCount}',
                ),
              ],
              if (trip.merchantOrder != null)
                Text(
                  '${l10n.merchantOrder}: ${trip.merchantOrder!.parcelCount} ${l10n.parcelCount}',
                ),
              const SizedBox(height: AppTokens.spaceMedium),
              Text(
                l10n.statusTimeline,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              ...driverTripTimeline.map((status) {
                final currentIndex = driverTripTimeline.indexOf(trip.status);
                final itemIndex = driverTripTimeline.indexOf(status);
                final reached = currentIndex >= itemIndex && currentIndex >= 0;
                return Row(
                  children: [
                    Icon(
                      reached ? Icons.check_circle : Icons.radio_button_off,
                      size: 20,
                    ),
                    const SizedBox(width: AppTokens.spaceSmall),
                    Text(driverStatusLabel(l10n, status)),
                  ],
                );
              }),
              if (_error != null) ...[
                const SizedBox(height: AppTokens.spaceMedium),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
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
        const SizedBox(height: AppTokens.spaceMedium),
        MasariCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                demoFeaturesEnabled
                    ? l10n.trackingSimulation
                    : l10n.latestLocation,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              if (demoFeaturesEnabled) Text(l10n.routeProgress),
              if (demoFeaturesEnabled)
                LinearProgressIndicator(
                  key: const ValueKey('routeProgress'),
                  value: progress,
                ),
              const SizedBox(height: AppTokens.spaceMedium),
              if (location == null)
                Text(l10n.noLocationYet)
              else ...[
                technicalText('${l10n.latitude}: ${location.lat}'),
                technicalText('${l10n.longitude}: ${location.lng}'),
                Text('${l10n.sequence}: ${location.sequence}'),
                Text(
                  '${l10n.source}: ${localizedLocationSource(l10n, location.source)}',
                ),
                Text('${l10n.recordedTime}: ${location.recordedAt}'),
              ],
              const SizedBox(height: AppTokens.spaceMedium),
              if (demoFeaturesEnabled)
                FilledButton(
                  key: const ValueKey('simulateStepButton'),
                  onPressed: state.actionInProgress ? null : _simulate,
                  child: Text(l10n.simulateNextPoint),
                ),
              if (demoFeaturesEnabled)
                OutlinedButton(
                  key: const ValueKey('resetSimulationButton'),
                  onPressed: state.actionInProgress ? null : _reset,
                  child: Text(l10n.resetSimulation),
                ),
            ],
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
