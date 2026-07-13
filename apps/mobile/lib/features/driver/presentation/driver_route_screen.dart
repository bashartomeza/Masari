import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../application/driver_controller.dart';
import '../data/driver_models.dart';
import 'driver_ui.dart';

class DriverRouteScreen extends ConsumerStatefulWidget {
  const DriverRouteScreen({super.key});
  @override
  ConsumerState<DriverRouteScreen> createState() => _DriverRouteScreenState();
}

class _DriverRouteScreenState extends ConsumerState<DriverRouteScreen> {
  int _seats = 2;
  int _parcels = 5;
  bool _busy = false;
  String? _message;
  bool _messageIsError = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final routeState = ref.watch(driverRouteControllerProvider);
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
              l10n.routeDetails,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            routeState.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => FilledButton(
                onPressed: () =>
                    ref.read(driverRouteControllerProvider.notifier).refresh(),
                child: Text(l10n.retry),
              ),
              data: (state) {
                final route = state.currentRoute;
                return MasariCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${l10n.origin}: ${localizedOrigin(context, route?.originLabel ?? lockedDriverOriginLabel)}',
                      ),
                      Text('${l10n.destination}: ${l10n.bethlehem}'),
                      Text(
                        '${l10n.lockedCorridorLabel}: ${l10n.lockedCorridor}',
                      ),
                      const SizedBox(height: AppTokens.spaceMedium),
                      if (route == null) ...[
                        DropdownButtonFormField<int>(
                          key: const ValueKey('driverSeatsField'),
                          initialValue: _seats,
                          decoration: InputDecoration(
                            labelText: l10n.seatsAvailable,
                          ),
                          items: List.generate(9, (index) => index)
                              .map(
                                (value) => DropdownMenuItem(
                                  value: value,
                                  child: Text('$value'),
                                ),
                              )
                              .toList(),
                          onChanged: _busy
                              ? null
                              : (value) => setState(() => _seats = value ?? 2),
                        ),
                        DropdownButtonFormField<int>(
                          key: const ValueKey('driverParcelField'),
                          initialValue: _parcels,
                          decoration: InputDecoration(
                            labelText: l10n.parcelCapacity,
                          ),
                          items: List.generate(21, (index) => index)
                              .map(
                                (value) => DropdownMenuItem(
                                  value: value,
                                  child: Text('$value'),
                                ),
                              )
                              .toList(),
                          onChanged: _busy
                              ? null
                              : (value) =>
                                    setState(() => _parcels = value ?? 5),
                        ),
                        const SizedBox(height: AppTokens.spaceMedium),
                        FilledButton(
                          key: const ValueKey('activateRouteButton'),
                          onPressed: _busy ? null : _create,
                          child: Text(l10n.activateRoute),
                        ),
                      ] else ...[
                        technicalText(route.id, selectable: true),
                        Text('${l10n.seatsAvailable}: ${route.seatsAvailable}'),
                        Text(
                          '${l10n.parcelCapacity}: ${route.parcelCapacityAvailable}',
                        ),
                        Text(
                          '${l10n.routeStatus}: ${driverStatusLabel(l10n, route.status)}',
                        ),
                        if (route.activatedAt != null)
                          Text('${l10n.activationTime}: ${route.activatedAt}'),
                        if (route.canDeactivate) ...[
                          const SizedBox(height: AppTokens.spaceMedium),
                          OutlinedButton(
                            key: const ValueKey('deactivateRouteButton'),
                            onPressed: _busy
                                ? null
                                : () => _deactivate(route.id),
                            child: Text(l10n.deactivateRoute),
                          ),
                        ],
                      ],
                      if (_message != null) ...[
                        const SizedBox(height: AppTokens.spaceMedium),
                        Text(
                          _message!,
                          key: const ValueKey('driverRouteMessage'),
                          style: _messageIsError
                              ? TextStyle(
                                  color: Theme.of(context).colorScheme.error,
                                )
                              : null,
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await ref
          .read(driverRouteControllerProvider.notifier)
          .create(seatsAvailable: _seats, parcelCapacityAvailable: _parcels);
      _show(l10n.routeActivated, false);
    } catch (error) {
      _show(driverErrorLabel(l10n, error), true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deactivate(String id) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await ref.read(driverRouteControllerProvider.notifier).deactivate(id);
      _show(l10n.routeDeactivated, false);
    } catch (error) {
      _show(driverErrorLabel(l10n, error), true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _show(String message, bool isError) {
    if (!mounted) return;
    setState(() {
      _message = message;
      _messageIsError = isError;
    });
  }
}
