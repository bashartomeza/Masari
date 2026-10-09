import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/api/api_error.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/language_switch.dart';
import '../../../core/widgets/masari_card.dart';
import '../../../core/widgets/masari_map.dart';
import '../../canonical_routes/domain/canonical_route_models.dart';
import '../../matching/data/matching_repository.dart';
import '../data/passenger_models.dart';
import '../data/passenger_repository.dart';
import 'location_picker_screen.dart';

class CreateRequestScreen extends ConsumerStatefulWidget {
  const CreateRequestScreen({super.key});

  @override
  ConsumerState<CreateRequestScreen> createState() =>
      _CreateRequestScreenState();
}

class _CreateRequestScreenState
    extends ConsumerState<CreateRequestScreen> {
  PassengerLocation? _pickup;
  PassengerLocation? _destination;

  DateTime _preferredTime =
      DateTime.now().add(const Duration(hours: 1));

  int _count = 1;
  bool _loading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    final canSubmit =
        _pickup != null &&
        _destination != null &&
        !_loading;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(
            AppTokens.spaceLarge,
          ),
          children: [
            const Align(
              alignment: AlignmentDirectional.centerEnd,
              child: LanguageSwitch(),
            ),

            Text(
              l10n.createRequest,
              style: theme.textTheme.headlineMedium,
            ),

            const SizedBox(
              height: AppTokens.spaceLarge,
            ),

            // ----------------------------------------------------------
            // PICKUP + DESTINATION
            // ----------------------------------------------------------

            MasariCard(
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.stretch,
                children: [
                  Text(
                    l10n.pickup,
                    style:
                        theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                  const SizedBox(
                    height: AppTokens.spaceSmall,
                  ),

                  _LocationButton(
                    icon: Icons.trip_origin_rounded,
                    title: _pickup?.label ??
                        'اختاري موقع الانطلاق',
                    subtitle: _pickup == null
                        ? 'اضغطي لاختيار الموقع من الخريطة'
                        : _coordinatesText(_pickup!),
                    selected: _pickup != null,
                    onTap: _loading
                        ? null
                        : () => _chooseLocation(
                              isPickup: true,
                            ),
                  ),

                  const SizedBox(
                    height: AppTokens.spaceMedium,
                  ),

                  Text(
                    l10n.destination,
                    style:
                        theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                  const SizedBox(
                    height: AppTokens.spaceSmall,
                  ),

                  _LocationButton(
                    icon: Icons.location_on_rounded,
                    title: _destination?.label ??
                        'اختاري الوجهة',
                    subtitle: _destination == null
                        ? 'اضغطي لاختيار الوجهة من الخريطة'
                        : _coordinatesText(
                            _destination!,
                          ),
                    selected: _destination != null,
                    onTap: _loading
                        ? null
                        : () => _chooseLocation(
                              isPickup: false,
                            ),
                  ),
                ],
              ),
            ),

            // ----------------------------------------------------------
            // MAP PREVIEW
            // ----------------------------------------------------------

            if (_pickup != null ||
                _destination != null) ...[
              const SizedBox(
                height: AppTokens.spaceMedium,
              ),

              MasariCard(
                padding: EdgeInsets.zero,
                child: ClipRRect(
                  borderRadius:
                      BorderRadius.circular(20),
                  child: MasariMap(
                    height: 300,
                    emptyLabel: '',
                    attributionLabel:
                        '© OpenStreetMap contributors',
                    markers: [
                      if (_pickup != null)
                        MasariMapMarker(
                          position: GeoPoint(
                            _pickup!.latitude,
                            _pickup!.longitude,
                          ),
                          icon:
                              Icons.trip_origin_rounded,
                          color:
                              theme.colorScheme.primary,
                          label: _pickup!.label,
                        ),

                      if (_destination != null)
                        MasariMapMarker(
                          position: GeoPoint(
                            _destination!.latitude,
                            _destination!.longitude,
                          ),
                          icon:
                              Icons.location_on_rounded,
                          color:
                              theme.colorScheme.error,
                          label:
                              _destination!.label,
                        ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(
              height: AppTokens.spaceMedium,
            ),

            // ----------------------------------------------------------
            // TIME + PASSENGERS
            // ----------------------------------------------------------

            MasariCard(
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.stretch,
                children: [
                  OutlinedButton.icon(
                    onPressed:
                        _loading ? null : _pickTime,
                    icon: const Icon(
                      Icons.schedule_rounded,
                    ),
                    label: Text(
                      '${l10n.preferredTime}: '
                      '${_preferredTime.toLocal()}',
                    ),
                  ),

                  const SizedBox(
                    height: AppTokens.spaceMedium,
                  ),

                  DropdownButtonFormField<int>(
                    initialValue: _count,
                    decoration: InputDecoration(
                      labelText:
                          l10n.passengerCount,
                      prefixIcon: const Icon(
                        Icons.people_alt_outlined,
                      ),
                    ),
                    items: [1, 2, 3, 4]
                        .map(
                          (count) =>
                              DropdownMenuItem(
                            value: count,
                            child: Text('$count'),
                          ),
                        )
                        .toList(),
                    onChanged: _loading
                        ? null
                        : (value) {
                            setState(() {
                              _count = value ?? 1;
                            });
                          },
                  ),

                  if (_error != null) ...[
                    const SizedBox(
                      height: AppTokens.spaceMedium,
                    ),
                    Text(
                      _error!,
                      style: TextStyle(
                        color:
                            theme.colorScheme.error,
                      ),
                    ),
                  ],

                  const SizedBox(
                    height: AppTokens.spaceLarge,
                  ),

                  FilledButton.icon(
                    onPressed:
                        canSubmit ? _submit : null,
                    icon: _loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child:
                                CircularProgressIndicator(
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(
                            Icons.send_rounded,
                          ),
                    label: Text(
                      l10n.submitRequest,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ----------------------------------------------------------------------
  // LOCATION PICKER
  // ----------------------------------------------------------------------

  Future<void> _chooseLocation({
    required bool isPickup,
  }) async {
    final current =
        isPickup ? _pickup : _destination;

    final result =
        await Navigator.of(context)
            .push<PassengerLocation>(
      MaterialPageRoute(
        builder: (_) =>
            PassengerLocationPickerScreen(
          title: isPickup
              ? 'اختيار موقع الانطلاق'
              : 'اختيار الوجهة',
          initialLocation: current,
        ),
      ),
    );

    if (result == null || !mounted) return;

    setState(() {
      if (isPickup) {
        _pickup = result;
      } else {
        _destination = result;
      }

      _error = null;
    });
  }

  // ----------------------------------------------------------------------
  // TIME PICKER
  // ----------------------------------------------------------------------

  Future<void> _pickTime() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(
        const Duration(days: 14),
      ),
      initialDate: _preferredTime,
    );

    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(
        _preferredTime,
      ),
    );

    if (time == null) return;

    setState(() {
      _preferredTime = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    });
  }

  // ----------------------------------------------------------------------
  // SUBMIT
  // ----------------------------------------------------------------------

  Future<void> _submit() async {
    if (_pickup == null ||
        _destination == null) {
      setState(() {
        _error =
            'اختاري موقع الانطلاق والوجهة أولاً';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final created = await ref
          .read(passengerRepositoryProvider)
          .createRequest(
            pickup: _pickup!,
            destination: _destination!,
            preferredTime: _preferredTime,
            passengerCount: _count,
          );

      try {
        final match = await ref
            .read(matchingRepositoryProvider)
            .runForPassengerRequest(created.id);
        if (mounted) {
          context.go('/passenger/match/${match.id}');
        }
      } catch (error) {
        // The request is already persisted. A matching failure (including no
        // compatible driver) must never discard it or encourage a duplicate
        // submission; the detail screen can retry matching against real data.
        if (mounted) {
          final l10n = AppLocalizations.of(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(_matchingCreateErrorLabel(l10n, error))),
          );
          context.go('/passenger/request/${created.id}');
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              AppLocalizations.of(context)
                  .validationError;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  // ----------------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------------

  String _coordinatesText(
    PassengerLocation location,
  ) {
    return '${location.latitude.toStringAsFixed(6)}, '
        '${location.longitude.toStringAsFixed(6)}';
  }
}

String _matchingCreateErrorLabel(AppLocalizations l10n, Object error) {
  if (error is! ApiException) return l10n.requestFailed;
  if (error.type == ApiErrorType.network) return l10n.networkUnavailable;
  if (error.type == ApiErrorType.timeout) return l10n.requestTimedOut;
  return error.message == 'no_compatible_driver_route'
      ? l10n.noCompatibleDriverFound
      : l10n.requestFailed;
}

// ==========================================================================
// LOCATION BUTTON
// ==========================================================================

class _LocationButton extends StatelessWidget {
  const _LocationButton({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius:
          BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(
          AppTokens.spaceMedium,
        ),
        decoration: BoxDecoration(
          borderRadius:
              BorderRadius.circular(16),
          border: Border.all(
            color: selected
                ? theme.colorScheme.primary
                : theme.colorScheme
                    .outlineVariant,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected
                    ? theme.colorScheme.primary
                        .withValues(alpha: 0.12)
                    : theme.colorScheme
                        .surfaceContainerHighest,
              ),
              child: Icon(
                icon,
                color: selected
                    ? theme.colorScheme.primary
                    : theme.colorScheme
                        .onSurfaceVariant,
              ),
            ),

            const SizedBox(
              width: AppTokens.spaceMedium,
            ),

            Expanded(
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow:
                        TextOverflow.ellipsis,
                    style: theme
                        .textTheme.titleSmall
                        ?.copyWith(
                      fontWeight:
                          FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    maxLines: 2,
                    overflow:
                        TextOverflow.ellipsis,
                    style: theme
                        .textTheme.bodySmall
                        ?.copyWith(
                      color: theme.colorScheme
                          .onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(width: 8),

            Icon(
              Icons.chevron_right_rounded,
              color: theme.colorScheme
                  .onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}
