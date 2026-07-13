import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../data/passenger_models.dart';
import '../data/passenger_repository.dart';

class CreateRequestScreen extends ConsumerStatefulWidget {
  const CreateRequestScreen({super.key});
  @override
  ConsumerState<CreateRequestScreen> createState() =>
      _CreateRequestScreenState();
}

class _CreateRequestScreenState extends ConsumerState<CreateRequestScreen> {
  PickupPreset _pickup = lockedPickupPresets.first;
  DateTime _preferredTime = DateTime.now().add(const Duration(hours: 1));
  int _count = 1;
  bool _loading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
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
              l10n.createRequest,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            MasariCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<PickupPreset>(
                    initialValue: _pickup,
                    decoration: InputDecoration(labelText: l10n.pickup),
                    items: lockedPickupPresets
                        .map(
                          (preset) => DropdownMenuItem(
                            value: preset,
                            child: Text(_pickupLabel(l10n, preset)),
                          ),
                        )
                        .toList(),
                    onChanged: _loading
                        ? null
                        : (value) => setState(() => _pickup = value ?? _pickup),
                  ),
                  const SizedBox(height: AppTokens.spaceMedium),
                  Text('${l10n.destination}: ${l10n.bethlehem}'),
                  const SizedBox(height: AppTokens.spaceMedium),
                  OutlinedButton(
                    onPressed: _loading ? null : _pickTime,
                    child: Text(
                      '${l10n.preferredTime}: ${_preferredTime.toLocal()}',
                    ),
                  ),
                  DropdownButtonFormField<int>(
                    initialValue: _count,
                    decoration: InputDecoration(labelText: l10n.passengerCount),
                    items: [1, 2, 3, 4]
                        .map(
                          (count) => DropdownMenuItem(
                            value: count,
                            child: Text('$count'),
                          ),
                        )
                        .toList(),
                    onChanged: _loading
                        ? null
                        : (value) => setState(() => _count = value ?? 1),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: AppTokens.spaceMedium),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: AppTokens.spaceLarge),
                  FilledButton(
                    onPressed: _loading ? null : _submit,
                    child: Text(l10n.submitRequest),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 14)),
      initialDate: _preferredTime,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_preferredTime),
    );
    if (time == null) return;
    setState(
      () => _preferredTime = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final created = await ref
          .read(passengerRepositoryProvider)
          .createRequest(
            pickup: _pickup,
            preferredTime: _preferredTime,
            passengerCount: _count,
          );
      if (mounted) context.go('/passenger/request/${created.id}');
    } catch (_) {
      setState(() => _error = AppLocalizations.of(context).validationError);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

String _pickupLabel(AppLocalizations l10n, PickupPreset preset) =>
    preset.key == 'ppu' ? l10n.ppu : l10n.babAlZawiya;
