import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../data/matching_repository.dart';

final matchDetailProvider = FutureProvider.family((ref, String id) {
  return ref.watch(matchingRepositoryProvider).detail(id);
});

class MatchDetailScreen extends ConsumerWidget {
  const MatchDetailScreen({required this.matchId, super.key});
  final String matchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final detail = ref.watch(matchDetailProvider(matchId));
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
              l10n.matchResult,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            detail.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => Text(l10n.noCompatibleDriverFound),
              data: (match) => MasariCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Directionality(
                      textDirection: TextDirection.ltr,
                      child: SelectableText(match.id),
                    ),
                    Text('${l10n.selectedDriver}: ${match.driverName}'),
                    Text('${l10n.selectedRoute}: ${match.routeLabel}'),
                    Text('${l10n.matchScore}: ${_percent(match.score)}'),
                    Text(
                      '${l10n.currentStatus}: ${localizedMatchStatus(l10n, match.status)}',
                    ),
                    const SizedBox(height: AppTokens.spaceMedium),
                    Text(
                      l10n.scoringBreakdown,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text(
                      '${l10n.corridorOverlap}: ${_percent(match.breakdown.corridorOverlap)}',
                    ),
                    Text(
                      '${l10n.pickupDistance}: ${_percent(match.breakdown.pickupDistanceScore)}',
                    ),
                    Text(
                      '${l10n.timingFit}: ${_percent(match.breakdown.timingFit)}',
                    ),
                    Text(
                      '${l10n.trustScore}: ${_percent(match.breakdown.trustScore)}',
                    ),
                    Text(
                      '${l10n.capacityFit}: ${_percent(match.breakdown.capacityFit)}',
                    ),
                    const SizedBox(height: AppTokens.spaceMedium),
                    Text(
                      '${l10n.matchExplanation}: ${l10n.routeMatchExplanation}',
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

String _percent(double value) => '${(value * 100).toStringAsFixed(1)}%';

String localizedMatchStatus(AppLocalizations l10n, String status) =>
    switch (status) {
      'proposed' => l10n.statusProposed,
      'sent_to_driver' => l10n.statusSentToDriver,
      'accepted' => l10n.statusAccepted,
      'rejected' => l10n.statusRejected,
      'expired' => l10n.statusExpired,
      _ => status,
    };
