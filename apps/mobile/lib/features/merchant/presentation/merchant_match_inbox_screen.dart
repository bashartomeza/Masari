import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../application/merchant_controller.dart';
import 'merchant_ui.dart';

class MerchantMatchInboxScreen extends ConsumerWidget {
  const MerchantMatchInboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final matches = ref.watch(merchantMatchInboxProvider);
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () =>
              ref.read(merchantMatchInboxProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(AppTokens.spaceLarge),
            children: [
              const Align(
                alignment: AlignmentDirectional.centerEnd,
                child: LanguageSwitch(),
              ),
              Text(
                l10n.merchantMatchInbox,
                key: const ValueKey('merchantMatchInboxTitle'),
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              Text(l10n.waitingReadOnly),
              const SizedBox(height: AppTokens.spaceLarge),
              matches.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => FilledButton(
                  onPressed: () =>
                      ref.read(merchantMatchInboxProvider.notifier).refresh(),
                  child: Text(l10n.retry),
                ),
                data: (items) => items.isEmpty
                    ? Text(l10n.noAvailableMatches)
                    : Column(
                        children: items
                            .map(
                              (match) => Padding(
                                padding: const EdgeInsets.only(
                                  bottom: AppTokens.spaceMedium,
                                ),
                                child: MasariCard(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Text(
                                        '${l10n.currentStatus}: ${merchantStatusLabel(l10n, match.status)}',
                                      ),
                                      Text(
                                        '${l10n.parcelCount}: ${match.order.parcelCount}',
                                      ),
                                      Text(
                                        '${l10n.matchScore}: ${merchantPercent(match.score)}',
                                      ),
                                      OutlinedButton(
                                        key: ValueKey(
                                          'openMerchantMatch-${match.id}',
                                        ),
                                        onPressed: () => context.go(
                                          '/merchant/match/${match.id}',
                                        ),
                                        child: Text(l10n.viewDetails),
                                      ),
                                    ],
                                  ),
                                ),
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
