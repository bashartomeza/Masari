import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../application/passenger_trip_controller.dart';

class PassengerTripScreen extends ConsumerStatefulWidget {
  const PassengerTripScreen({required this.tripId, super.key});
  final String tripId;
  @override
  ConsumerState<PassengerTripScreen> createState() =>
      _PassengerTripScreenState();
}

class _PassengerTripScreenState extends ConsumerState<PassengerTripScreen>
    with WidgetsBindingObserver {
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(passengerTripControllerProvider(widget.tripId));
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
              l10n.passengerTrip,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            state.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => FilledButton(
                onPressed: () => ref
                    .read(
                      passengerTripControllerProvider(widget.tripId).notifier,
                    )
                    .refresh(),
                child: Text(l10n.retry),
              ),
              data: (data) => MasariCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Directionality(
                      textDirection: TextDirection.ltr,
                      child: SelectableText(data.trip.id),
                    ),
                    Text(
                      '${l10n.currentStatus}: ${_statusLabel(l10n, data.trip.status)}',
                    ),
                    Text('${l10n.selectedRoute}: ${data.trip.routeLabel}'),
                    const SizedBox(height: AppTokens.spaceMedium),
                    Text(
                      l10n.latestLocation,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    if (data.location == null)
                      Text(l10n.noLocationYet)
                    else ...[
                      if (data.locationIsStale) Text(l10n.locationIsStale),
                      Directionality(
                        textDirection: TextDirection.ltr,
                        child: Text('${l10n.latitude}: ${data.location!.lat}'),
                      ),
                      Directionality(
                        textDirection: TextDirection.ltr,
                        child: Text('${l10n.longitude}: ${data.location!.lng}'),
                      ),
                      Text('${l10n.sequence}: ${data.location!.sequence}'),
                      Text('${l10n.source}: ${data.location!.source}'),
                      Text(
                        '${l10n.recordedTime}: ${data.location!.recordedAt}',
                      ),
                    ],
                    const SizedBox(height: AppTokens.spaceMedium),
                    FilledButton(
                      onPressed: () => ref
                          .read(
                            passengerTripControllerProvider(
                              widget.tripId,
                            ).notifier,
                          )
                          .refresh(),
                      child: Text(l10n.refresh),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _statusLabel(AppLocalizations l10n, String status) => switch (status) {
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
