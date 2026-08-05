import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/unavailable_tab.dart';
import '../../canonical_routes/application/canonical_route_controller.dart';

/// The passenger's "Map & alerts" tab.
///
/// Two diagram branches live here and neither is backed: `GET /capabilities`
/// reports `maps_available: false` and `live_tracking_available: false`, and no
/// endpoint accepts an incident report. The tab therefore states both facts
/// instead of drawing a decorative map or offering a report button that would
/// discard whatever the passenger typed.
class PassengerMapAlertsScreen extends ConsumerWidget {
  const PassengerMapAlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final capabilities = ref.watch(mobileCapabilitiesProvider).value;

    // Read from the server rather than assumed: if maps are ever switched on,
    // this screen should stop claiming they are missing.
    final mapsAvailable = capabilities?.mapsAvailable == true;

    return UnavailableTab(
      key: const ValueKey('passengerMapAlertsTab'),
      appBarTitle: l10n.navMapAlerts,
      title: mapsAvailable ? l10n.mapNoLocation : l10n.mapsUnavailable,
      message: l10n.mapsUnavailableBody,
      icon: Icons.map_outlined,
      extra: MasariSection(
        title: l10n.incidentReports,
        child: MasariInfoCard(
          title: l10n.incidentReportingUnavailable,
          subtitle: l10n.incidentReportingUnavailableBody,
          icon: Icons.report_gmailerrorred_outlined,
        ),
      ),
    );
  }
}
