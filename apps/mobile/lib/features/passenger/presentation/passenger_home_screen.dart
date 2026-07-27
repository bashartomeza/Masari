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
import '../application/passenger_controller.dart';

class PassengerHomeScreen extends ConsumerWidget {
  const PassengerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).value?.user;
    final dashboard = ref.watch(passengerDashboardProvider);
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
              ref.read(passengerDashboardProvider.notifier).refresh(),
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
                l10n.passengerDashboard,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppTokens.spaceLarge),
              MasariCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${l10n.currentUser}: ${user?.name ?? ''}'),
                    Text('${l10n.role}: ${l10n.passenger}'),
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
                      Text(l10n.canonicalPassengerRequestBody),
                      FilledButton(
                        key: const ValueKey('openCanonicalPassengerRequest'),
                        onPressed: () =>
                            context.go('/passenger/routes/request/new'),
                        child: Text(l10n.canonicalPassengerRequest),
                      ),
                      if (canonicalStatus)
                        OutlinedButton(
                          key: const ValueKey(
                            'openPassengerCanonicalAssignments',
                          ),
                          onPressed: () =>
                              context.go('/passenger/canonical-assignments'),
                          child: Text(l10n.canonicalAssignmentStatus),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: AppTokens.spaceMedium),
              ],
              dashboard.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => _RetryCard(
                  message: l10n.requestFailed,
                  onRetry: () =>
                      ref.read(passengerDashboardProvider.notifier).refresh(),
                ),
                data: (state) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    MasariCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.activeRequest,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: AppTokens.spaceSmall),
                          if (state.activeRequest == null) ...[
                            Text(l10n.noActiveRequest),
                            const SizedBox(height: AppTokens.spaceMedium),
                            FilledButton(
                              onPressed: () =>
                                  context.go('/passenger/request/new'),
                              child: Text(l10n.createRequest),
                            ),
                          ] else ...[
                            Text(state.activeRequest!.pickupLabel),
                            Text(
                              _statusLabel(l10n, state.activeRequest!.status),
                            ),
                            const SizedBox(height: AppTokens.spaceMedium),
                            FilledButton(
                              onPressed: () => context.go(
                                '/passenger/request/${state.activeRequest!.id}',
                              ),
                              child: Text(l10n.requestDetails),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: AppTokens.spaceMedium),
                    MasariCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.passengerTrip,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: AppTokens.spaceSmall),
                          if (state.activeTrip == null) ...[
                            Text(l10n.noConnectedTrip),
                          ] else ...[
                            Text(_statusLabel(l10n, state.activeTrip!.status)),
                            const SizedBox(height: AppTokens.spaceMedium),
                            FilledButton(
                              onPressed: () => context.go(
                                '/passenger/trip/${state.activeTrip!.id}',
                              ),
                              child: Text(l10n.passengerTrip),
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
                    ref.read(passengerDashboardProvider.notifier).refresh(),
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

class _RetryCard extends StatelessWidget {
  const _RetryCard({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => MasariCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(message),
        FilledButton(
          onPressed: onRetry,
          child: Text(AppLocalizations.of(context).retry),
        ),
      ],
    ),
  );
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
