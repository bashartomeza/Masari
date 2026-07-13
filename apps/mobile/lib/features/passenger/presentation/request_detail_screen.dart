import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../matching/data/matching_repository.dart';
import '../application/passenger_controller.dart';
import '../data/passenger_repository.dart';

class RequestDetailScreen extends ConsumerWidget {
  const RequestDetailScreen({required this.requestId, super.key});
  final String requestId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final detail = ref.watch(passengerRequestDetailProvider(requestId));
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
              l10n.requestDetails,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            detail.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => FilledButton(
                onPressed: () =>
                    ref.invalidate(passengerRequestDetailProvider(requestId)),
                child: Text(l10n.retry),
              ),
              data: (request) => MasariCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Directionality(
                      textDirection: TextDirection.ltr,
                      child: SelectableText(request.id),
                    ),
                    Text('${l10n.pickup}: ${request.pickupLabel}'),
                    Text('${l10n.destination}: ${request.destinationLabel}'),
                    Text('${l10n.preferredTime}: ${request.preferredTime}'),
                    Text('${l10n.passengerCount}: ${request.passengerCount}'),
                    Text(
                      '${l10n.currentStatus}: ${_statusLabel(l10n, request.status)}',
                    ),
                    Text('${l10n.createdTime}: ${request.createdAt}'),
                    const SizedBox(height: AppTokens.spaceLarge),
                    if (request.canMatch)
                      FilledButton(
                        onPressed: () async {
                          final match = await ref
                              .read(matchingRepositoryProvider)
                              .runForPassengerRequest(request.id);
                          if (context.mounted) {
                            context.go('/passenger/match/${match.id}');
                          }
                        },
                        child: Text(l10n.findCompatibleRoute),
                      ),
                    if (request.canCancel)
                      OutlinedButton(
                        onPressed: () async {
                          try {
                            await ref
                                .read(passengerRepositoryProvider)
                                .cancelRequest(request.id);
                            ref.invalidate(
                              passengerRequestDetailProvider(requestId),
                            );
                          } catch (_) {
                            ref.invalidate(
                              passengerRequestDetailProvider(requestId),
                            );
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(l10n.requestCannotBeCancelled),
                                ),
                              );
                            }
                          }
                        },
                        child: Text(l10n.cancelRequest),
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
