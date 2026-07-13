import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../application/merchant_controller.dart';
import '../data/merchant_models.dart';
import '../data/merchant_repository.dart';
import 'merchant_ui.dart';

class CreateMerchantOrderScreen extends ConsumerStatefulWidget {
  const CreateMerchantOrderScreen({super.key});

  @override
  ConsumerState<CreateMerchantOrderScreen> createState() =>
      _CreateMerchantOrderScreenState();
}

class _CreateMerchantOrderScreenState
    extends ConsumerState<CreateMerchantOrderScreen> {
  bool _busy = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final parcels = ref.watch(merchantOrderDraftProvider);
    final draft = ref.read(merchantOrderDraftProvider.notifier);
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
              l10n.createOrder,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            MasariCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    l10n.fixedPickup,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text(l10n.lockedCorridor),
                ],
              ),
            ),
            const SizedBox(height: AppTokens.spaceMedium),
            ...parcels.indexed.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(bottom: AppTokens.spaceMedium),
                child: _parcelCard(l10n, entry.$1, entry.$2),
              ),
            ),
            OutlinedButton.icon(
              key: const ValueKey('addParcelButton'),
              onPressed: draft.canAdd ? draft.addParcel : null,
              icon: const Icon(Icons.add),
              label: Text('${l10n.addParcel} (${parcels.length}/10)'),
            ),
            Text(l10n.parcelLimit),
            if (_error != null)
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            const SizedBox(height: AppTokens.spaceLarge),
            FilledButton(
              key: const ValueKey('submitMerchantOrder'),
              onPressed: _busy ? null : _submit,
              child: Text(l10n.submitOrder),
            ),
          ],
        ),
      ),
    );
  }

  Widget _parcelCard(AppLocalizations l10n, int index, ParcelDraft parcel) {
    final controller = ref.read(merchantOrderDraftProvider.notifier);
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '${l10n.parcel} ${index + 1}',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          DropdownButtonFormField<String>(
            key: ValueKey('parcelDestination-$index'),
            initialValue: parcel.destinationLabel,
            decoration: InputDecoration(labelText: l10n.destination),
            items: merchantDestinations
                .map(
                  (value) => DropdownMenuItem(
                    value: value,
                    child: Text(merchantDestinationLabel(context, value)),
                  ),
                )
                .toList(),
            onChanged: (value) =>
                controller.updateParcel(index, destinationLabel: value),
          ),
          DropdownButtonFormField<String>(
            key: ValueKey('parcelSize-$index'),
            initialValue: parcel.size,
            decoration: InputDecoration(labelText: l10n.parcelSize),
            items: const ['S', 'M', 'L']
                .map(
                  (value) => DropdownMenuItem(value: value, child: Text(value)),
                )
                .toList(),
            onChanged: (value) => controller.updateParcel(index, size: value),
          ),
          DropdownButtonFormField<String>(
            key: ValueKey('parcelPriority-$index'),
            initialValue: parcel.priority,
            decoration: InputDecoration(labelText: l10n.priority),
            items: ['low', 'normal', 'high']
                .map(
                  (value) => DropdownMenuItem(
                    value: value,
                    child: Text(merchantPriorityLabel(l10n, value)),
                  ),
                )
                .toList(),
            onChanged: (value) =>
                controller.updateParcel(index, priority: value),
          ),
          if (controller.canRemove)
            TextButton.icon(
              key: ValueKey('removeParcel-$index'),
              onPressed: () => controller.removeParcel(index),
              icon: const Icon(Icons.remove_circle_outline),
              label: Text(l10n.removeParcel),
            ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final order = await ref
          .read(merchantRepositoryProvider)
          .createOrder(ref.read(merchantOrderDraftProvider));
      ref.invalidate(merchantDashboardProvider);
      if (mounted) context.go('/merchant/order/${order.id}');
    } catch (error) {
      if (mounted) setState(() => _error = merchantErrorLabel(l10n, error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
