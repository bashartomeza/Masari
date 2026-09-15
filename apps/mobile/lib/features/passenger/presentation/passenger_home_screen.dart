import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/masari_card.dart';
import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/route_chip.dart';
import '../../../core/widgets/state_views.dart';
import '../../auth/application/auth_controller.dart';
import '../../security/presentation/security_actions.dart';
import '../../security/presentation/session_status_banner.dart';
import '../../trips/data/trip_models.dart';
import '../application/passenger_controller.dart';
import '../data/passenger_models.dart';
import 'widgets/destination_search_card.dart';
import 'widgets/passenger_top_bar.dart';

class PassengerHomeScreen extends ConsumerWidget {
  const PassengerHomeScreen({super.key});

  /// Where the request flow starts. Kept in one place because the top bar, the
  /// chips, the empty state, and the pinned CTA all lead here.
  static const _newRequestRoute = '/passenger/request/new';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final user = ref.watch(authControllerProvider).value?.user;
    final dashboard = ref.watch(passengerDashboardProvider);

    void openNewRequest() => context.go(_newRequestRoute);

    Future<void> refresh() async {
      await ref.read(passengerDashboardProvider.notifier).refresh();
    }

    return Column(
      key: const ValueKey('passengerHome'),
      children: [
        Expanded(
          child: SafeArea(
            bottom: false,
            child: RefreshIndicator(
              onRefresh: refresh,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                  AppTokens.marginMobile,
                  AppTokens.spaceSmall,
                  AppTokens.marginMobile,
                  AppTokens.spaceLarge,
                ),
                children: [
                  PassengerTopBar(title: l10n.appTitle, name: user?.name),
                  const SizedBox(height: AppTokens.spaceMedium),
                  PassengerGreeting(
                    // The full name, not just the first: this is the only place
                    // the passenger sees which account they are signed in as.
                    name: _displayName(user?.name) ?? l10n.passenger,
                    locationLabel: l10n.lockedCorridor,
                  ),
                  const SizedBox(height: AppTokens.spaceMedium),
                  const SessionStatusBanner(),

                  const SizedBox(height: AppTokens.spaceMedium),
                  const _AssistantEntryCard(),

                  // The passenger's own request outranks anything on offer, so
                  // it sits above the search entry point when one exists.
                  ..._activeWork(context, l10n, dashboard),

                  const SizedBox(height: AppTokens.spaceMedium),
                  DestinationSearchCard(onTap: openNewRequest),

                  const SizedBox(height: AppTokens.spaceLarge),
                  const Divider(),
                  const RoleSecurityActions(),
                ],
              ),
            ),
          ),
        ),
        _PinnedSearchCta(onPressed: openNewRequest),
      ],
    );
  }

  /// The active request and connected trip, rendered only when they exist.
  ///
  /// The design has no slot for these, but they are the passenger's live state
  /// and dropping them would remove working functionality.
  List<Widget> _activeWork(
    BuildContext context,
    AppLocalizations l10n,
    AsyncValue<PassengerDashboardState> dashboard,
  ) {
    return dashboard.when(
      loading: () => const [
        SizedBox(height: AppTokens.spaceMedium),
        LoadingSkeleton(height: 72),
      ],
      error: (error, _) => [
        const SizedBox(height: AppTokens.spaceMedium),
        OfflineBanner(message: l10n.requestFailed, tone: BannerTone.error),
      ],
      data: (state) {
        final request = state.activeRequest;
        final trip = state.activeTrip;
        if (request == null && trip == null) return const [];
        return [
          const SizedBox(height: AppTokens.spaceMedium),
          if (request != null)
            _ActiveRequestCard(request: request, trip: trip)
          else
            _ConnectedTripCard(trip: trip!),
        ];
      },
    );
  }
}

class _AssistantEntryCard extends StatelessWidget {
  const _AssistantEntryCard();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return MasariCard(
      key: const ValueKey('openPassengerAssistant'),
      onTap: () => context.go('/passenger/assistant'),
      background: AppTheme.surfaceContainerLow,
      border: const BorderSide(color: AppTheme.primary),
      child: Row(
        children: [
          Container(
            width: AppTokens.minTouchTarget,
            height: AppTokens.minTouchTarget,
            decoration: BoxDecoration(
              color: AppTheme.primaryContainer,
              borderRadius: BorderRadius.circular(AppTokens.radiusMedium),
            ),
            child: const Icon(
              Icons.auto_awesome,
              color: AppTheme.onPrimaryContainer,
            ),
          ),
          const SizedBox(width: AppTokens.gutterMobile),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.assistantHomeTitle,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: AppTheme.primary,
                  ),
                ),
                const SizedBox(height: AppTokens.spaceExtraSmall),
                Text(
                  l10n.assistantHomeBody,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppTheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppTokens.spaceSmall),
          const Icon(Icons.arrow_forward, color: AppTheme.primary),
        ],
      ),
    );
  }
}

String? _displayName(String? name) {
  final trimmed = name?.trim();
  return (trimmed == null || trimmed.isEmpty) ? null : trimmed;
}

/// The passenger's own open request.
class _ActiveRequestCard extends StatelessWidget {
  const _ActiveRequestCard({required this.request, this.trip});

  final PassengerRequest request;
  final PassengerTrip? trip;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final connected = trip;

    return MasariInfoCard(
      title: l10n.activeRequest,
      icon: Icons.person_pin_circle_outlined,
      statusLabel: passengerStatusLabel(l10n, request.status),
      statusTone: statusToneFor(request.status),
      emphasis: true,
      body: RouteChip(
        from: request.pickupLabel,
        to: request.destinationLabel,
        compact: true,
      ),
      primaryAction: CardAction(
        label: connected == null ? l10n.requestDetails : l10n.openTrip,
        onPressed: () => context.go(
          connected == null
              ? '/passenger/request/${request.id}'
              : '/passenger/trip/${connected.id}',
        ),
      ),
    );
  }
}

/// A trip that exists without an open request behind it.
class _ConnectedTripCard extends StatelessWidget {
  const _ConnectedTripCard({required this.trip});

  final PassengerTrip trip;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return MasariInfoCard(
      title: l10n.passengerTrip,
      icon: Icons.directions_car_outlined,
      statusLabel: passengerStatusLabel(l10n, trip.status),
      statusTone: statusToneFor(trip.status),
      primaryAction: CardAction(
        label: l10n.openTrip,
        onPressed: () => context.go('/passenger/trip/${trip.id}'),
      ),
    );
  }
}

/// The screen's main call to action, pinned above the navigation bar.
///
/// Sits outside the scroll view so it is always reachable, and inside the
/// shell's body so the navigation bar stays below it.
class _PinnedSearchCta extends StatelessWidget {
  const _PinnedSearchCta({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.background,
        border: Border(top: BorderSide(color: AppTheme.outlineVariant)),
      ),
      padding: const EdgeInsets.fromLTRB(
        AppTokens.marginMobile,
        AppTokens.gutterMobile,
        AppTokens.marginMobile,
        AppTokens.gutterMobile,
      ),
      child: FilledButton.icon(
        key: const ValueKey('searchForTripCta'),
        onPressed: onPressed,
        icon: const Icon(Icons.search),
        label: Text(l10n.searchForTrip),
      ),
    );
  }
}

String passengerStatusLabel(AppLocalizations l10n, String status) =>
    switch (status) {
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
