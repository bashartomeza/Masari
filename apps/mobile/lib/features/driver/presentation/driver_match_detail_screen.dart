import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../application/driver_controller.dart';
import '../data/driver_models.dart';
import 'driver_ui.dart';

class DriverMatchDetailScreen extends ConsumerStatefulWidget {
  const DriverMatchDetailScreen({required this.matchId, super.key});
  final String matchId;
  @override
  ConsumerState<DriverMatchDetailScreen> createState() =>
      _DriverMatchDetailScreenState();
}

class _DriverMatchDetailScreenState
    extends ConsumerState<DriverMatchDetailScreen> {
  bool _busy = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final detail = ref.watch(driverMatchDetailProvider(widget.matchId));
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
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            detail.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => FilledButton(
                onPressed: () => ref
                    .read(driverMatchDetailProvider(widget.matchId).notifier)
                    .refresh(),
                child: Text(l10n.retry),
              ),
              data: (match) => _detailCard(l10n, match),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailCard(AppLocalizations l10n, DriverMatch match) {
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          technicalText(match.id, selectable: true),
          Text('${l10n.requestType}: ${matchTypeLabel(l10n, match)}'),
          Text('${l10n.pickup}: ${match.pickupLabel}'),
          Text('${l10n.destination}: ${match.destinationLabel}'),
          if (match.passengerRequest != null)
            Text(
              '${l10n.passengerCount}: ${match.passengerRequest!.passengerCount}',
            ),
          if (match.merchantOrder != null)
            Text('${l10n.parcelCount}: ${match.merchantOrder!.parcelCount}'),
          if (match.parcelBatch != null) ...[
            Text('${l10n.parcelBatch}: ${match.parcelBatch!.id}'),
            Text(
              '${l10n.estimatedDistanceSaved}: ${match.parcelBatch!.estimatedDistanceSaved.toStringAsFixed(2)} km',
            ),
          ],
          Text('${l10n.matchScore}: ${percent(match.score)}'),
          Text(
            '${l10n.currentStatus}: ${driverStatusLabel(l10n, match.status)}',
          ),
          const SizedBox(height: AppTokens.spaceMedium),
          Text(
            l10n.scoringBreakdown,
            key: const ValueKey('driverScoringBreakdown'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text(
            '${l10n.corridorOverlap}: ${percent(match.breakdown.corridorOverlap)}',
          ),
          Text(
            '${l10n.pickupDistance}: ${percent(match.breakdown.pickupDistanceScore)}',
          ),
          Text('${l10n.timingFit}: ${percent(match.breakdown.timingFit)}'),
          Text('${l10n.trustScore}: ${percent(match.breakdown.trustScore)}'),
          Text('${l10n.capacityFit}: ${percent(match.breakdown.capacityFit)}'),
          const SizedBox(height: AppTokens.spaceMedium),
          Text('${l10n.matchExplanation}: ${l10n.routeMatchExplanation}'),
          if (_error != null) ...[
            const SizedBox(height: AppTokens.spaceMedium),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          if (match.canRespond) ...[
            const SizedBox(height: AppTokens.spaceLarge),
            FilledButton(
              key: const ValueKey('acceptMatchButton'),
              onPressed: _busy ? null : _accept,
              child: Text(l10n.acceptMatch),
            ),
            OutlinedButton(
              key: const ValueKey('rejectMatchButton'),
              onPressed: _busy ? null : _reject,
              child: Text(l10n.rejectMatch),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _accept() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final trip = await ref
          .read(driverMatchDetailProvider(widget.matchId).notifier)
          .accept();
      if (mounted) context.go('/driver/trip/${trip.id}');
    } catch (error) {
      await _recover(error, l10n);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reject() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(driverMatchDetailProvider(widget.matchId).notifier)
          .reject();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.matchRejected)));
      }
    } catch (error) {
      await _recover(error, l10n);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _recover(Object error, AppLocalizations l10n) async {
    if (mounted) setState(() => _error = driverErrorLabel(l10n, error));
    await ref
        .read(driverMatchDetailProvider(widget.matchId).notifier)
        .refresh();
  }
}
