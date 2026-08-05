import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/state_views.dart';
import '../application/driver_controller.dart';
import '../data/driver_stats_source.dart';
import '../domain/driver_home_stats.dart';
import 'driver_ui.dart';
import 'widgets/driver_home_widgets.dart';

/// The driver's "Earnings and performance" tab.
///
/// Split by what the database can actually answer:
///
/// - trust score — real, from `DriverProfile.trust_score` via `GET /me`
/// - completed trips (today and total) — real, derived from `GET /trips`
/// - route status — real, from `DriverRoute.status`
/// - earnings — **nothing**. There is no fare, price or tariff column anywhere
///   in the schema, so the card states that instead of showing a figure.
///
/// Acceptance rate is in the flow diagram and is also absent: rejected matches
/// are not retained per driver in a way that yields a rate, so it is named as
/// unavailable rather than approximated from the inbox.
class DriverPerformanceScreen extends ConsumerWidget {
  const DriverPerformanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final stats = ref.watch(driverHomeStatsProvider);
    final dashboard = ref.watch(driverDashboardProvider);

    final completedTotal = dashboard.value?.trips
        .where((trip) => trip.status == 'completed')
        .length;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.performanceTitle),
        actions: const [
          LanguageSwitch(),
          SizedBox(width: AppTokens.spaceSmall),
        ],
      ),
      body: SafeArea(
        top: false,
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () => ref.read(driverDashboardProvider.notifier).refresh(),
          child: ListView(
            key: const ValueKey('driverPerformanceList'),
            padding: const EdgeInsets.fromLTRB(
              AppTokens.marginMobile,
              AppTokens.spaceMedium,
              AppTokens.marginMobile,
              AppTokens.spaceExtraLarge,
            ),
            children: [
              stats.when(
                loading: () => const Row(
                  children: [
                    Expanded(child: LoadingSkeleton(height: 150)),
                    SizedBox(width: AppTokens.gutterMobile),
                    Expanded(child: LoadingSkeleton(height: 150)),
                  ],
                ),
                error: (error, _) => ErrorStateView(
                  title: driverErrorLabel(l10n, error),
                  retryLabel: l10n.retry,
                  onRetry: () =>
                      ref.read(driverDashboardProvider.notifier).refresh(),
                ),
                data: (value) => _Headline(stats: value),
              ),

              const SizedBox(height: AppTokens.spaceLarge),
              MasariSection(
                title: l10n.driverDashboard,
                child: MasariInfoCard(
                  // The card carries two lifetime figures, so it is titled for
                  // the pair rather than for the live trip it does not show.
                  title: l10n.completedTripsTotal,
                  icon: Icons.insights_outlined,
                  body: StatStrip(
                    stats: [
                      (
                        label: l10n.completedTripsTotal,
                        value: completedTotal?.toString() ?? '—',
                        valueKey: const ValueKey('driverCompletedTripsTotal'),
                      ),
                      (
                        label: l10n.activeRoute,
                        value: dashboard.value?.currentRoute == null
                            ? l10n.driverOffline
                            : l10n.driverOnline,
                        valueKey: null,
                      ),
                    ],
                  ),
                ),
              ),

              // Named explicitly so the gap reads as a known limit of the
              // system rather than a screen that failed to load.
              const SizedBox(height: AppTokens.spaceLarge),
              MasariSection(
                title: l10n.todayEarnings,
                child: MasariInfoCard(
                  title: l10n.earningsNotTracked,
                  subtitle: l10n.earningsNotTrackedBody,
                  icon: Icons.account_balance_wallet_outlined,
                ),
              ),

              const SizedBox(height: AppTokens.spaceMedium),
              OfflineBanner(
                message: l10n.acceptanceRateUnavailable,
                icon: Icons.info_outline,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Trust score and today's trips, reusing the home screen's cards so the two
/// surfaces cannot drift apart.
class _Headline extends StatelessWidget {
  const _Headline({required this.stats});

  final DriverHomeStats stats;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (stats.isSample) ...[
          OfflineBanner(
            message: AppLocalizations.of(context).sampleDataNotice,
            icon: Icons.science_outlined,
          ),
          const SizedBox(height: AppTokens.spaceMedium),
        ],
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: EarningsCard(stats: stats)),
              const SizedBox(width: AppTokens.gutterMobile),
              Expanded(child: TrustScoreCard(stats: stats)),
            ],
          ),
        ),
      ],
    );
  }
}
