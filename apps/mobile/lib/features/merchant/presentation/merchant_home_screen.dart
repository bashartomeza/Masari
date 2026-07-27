import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../auth/application/auth_controller.dart';
import '../../canonical_routes/application/canonical_route_controller.dart';
import '../../security/presentation/security_actions.dart';
import '../../security/presentation/session_status_banner.dart';
import '../application/merchant_controller.dart';
import 'merchant_ui.dart';

class MerchantHomeScreen extends ConsumerWidget {
  const MerchantHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).value?.user;
    final dashboard = ref.watch(merchantDashboardProvider);
    final canonicalEntry =
        ref.watch(mobileCapabilitiesProvider).value?.multiRouteEntryAvailable ==
        true;
    final canonicalStatus =
        ref
            .watch(mobileCapabilitiesProvider)
            .value
            ?.canonicalAssignmentStatusAvailable ==
        true;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () =>
              ref.read(merchantDashboardProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(AppTokens.spaceLarge),
            children: [
              const Align(
                alignment: AlignmentDirectional.centerEnd,
                child: LanguageSwitch(),
              ),
              Text(
                l10n.appTitle,
                style: Theme.of(
                  context,
                ).textTheme.headlineLarge?.copyWith(color: AppTheme.deepGreen),
              ),
              Text(
                l10n.merchantDashboard,
                key: const ValueKey('merchantDashboardTitle'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppTokens.spaceLarge),
              MasariCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${l10n.currentUser}: ${user?.name ?? ''}'),
                    Text('${l10n.role}: ${l10n.merchant}'),
                    Text(l10n.lockedCorridor),
                  ],
                ),
              ),
              const SizedBox(height: AppTokens.spaceMedium),
              const SessionStatusBanner(),
              const SizedBox(height: AppTokens.spaceMedium),
              if (canonicalEntry) ...[
                MasariCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        l10n.canonicalRoutes,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(l10n.canonicalMerchantOrderBody),
                      FilledButton(
                        key: const ValueKey('openCanonicalMerchantOrder'),
                        onPressed: () =>
                            context.go('/merchant/routes/order/new'),
                        child: Text(l10n.canonicalMerchantOrder),
                      ),
                      if (canonicalStatus)
                        OutlinedButton(
                          key: const ValueKey(
                            'openMerchantCanonicalAssignments',
                          ),
                          onPressed: () =>
                              context.go('/merchant/canonical-assignments'),
                          child: Text(l10n.canonicalAssignmentStatus),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: AppTokens.spaceMedium),
              ],
              dashboard.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => MasariCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(merchantErrorLabel(l10n, error)),
                      FilledButton(
                        onPressed: () => ref
                            .read(merchantDashboardProvider.notifier)
                            .refresh(),
                        child: Text(l10n.retry),
                      ),
                    ],
                  ),
                ),
                data: (state) => Column(
                  children: [
                    MasariCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            l10n.orders,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          if (state.latestOrder == null)
                            Text(l10n.noOrders)
                          else ...[
                            Text(
                              '${l10n.latestOrder}: ${merchantStatusLabel(l10n, state.latestOrder!.status)}',
                            ),
                            Text(
                              '${l10n.parcelCount}: ${state.latestOrder!.parcels.length}',
                            ),
                            FilledButton(
                              key: const ValueKey('openLatestOrder'),
                              onPressed: () => context.go(
                                '/merchant/order/${state.latestOrder!.id}',
                              ),
                              child: Text(l10n.viewDetails),
                            ),
                          ],
                          OutlinedButton(
                            key: const ValueKey('createMerchantOrder'),
                            onPressed: () => context.go('/merchant/order/new'),
                            child: Text(l10n.createOrder),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppTokens.spaceMedium),
                    MasariCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            l10n.latestBatch,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          if (state.latestBatch == null)
                            Text(l10n.noOrders)
                          else ...[
                            merchantTechnicalText(state.latestBatch!.id),
                            Text(
                              '${l10n.currentStatus}: ${merchantStatusLabel(l10n, state.latestBatch!.status)}',
                            ),
                            Text(
                              '${l10n.estimatedDistanceSaved}: ${state.latestBatch!.estimatedDistanceSaved.toStringAsFixed(2)} km',
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
                            l10n.merchantMatchInbox,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            '${l10n.waitingForDriver}: ${state.waitingMatchCount}',
                            key: const ValueKey('merchantWaitingMatchCount'),
                          ),
                          FilledButton(
                            key: const ValueKey('openMerchantMatches'),
                            onPressed: () => context.go('/merchant/matches'),
                            child: Text(l10n.matchInbox),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppTokens.spaceMedium),
                    MasariCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            l10n.activeTrip,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          if (state.activeTrip == null)
                            Text(l10n.noActiveTrip)
                          else ...[
                            Text(
                              '${l10n.currentStatus}: ${merchantStatusLabel(l10n, state.activeTrip!.status)}',
                            ),
                            FilledButton(
                              key: const ValueKey('openMerchantTrip'),
                              onPressed: () => context.go(
                                '/merchant/trip/${state.activeTrip!.id}',
                              ),
                              child: Text(l10n.openTrip),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppTokens.spaceLarge),
              OutlinedButton(
                onPressed: () =>
                    ref.read(merchantDashboardProvider.notifier).refresh(),
                child: Text(l10n.refresh),
              ),
              const RoleSecurityActions(),
            ],
          ),
        ),
      ),
    );
  }
}
