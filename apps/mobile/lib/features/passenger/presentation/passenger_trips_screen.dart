import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/presentation/localized_labels.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/route_chip.dart';
import '../../../core/widgets/state_views.dart';
import '../../canonical_routes/application/canonical_route_controller.dart';
import '../../trips/data/trip_models.dart';
import '../application/passenger_history_controller.dart';
import '../data/passenger_models.dart';
import 'passenger_home_screen.dart' show passengerStatusLabel;

/// The passenger's "My trips" tab.
///
/// The flow diagram splits this into active / upcoming / past / cancelled, and
/// every one of those buckets is derived from real rows: `GET
/// /passenger/requests` returns the passenger's whole history and, until now,
/// no screen read it. Recurring trips are the one bucket in the diagram with no
/// backing at all — there is no recurrence column anywhere — so it is absent
/// rather than stubbed.
class PassengerTripsScreen extends ConsumerWidget {
  const PassengerTripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final history = ref.watch(passengerHistoryProvider);
    final capabilities = ref.watch(mobileCapabilitiesProvider).value;
    final canonicalStatus =
        capabilities?.canonicalAssignmentStatusAvailable == true;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.myTrips),
        actions: const [
          LanguageSwitch(),
          SizedBox(width: AppTokens.spaceSmall),
        ],
      ),
      body: SafeArea(
        top: false,
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () =>
              ref.read(passengerHistoryProvider.notifier).refresh(),
          child: history.when(
            loading: () => ListView(
              padding: _padding,
              children: const [
                LoadingSkeleton.card(),
                SizedBox(height: AppTokens.spaceMedium),
                LoadingSkeleton.card(),
                SizedBox(height: AppTokens.spaceMedium),
                LoadingSkeleton.card(),
              ],
            ),
            // Kept scrollable so pull-to-refresh still works from the error and
            // empty states, which is the only way back without leaving the tab.
            error: (error, _) => ListView(
              padding: _padding,
              children: [
                ErrorStateView(
                  title: l10n.tripHistoryFailed,
                  retryLabel: l10n.retry,
                  onRetry: () =>
                      ref.read(passengerHistoryProvider.notifier).refresh(),
                ),
              ],
            ),
            data: (state) => ListView(
              key: const ValueKey('passengerTripsList'),
              padding: _padding,
              children: [
                if (state.isEmpty)
                  EmptyState(
                    title: l10n.noTripsYet,
                    message: l10n.noTripsYetBody,
                    icon: Icons.route_outlined,
                    actionLabel: l10n.createRequest,
                    onAction: () => context.go('/passenger/request/new'),
                  )
                else ...[
                  _Bucket(
                    title: l10n.tripsActiveSection,
                    requests: state.active,
                    tripForRequest: state.tripForRequest,
                    emphasis: true,
                  ),
                  _Bucket(
                    title: l10n.tripsUpcomingSection,
                    requests: state.upcoming,
                    tripForRequest: state.tripForRequest,
                  ),
                  _Bucket(
                    title: l10n.tripsPastSection,
                    requests: state.past,
                    tripForRequest: state.tripForRequest,
                  ),
                  _Bucket(
                    title: l10n.tripsCancelledSection,
                    requests: state.cancelled,
                    tripForRequest: state.tripForRequest,
                  ),
                ],

                if (canonicalStatus) ...[
                  const SizedBox(height: AppTokens.spaceLarge),
                  MasariSection(
                    title: l10n.canonicalRoutes,
                    child: MasariInfoCard(
                      title: l10n.canonicalAssignments,
                      icon: Icons.alt_route_outlined,
                      primaryAction: CardAction(
                        key: const ValueKey('openPassengerAssignments'),
                        label: l10n.viewDetails,
                        onPressed: () =>
                            context.go('/passenger/canonical-assignments'),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  static const _padding = EdgeInsets.fromLTRB(
    AppTokens.marginMobile,
    AppTokens.spaceMedium,
    AppTokens.marginMobile,
    AppTokens.spaceExtraLarge,
  );
}

/// One titled group of requests. Renders nothing at all when the bucket is
/// empty — a column of four "nothing here" cards would bury the one bucket that
/// does have content.
class _Bucket extends StatelessWidget {
  const _Bucket({
    required this.title,
    required this.requests,
    required this.tripForRequest,
    this.emphasis = false,
  });

  final String title;
  final List<PassengerRequest> requests;
  final PassengerTrip? Function(String requestId) tripForRequest;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    if (requests.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: AppTokens.spaceLarge),
      child: MasariSection(
        title: title,
        child: Column(
          children: [
            for (final (index, request) in requests.indexed) ...[
              if (index > 0) const SizedBox(height: AppTokens.spaceMedium),
              _RequestCard(
                request: request,
                tripId: tripForRequest(request.id)?.id,
                emphasis: emphasis && index == 0,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    required this.emphasis,
    this.tripId,
  });

  final PassengerRequest request;
  final bool emphasis;
  final String? tripId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final material = MaterialLocalizations.of(context);

    return MasariInfoCard(
      key: ValueKey('passengerTrip-${request.id}'),
      title: localizedCorridorPlace(context, request.destinationLabel),
      icon: Icons.person_pin_circle_outlined,
      statusLabel: passengerStatusLabel(l10n, request.status),
      statusTone: statusToneFor(request.status),
      emphasis: emphasis,
      body: Column(
        children: [
          RouteChip(
            from: localizedCorridorPlace(context, request.pickupLabel),
            to: localizedCorridorPlace(context, request.destinationLabel),
            compact: true,
          ),
          const SizedBox(height: AppTokens.spaceSmall),
          DetailRow(
            label: l10n.preferredTime,
            value: material.formatCompactDate(request.preferredTime),
            icon: Icons.schedule_outlined,
          ),
          DetailRow(
            label: l10n.passengerCount,
            value: '${request.passengerCount}',
            icon: Icons.people_outline,
          ),
        ],
      ),
      primaryAction: CardAction(
        label: tripId == null ? l10n.requestDetails : l10n.openTrip,
        onPressed: () => context.go(
          tripId == null
              ? '/passenger/request/${request.id}'
              : '/passenger/trip/$tripId',
        ),
      ),
    );
  }
}
