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
import '../application/driver_controller.dart';
import 'driver_ui.dart';

class DriverHomeScreen extends ConsumerWidget {
  const DriverHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).value?.user;
    final dashboard = ref.watch(driverDashboardProvider);
    final canonicalEntry =
        ref.watch(mobileCapabilitiesProvider).value?.multiRouteEntryAvailable ==
        true;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(driverDashboardProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(AppTokens.spaceLarge),
            children: [
              const Align(
                alignment: AlignmentDirectional.centerEnd,
                child: LanguageSwitch(),
              ),
              const SizedBox(height: AppTokens.spaceLarge),
              Text(
                l10n.appTitle,
                style: Theme.of(
                  context,
                ).textTheme.headlineLarge?.copyWith(color: AppTheme.deepGreen),
              ),
              Text(
                l10n.driverDashboard,
                key: const ValueKey('driverDashboardTitle'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppTokens.spaceLarge),
              MasariCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${l10n.currentUser}: ${user?.name ?? ''}'),
                    Text('${l10n.role}: ${l10n.driver}'),
                    const SizedBox(height: AppTokens.spaceSmall),
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
                      Text(l10n.canonicalRoutesBody),
                      FilledButton(
                        key: const ValueKey('openCanonicalAvailabilities'),
                        onPressed: () => context.go('/driver/availabilities'),
                        child: Text(l10n.driverAvailabilities),
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
                      Text(driverErrorLabel(l10n, error)),
                      FilledButton(
                        onPressed: () => ref
                            .read(driverDashboardProvider.notifier)
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
                            l10n.activeRoute,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: AppTokens.spaceSmall),
                          if (state.currentRoute == null)
                            Text(l10n.noActiveRoute)
                          else ...[
                            Text(l10n.lockedCorridor),
                            Text(
                              '${l10n.currentStatus}: ${driverStatusLabel(l10n, state.currentRoute!.status)}',
                            ),
                          ],
                          const SizedBox(height: AppTokens.spaceMedium),
                          FilledButton(
                            key: const ValueKey('openDriverRoute'),
                            onPressed: () => context.go('/driver/route'),
                            child: Text(
                              state.currentRoute == null
                                  ? l10n.createRoute
                                  : l10n.viewRoute,
                            ),
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
                            l10n.matchInbox,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            '${l10n.proposedMatches}: ${state.proposedMatchCount}',
                            key: const ValueKey('proposedMatchCount'),
                          ),
                          const SizedBox(height: AppTokens.spaceMedium),
                          FilledButton(
                            key: const ValueKey('openMatchInbox'),
                            onPressed: () => context.go('/driver/matches'),
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
                              '${l10n.currentStatus}: ${driverStatusLabel(l10n, state.activeTrip!.status)}',
                            ),
                            const SizedBox(height: AppTokens.spaceMedium),
                            FilledButton(
                              key: const ValueKey('openActiveTrip'),
                              onPressed: () => context.go(
                                '/driver/trip/${state.activeTrip!.id}',
                              ),
                              child: Text(l10n.openActiveTrip),
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
                    ref.read(driverDashboardProvider.notifier).refresh(),
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
