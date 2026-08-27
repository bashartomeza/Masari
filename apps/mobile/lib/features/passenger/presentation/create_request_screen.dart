import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../../core/widgets/state_views.dart';
import '../data/passenger_models.dart';
import '../data/passenger_repository.dart';
import '../data/trip_offer_source.dart';
import '../domain/smart_trip_request.dart';
import '../domain/trip_offer.dart';
import 'widgets/trip_offer_card.dart';

enum _RequestStep { describe, review, results }

class CreateRequestScreen extends ConsumerStatefulWidget {
  const CreateRequestScreen({super.key});

  @override
  ConsumerState<CreateRequestScreen> createState() =>
      _CreateRequestScreenState();
}

class _CreateRequestScreenState extends ConsumerState<CreateRequestScreen> {
  final _requestController = TextEditingController();
  final _destinationController = TextEditingController();

  _RequestStep _step = _RequestStep.describe;
  PickupPreset _pickup = lockedPickupPresets.first;
  DateTime _preferredTime = DateTime.now().add(const Duration(hours: 1));
  int _count = 1;
  bool _loading = false;
  String? _error;
  List<TripOffer> _results = const [];

  @override
  void dispose() {
    _requestController.dispose();
    _destinationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTokens.spaceLarge),
          children: [
            Row(
              children: [
                IconButton(
                  key: const ValueKey('closeSmartSearch'),
                  onPressed: _loading ? null : () => context.go('/passenger'),
                  icon: const Icon(Icons.arrow_back),
                  tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                ),
                const Spacer(),
                const LanguageSwitch(),
              ],
            ),
            Text(
              l10n.smartSearch,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppTokens.spaceLarge),
            switch (_step) {
              _RequestStep.describe => _descriptionStep(l10n),
              _RequestStep.review => _reviewStep(l10n),
              _RequestStep.results => _resultsStep(l10n),
            },
          ],
        ),
      ),
    );
  }

  Widget _descriptionStep(AppLocalizations l10n) {
    return MasariCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.whereToGo,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppTheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppTokens.spaceSmall),
          Text(
            l10n.reviewExtractedRequestBody,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppTheme.onSurfaceVariant),
          ),
          const SizedBox(height: AppTokens.spaceLarge),
          TextField(
            key: const ValueKey('smartRequestField'),
            controller: _requestController,
            enabled: !_loading,
            minLines: 3,
            maxLines: 5,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _understandRequest(),
            decoration: InputDecoration(
              labelText: l10n.requestDescriptionLabel,
              hintText: l10n.requestDescriptionHint,
              alignLabelWithHint: true,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppTokens.spaceMedium),
            _ErrorText(_error!),
          ],
          const SizedBox(height: AppTokens.spaceLarge),
          FilledButton.icon(
            key: const ValueKey('extractRequestButton'),
            onPressed: _loading ? null : _understandRequest,
            icon: const Icon(Icons.auto_awesome_outlined),
            label: Text(l10n.extractRequest),
          ),
        ],
      ),
    );
  }

  Widget _reviewStep(AppLocalizations l10n) {
    return Column(
      key: const ValueKey('extractedReview'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MasariCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.fact_check_outlined,
                    color: AppTheme.primary,
                  ),
                  const SizedBox(width: AppTokens.spaceSmall),
                  Expanded(
                    child: Text(
                      l10n.reviewExtractedRequest,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppTokens.spaceSmall),
              Text(
                l10n.reviewExtractedRequestBody,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: AppTokens.spaceLarge),
              DropdownButtonFormField<PickupPreset>(
                key: ValueKey('reviewPickupField-${_pickup.key}'),
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
              TextField(
                key: const ValueKey('reviewDestinationField'),
                controller: _destinationController,
                enabled: !_loading,
                decoration: InputDecoration(labelText: l10n.destination),
              ),
              const SizedBox(height: AppTokens.spaceMedium),
              OutlinedButton.icon(
                key: const ValueKey('reviewTimeField'),
                onPressed: _loading ? null : _pickTime,
                icon: const Icon(Icons.schedule_outlined),
                label: Text(
                  '${l10n.preferredTime}: ${_formatDateTime(context, _preferredTime)}',
                ),
              ),
              const SizedBox(height: AppTokens.spaceExtraSmall),
              Text(
                l10n.searchWindowHelp,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: AppTokens.spaceMedium),
              DropdownButtonFormField<int>(
                key: const ValueKey('reviewPassengerCount'),
                initialValue: _count,
                decoration: InputDecoration(labelText: l10n.passengerCount),
                items: [1, 2, 3, 4]
                    .map(
                      (count) =>
                          DropdownMenuItem(value: count, child: Text('$count')),
                    )
                    .toList(),
                onChanged: _loading
                    ? null
                    : (value) => setState(() => _count = value ?? 1),
              ),
              if (_error != null) ...[
                const SizedBox(height: AppTokens.spaceMedium),
                _ErrorText(_error!),
              ],
              const SizedBox(height: AppTokens.spaceLarge),
              FilledButton.icon(
                key: const ValueKey('confirmSearchButton'),
                onPressed: _loading ? null : _search,
                icon: _loading
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.search),
                label: Text(l10n.confirmSearch),
              ),
              TextButton(
                key: const ValueKey('editOriginalRequestButton'),
                onPressed: _loading
                    ? null
                    : () => setState(() {
                        _step = _RequestStep.describe;
                        _error = null;
                      }),
                child: Text(l10n.editOriginalRequest),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _resultsStep(AppLocalizations l10n) {
    return Column(
      key: const ValueKey('searchResults'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MasariCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.searchResults,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppTokens.spaceMedium),
              _SummaryLine(
                label: l10n.pickup,
                value: _pickupLabel(l10n, _pickup),
              ),
              _SummaryLine(
                label: l10n.destination,
                value: _destinationController.text.trim(),
              ),
              _SummaryLine(
                label: l10n.preferredTime,
                value: _formatDateTime(context, _preferredTime),
              ),
              _SummaryLine(label: l10n.passengerCount, value: '$_count'),
              const SizedBox(height: AppTokens.spaceMedium),
              OutlinedButton.icon(
                key: const ValueKey('changeSearchButton'),
                onPressed: _loading
                    ? null
                    : () => setState(() {
                        _step = _RequestStep.review;
                        _error = null;
                      }),
                icon: const Icon(Icons.edit_outlined),
                label: Text(l10n.reviewExtractedRequest),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppTokens.spaceLarge),
        if (_results.isEmpty)
          EmptyState(
            title: l10n.noAvailableTrips,
            message: l10n.noAvailableTripsBody,
            icon: Icons.directions_car_outlined,
            actionLabel: l10n.createRequest,
            onAction: _loading ? null : _createRequest,
          )
        else
          for (final offer in _results) ...[
            TripOfferCard(
              offer: offer,
              onBook: _loading ? null : _createRequest,
            ),
            const SizedBox(height: AppTokens.spaceMedium),
          ],
        if (_error != null) _ErrorText(_error!),
      ],
    );
  }

  void _understandRequest() {
    final request = _requestController.text.trim();
    final l10n = AppLocalizations.of(context);
    if (request.isEmpty) {
      setState(() => _error = l10n.requestTextRequired);
      return;
    }

    final extracted = SmartTripRequest.extract(request);
    setState(() {
      _pickup = extracted.pickup;
      _preferredTime = extracted.preferredTime;
      _count = extracted.passengerCount;
      _destinationController.text = l10n.bethlehem;
      _step = _RequestStep.review;
      _error = null;
      _results = const [];
    });
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
    if (time == null || !mounted) return;
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

  Future<void> _search() async {
    final l10n = AppLocalizations.of(context);
    if (!_isBethlehem(_destinationController.text)) {
      setState(() => _error = l10n.destinationUnsupported);
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final departures = await ref
          .read(passengerRepositoryProvider)
          .availableDepartures(
            departureFrom: _preferredTime.subtract(const Duration(hours: 1)),
            departureUntil: _preferredTime.add(const Duration(hours: 1)),
            seats: _count,
          );
      final matching = departures.where((departure) {
        return _samePickup(departure.originLabel, _pickup.label) &&
            _isBethlehem(departure.destinationLabel);
      });
      if (!mounted) return;
      setState(() {
        _results = matching.map(tripOfferFromDeparture).toList(growable: false);
        _step = _RequestStep.results;
      });
    } catch (_) {
      if (mounted) setState(() => _error = l10n.requestFailed);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _createRequest() async {
    final l10n = AppLocalizations.of(context);
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
      if (mounted) setState(() => _error = l10n.validationError);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

class _SummaryLine extends StatelessWidget {
  const _SummaryLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppTokens.spaceSmall),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$label: ',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _ErrorText extends StatelessWidget {
  const _ErrorText(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    return Text(
      message,
      style: TextStyle(color: Theme.of(context).colorScheme.error),
    );
  }
}

String _pickupLabel(AppLocalizations l10n, PickupPreset preset) =>
    preset.key == 'ppu' ? l10n.ppu : l10n.babAlZawiya;

String _formatDateTime(BuildContext context, DateTime value) {
  final material = MaterialLocalizations.of(context);
  return '${material.formatMediumDate(value)}، '
      '${material.formatTimeOfDay(TimeOfDay.fromDateTime(value))}';
}

bool _samePickup(String apiLabel, String selectedLabel) {
  final api = apiLabel.toLowerCase().replaceAll(
    RegExp(r'[^a-z0-9\u0600-\u06ff]'),
    '',
  );
  final selected = selectedLabel.toLowerCase().replaceAll(
    RegExp(r'[^a-z0-9\u0600-\u06ff]'),
    '',
  );
  return api == selected || api.contains(selected) || selected.contains(api);
}

bool _isBethlehem(String value) {
  final normalized = value.trim().toLowerCase();
  return normalized.contains('bethlehem') || normalized.contains('بيت لحم');
}
