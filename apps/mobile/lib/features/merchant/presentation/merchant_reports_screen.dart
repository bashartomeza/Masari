import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/widgets/masari_section.dart';
import '../../../core/widgets/unavailable_tab.dart';
import '../application/merchant_controller.dart';

/// The merchant's "Reports" tab.
///
/// The diagram asks for shipment, performance and cost reports exported to PDF
/// or Excel. None of that exists: there is no reporting endpoint, no export
/// pipeline, and no cost or pricing column to report on. What the tab *can*
/// show honestly is the live count the merchant already has, so the screen
/// leads with that and then states plainly that reporting is not built.
class MerchantReportsScreen extends ConsumerWidget {
  const MerchantReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final dashboard = ref.watch(merchantDashboardProvider);
    final state = dashboard.value;

    return UnavailableTab(
      key: const ValueKey('merchantReportsTab'),
      appBarTitle: l10n.navReports,
      title: l10n.reportsUnavailable,
      message: l10n.reportsUnavailableBody,
      icon: Icons.assessment_outlined,
      extra: MasariSection(
        title: l10n.merchantDashboard,
        child: MasariInfoCard(
          title: l10n.orders,
          icon: Icons.summarize_outlined,
          body: StatStrip(
            stats: [
              (
                label: l10n.orders,
                value: '${state?.orders.length ?? 0}',
                valueKey: const ValueKey('reportsOrderCount'),
              ),
              (
                label: l10n.inDelivery,
                value: '${state?.trips.where((t) => t.isActive).length ?? 0}',
                valueKey: const ValueKey('reportsInDeliveryCount'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
