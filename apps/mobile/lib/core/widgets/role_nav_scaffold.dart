import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:masari_mobile/l10n/app_localizations.dart';

import 'masari_bottom_nav.dart';

/// A bottom-nav destination. The branch it selects is its index in the list, so
/// the order here must match the order of the shell's branches.
class RoleNavDestination {
  const RoleNavDestination({required this.item});

  final MasariNavItem item;
}

/// The single Scaffold that owns the bottom navigation for a role.
///
/// This is the *only* Scaffold that renders a navigation bar. Every top-level
/// tab is a branch of a [StatefulShellRoute.indexedStack], so the bar is part
/// of the shell rather than something each screen opts into — which is why it
/// can no longer disappear when a tab is selected.
///
/// Screens inside a branch may still use their own [Scaffold] for an app bar;
/// nesting is fine because only this one supplies `bottomNavigationBar`.
class RoleShellScaffold extends StatelessWidget {
  const RoleShellScaffold({
    required this.navigationShell,
    required this.destinations,
    super.key,
  });

  final StatefulNavigationShell navigationShell;
  final List<RoleNavDestination> destinations;

  void _onSelected(int index) {
    // `initialLocation: true` only when re-tapping the active tab: that pops
    // the branch back to its root instead of stacking another copy of the same
    // page. Tapping a different tab restores that branch's saved stack and
    // scroll position rather than rebuilding it.
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // The shell body is an IndexedStack, so each branch keeps its state while
      // the others sit offstage.
      body: navigationShell,
      bottomNavigationBar: MasariBottomNav(
        items: [for (final d in destinations) d.item],
        currentIndex: navigationShell.currentIndex,
        onSelected: _onSelected,
      ),
    );
  }
}

/// Bottom-navigation destinations per role.
///
/// The tab sets come from the product flow diagrams, which give each role five
/// destinations. Some of those — notifications, maps and alerts, merchant
/// reports — have no endpoint behind them. They are still present, because the
/// app's structure is meant to match the agreed flows and a missing tab makes
/// the two disagree; each one renders an [UnavailableTab] that names the
/// missing backend rather than an empty list that reads as a failed load.
///
/// Five is the ceiling: [MasariBottomNav] and Material's own guidance both stop
/// being legible past that, which is why the merchant's "create shipment" node
/// stays a primary action on the home and shipments screens instead of a sixth
/// tab.
///
/// The order of each list must match the branch order in the router.
class RoleNavDestinations {
  const RoleNavDestinations._();

  static List<RoleNavDestination> passenger(AppLocalizations l10n) => [
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.home_outlined,
        selectedIcon: Icons.home,
        label: l10n.navHome,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.route_outlined,
        selectedIcon: Icons.route,
        label: l10n.navTrips,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.map_outlined,
        selectedIcon: Icons.map,
        label: l10n.navMapAlerts,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.notifications_none,
        selectedIcon: Icons.notifications,
        label: l10n.navNotifications,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.person_outline,
        selectedIcon: Icons.person,
        label: l10n.navAccount,
      ),
    ),
  ];

  static List<RoleNavDestination> driver(AppLocalizations l10n) => [
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.home_outlined,
        selectedIcon: Icons.home,
        label: l10n.navHome,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.inbox_outlined,
        selectedIcon: Icons.inbox,
        label: l10n.navRequests,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.local_shipping_outlined,
        selectedIcon: Icons.local_shipping,
        label: l10n.navMyTrip,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.insights_outlined,
        selectedIcon: Icons.insights,
        label: l10n.navPerformance,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.person_outline,
        selectedIcon: Icons.person,
        label: l10n.navAccount,
      ),
    ),
  ];

  static List<RoleNavDestination> merchant(AppLocalizations l10n) => [
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.home_outlined,
        selectedIcon: Icons.home,
        label: l10n.navHome,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.inventory_2_outlined,
        selectedIcon: Icons.inventory_2,
        label: l10n.navShipments,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.assessment_outlined,
        selectedIcon: Icons.assessment,
        label: l10n.navReports,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.notifications_none,
        selectedIcon: Icons.notifications,
        label: l10n.navNotifications,
      ),
    ),
    RoleNavDestination(
      item: MasariNavItem(
        icon: Icons.person_outline,
        selectedIcon: Icons.person,
        label: l10n.navAccount,
      ),
    ),
  ];
}
