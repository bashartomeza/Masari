import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../application/merchant_controller.dart';
import '../data/merchant_models.dart';
import 'merchant_ui.dart';

class MerchantMatchDetailScreen extends ConsumerWidget {
  const MerchantMatchDetailScreen({required this.matchId, super.key});
  final String matchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final match = ref.watch(merchantMatchDetailProvider(matchId));
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
              key: const ValueKey('merchantMatchDetailTitle'),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            match.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => FilledButton(
                onPressed: () =>
                    ref.invalidate(merchantMatchDetailProvider(matchId)),
                child: Text(l10n.retry),
              ),
              data: (value) => _content(context, l10n, value),
            ),
          ],
        ),
      ),
    );
  }

  Widget _content(
    BuildContext context,
    AppLocalizations l10n,
    MerchantMatch match,
  ) {
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          merchantTechnicalText(match.id),
          Text(
            '${l10n.currentStatus}: ${merchantStatusLabel(l10n, match.status)}',
            key: const ValueKey('merchantMatchStatus'),
          ),
          Text('${l10n.pickup}: ${match.order.pickupLabel}'),
          Text('${l10n.destination}: ${match.route.destinationLabel}'),
          Text('${l10n.parcelCount}: ${match.order.parcelCount}'),
          Text('${l10n.matchScore}: ${merchantPercent(match.score)}'),
          Text(
            '${l10n.selectedRoute}: ${match.route.originLabel} → ${match.route.destinationLabel}',
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          Text(
            l10n.scoringBreakdown,
            key: const ValueKey('merchantScoringBreakdown'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text(
            '${l10n.corridorOverlap}: ${merchantPercent(match.breakdown.corridorOverlap)}',
          ),
          Text(
            '${l10n.pickupDistance}: ${merchantPercent(match.breakdown.pickupDistanceScore)}',
          ),
          Text(
            '${l10n.timingFit}: ${merchantPercent(match.breakdown.timingFit)}',
          ),
          Text(
            '${l10n.trustScore}: ${merchantPercent(match.breakdown.trustScore)}',
          ),
          Text(
            '${l10n.capacityFit}: ${merchantPercent(match.breakdown.capacityFit)}',
          ),
          Text('${l10n.matchExplanation}: ${l10n.routeMatchExplanation}'),
          if (match.batch != null) ...[
            const SizedBox(height: AppTokens.spaceMedium),
            Text('${l10n.parcelBatch}: ${match.batch!.id}'),
            Text(
              '${l10n.estimatedDistanceSaved}: ${match.batch!.estimatedDistanceSaved.toStringAsFixed(2)} km',
            ),
          ],
          const SizedBox(height: AppTokens.spaceLarge),
          Text(
            match.waitingForDriver
                ? l10n.waitingReadOnly
                : merchantStatusLabel(l10n, match.status),
            key: const ValueKey('merchantReadOnlyNotice'),
          ),
          OutlinedButton(
            onPressed: () => context.go('/merchant/order/${match.order.id}'),
            child: Text(l10n.orderDetails),
          ),
        ],
      ),
    );
  }
}
