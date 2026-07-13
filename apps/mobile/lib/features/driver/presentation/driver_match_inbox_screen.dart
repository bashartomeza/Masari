import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../application/driver_controller.dart';
import '../data/driver_models.dart';
import 'driver_ui.dart';

class DriverMatchInboxScreen extends ConsumerStatefulWidget {
  const DriverMatchInboxScreen({super.key});
  @override
  ConsumerState<DriverMatchInboxScreen> createState() =>
      _DriverMatchInboxScreenState();
}

class _DriverMatchInboxScreenState
    extends ConsumerState<DriverMatchInboxScreen> {
  String? _status;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final inbox = ref.watch(driverMatchInboxProvider);
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref
              .read(driverMatchInboxProvider.notifier)
              .refresh(status: _status),
          child: ListView(
            padding: const EdgeInsets.all(AppTokens.spaceLarge),
            children: [
              const Align(
                alignment: AlignmentDirectional.centerEnd,
                child: LanguageSwitch(),
              ),
              Text(
                l10n.matchInbox,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: AppTokens.spaceMedium),
              SegmentedButton<String?>(
                segments: [
                  ButtonSegment(value: null, label: Text(l10n.allMatches)),
                  ButtonSegment(
                    value: 'proposed',
                    label: Text(l10n.proposedMatches),
                  ),
                ],
                selected: {_status},
                onSelectionChanged: (selection) {
                  setState(() => _status = selection.first);
                  ref
                      .read(driverMatchInboxProvider.notifier)
                      .refresh(status: _status);
                },
              ),
              const SizedBox(height: AppTokens.spaceLarge),
              inbox.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => MasariCard(
                  child: Column(
                    children: [
                      Text(driverErrorLabel(l10n, error)),
                      FilledButton(
                        onPressed: () => ref
                            .read(driverMatchInboxProvider.notifier)
                            .refresh(status: _status),
                        child: Text(l10n.retry),
                      ),
                    ],
                  ),
                ),
                data: (matches) => matches.isEmpty
                    ? MasariCard(
                        child: Column(
                          children: [
                            Text(l10n.noAvailableMatches),
                            FilledButton(
                              onPressed: () => ref
                                  .read(driverMatchInboxProvider.notifier)
                                  .refresh(status: _status),
                              child: Text(l10n.refresh),
                            ),
                          ],
                        ),
                      )
                    : Column(
                        children: matches
                            .map(
                              (match) => Padding(
                                padding: const EdgeInsets.only(
                                  bottom: AppTokens.spaceMedium,
                                ),
                                child: _MatchCard(match: match),
                              ),
                            )
                            .toList(),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MatchCard extends StatelessWidget {
  const _MatchCard({required this.match});
  final DriverMatch match;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            matchTypeLabel(l10n, match),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text('${l10n.pickup}: ${match.pickupLabel}'),
          Text('${l10n.destination}: ${match.destinationLabel}'),
          if (match.passengerRequest != null)
            Text(
              '${l10n.passengerCount}: ${match.passengerRequest!.passengerCount}',
            ),
          if (match.merchantOrder != null)
            Text('${l10n.parcelCount}: ${match.merchantOrder!.parcelCount}'),
          if (match.parcelBatch != null)
            Text(
              '${l10n.estimatedDistanceSaved}: ${match.parcelBatch!.estimatedDistanceSaved.toStringAsFixed(2)} km',
            ),
          Text('${l10n.matchScore}: ${percent(match.score)}'),
          Text(
            '${l10n.currentStatus}: ${driverStatusLabel(l10n, match.status)}',
          ),
          Text('${l10n.createdTime}: ${match.createdAt}'),
          const SizedBox(height: AppTokens.spaceSmall),
          Text(match.explanation, maxLines: 3, overflow: TextOverflow.ellipsis),
          const SizedBox(height: AppTokens.spaceMedium),
          FilledButton(
            key: ValueKey('openMatch-${match.id}'),
            onPressed: () => context.go('/driver/match/${match.id}'),
            child: Text(l10n.viewDetails),
          ),
        ],
      ),
    );
  }
}
