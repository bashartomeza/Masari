import 'package:flutter/material.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import '../../../core/widgets/unavailable_tab.dart';

/// The notifications tab, shared by every role.
///
/// The flow diagrams give all three roles a notifications destination, but the
/// schema has no notification table and no endpoint delivers one, so there is
/// nothing to list. The tab states that rather than showing a permanently empty
/// inbox that looks like a delivery failure.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return UnavailableTab(
      key: const ValueKey('notificationsTab'),
      appBarTitle: l10n.notifications,
      title: l10n.noNotifications,
      message: l10n.notificationsUnavailableBody,
      icon: Icons.notifications_none_outlined,
    );
  }
}
