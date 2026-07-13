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

class MerchantOrderDetailScreen extends ConsumerStatefulWidget {
  const MerchantOrderDetailScreen({required this.orderId, super.key});
  final String orderId;

  @override
  ConsumerState<MerchantOrderDetailScreen> createState() =>
      _MerchantOrderDetailScreenState();
}

class _MerchantOrderDetailScreenState
    extends ConsumerState<MerchantOrderDetailScreen> {
  bool _busy = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final detail = ref.watch(merchantOrderProvider(widget.orderId));
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref
              .read(merchantOrderProvider(widget.orderId).notifier)
              .refresh(),
          child: ListView(
            padding: const EdgeInsets.all(AppTokens.spaceLarge),
            children: [
              const Align(
                alignment: AlignmentDirectional.centerEnd,
                child: LanguageSwitch(),
              ),
              Text(
                l10n.orderDetails,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: AppTokens.spaceLarge),
              detail.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => FilledButton(
                  onPressed: () => ref
                      .read(merchantOrderProvider(widget.orderId).notifier)
                      .refresh(),
                  child: Text(l10n.retry),
                ),
                data: (state) => _content(l10n, state),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _content(AppLocalizations l10n, MerchantOrderViewState state) {
    final order = state.order;
    return Column(
      children: [
        MasariCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              merchantTechnicalText(
                order.id,
                key: const ValueKey('merchantOrderId'),
              ),
              Text('${l10n.pickup}: ${l10n.lockedCorridor}'),
              Text(
                '${l10n.orderStatus}: ${merchantStatusLabel(l10n, order.status)}',
                key: const ValueKey('merchantOrderStatus'),
              ),
              Text('${l10n.createdTime}: ${order.createdAt}'),
              Text('${l10n.parcelCount}: ${order.parcels.length}'),
            ],
          ),
        ),
        const SizedBox(height: AppTokens.spaceMedium),
        ...order.parcels.indexed.map(
          (entry) => Padding(
            padding: const EdgeInsets.only(bottom: AppTokens.spaceMedium),
            child: _parcel(l10n, entry.$1, entry.$2),
          ),
        ),
        MasariCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.parcelBatch,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              if (order.latestBatch == null)
                FilledButton(
                  key: const ValueKey('createBatchButton'),
                  onPressed: _busy || !order.canBatch ? null : _createBatch,
                  child: Text(l10n.createBatch),
                )
              else ...[
                merchantTechnicalText(order.latestBatch!.id),
                Text(
                  '${l10n.currentStatus}: ${merchantStatusLabel(l10n, order.latestBatch!.status)}',
                ),
                Text(
                  '${l10n.estimatedDistanceSaved}: ${order.latestBatch!.estimatedDistanceSaved.toStringAsFixed(2)} km',
                ),
                Text(
                  '${l10n.batchExplanation}: ${order.latestBatch!.explanation}',
                ),
              ],
              const SizedBox(height: AppTokens.spaceMedium),
              if (state.canRunMatch)
                FilledButton(
                  key: const ValueKey('runMerchantMatchButton'),
                  onPressed: _busy ? null : _runMatch,
                  child: Text(l10n.runMatching),
                )
              else if (state.latestMatch == null)
                Text(l10n.matchingUnavailable),
              if (state.latestMatch != null) ...[
                Text(
                  '${l10n.matchResult}: ${merchantStatusLabel(l10n, state.latestMatch!.status)}',
                ),
                OutlinedButton(
                  key: const ValueKey('openOrderMatch'),
                  onPressed: () =>
                      context.go('/merchant/match/${state.latestMatch!.id}'),
                  child: Text(l10n.viewDetails),
                ),
              ],
              if (state.trip != null)
                FilledButton(
                  key: const ValueKey('openOrderTrip'),
                  onPressed: () =>
                      context.go('/merchant/trip/${state.trip!.id}'),
                  child: Text(l10n.openTrip),
                ),
              if (_error != null)
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _parcel(AppLocalizations l10n, int index, MerchantParcel parcel) {
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('${l10n.parcel} ${index + 1}'),
          Text(
            '${l10n.destination}: ${merchantDestinationLabel(context, parcel.destinationLabel)}',
          ),
          Text('${l10n.parcelSize}: ${parcel.size}'),
          Text(
            '${l10n.priority}: ${merchantPriorityLabel(l10n, parcel.priority)}',
          ),
          Text(
            '${l10n.parcelStatus}: ${merchantStatusLabel(l10n, parcel.status)}',
          ),
        ],
      ),
    );
  }

  Future<void> _createBatch() => _action(() async {
    await ref
        .read(merchantOrderProvider(widget.orderId).notifier)
        .createBatch();
  });

  Future<void> _runMatch() => _action(() async {
    final match = await ref
        .read(merchantOrderProvider(widget.orderId).notifier)
        .runMatch();
    if (mounted) context.go('/merchant/match/${match.id}');
  });

  Future<void> _action(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) {
        setState(
          () =>
              _error = merchantErrorLabel(AppLocalizations.of(context), error),
        );
        await ref
            .read(merchantOrderProvider(widget.orderId).notifier)
            .refresh();
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
