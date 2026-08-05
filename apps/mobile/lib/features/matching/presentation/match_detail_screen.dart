import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/match_widgets.dart';
import '../../../core/widgets/state_views.dart';
import '../data/matching_repository.dart';

final matchDetailProvider = FutureProvider.autoDispose.family((ref, String id) {
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
      appBar: AppBar(
        title: Text(l10n.matchResult),
        actions: const [
          LanguageSwitch(),
          SizedBox(width: AppTokens.spaceSmall),
        ],
      ),
      body: SafeArea(
        top: false,
        bottom: false,
        child: detail.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => ErrorStateView(
            title: l10n.noCompatibleDriverFound,
            retryLabel: l10n.retry,
            onRetry: () => ref.invalidate(matchDetailProvider(matchId)),
          ),
          data: (match) => ListView(
            padding: const EdgeInsets.fromLTRB(
              AppTokens.marginMobile,
              AppTokens.spaceMedium,
              AppTokens.marginMobile,
              AppTokens.spaceExtraLarge,
            ),
            children: [
              MasariInfoCard(
                title: match.driverName,
                subtitle: l10n.selectedDriver,
                icon: Icons.person_outline,
                statusLabel: localizedMatchStatus(l10n, match.status),
                statusTone: statusToneFor(match.status),
                body: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: DetailRow(
                            label: l10n.selectedRoute,
                            value: match.routeLabel,
                            icon: Icons.route_outlined,
                          ),
                        ),
                        const SizedBox(width: AppTokens.gutterMobile),
                        MatchScore(score: match.score, label: l10n.matchScore),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppTokens.spaceLarge),

              MasariSection(
                title: l10n.scoringBreakdown,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ScoreBreakdownList(
                      factors: [
                        (
                          label: l10n.corridorOverlap,
                          value: match.breakdown.corridorOverlap,
                        ),
                        (
                          label: l10n.pickupDistance,
                          value: match.breakdown.pickupDistanceScore,
                        ),
                        (
                          label: l10n.timingFit,
                          value: match.breakdown.timingFit,
                        ),
                        (
                          label: l10n.trustScore,
                          value: match.breakdown.trustScore,
                        ),
                        (
                          label: l10n.capacityFit,
                          value: match.breakdown.capacityFit,
                        ),
                      ],
                    ),
                    ExplanationNote(message: l10n.routeMatchExplanation),
                  ],
                ),
              ),

              const SizedBox(height: AppTokens.spaceLarge),
              DefaultTextStyle.merge(
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppTheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
                child: Directionality(
                  textDirection: TextDirection.ltr,
                  child: SelectableText(match.id),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String localizedMatchStatus(AppLocalizations l10n, String status) =>
    switch (status) {
      'proposed' => l10n.statusProposed,
      'sent_to_driver' => l10n.statusSentToDriver,
      'accepted' => l10n.statusAccepted,
      'rejected' => l10n.statusRejected,
      'expired' => l10n.statusExpired,
      _ => status,
    };
