import type { IconName } from "./ui/Icon";
import type { TranslationKey } from "./i18n/translations";

/** The sidebar tabs defined by the admin flow diagram, in order. */
export const MODULE_IDS = [
  "overview",
  "users",
  "verification",
  "requests",
  "matching",
  "batching",
  "trips",
  "routes",
  "comparison",
  "incidents",
  "safety",
  "aiReview",
  "reports",
  "settings"
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export type NavItem = {
  id: ModuleId;
  icon: IconName;
  labelKey: TranslationKey;
  /**
   * What the module needs in order to show real data:
   * - "api"  — a production endpoint exists today
   * - "demo" — only reachable through the demo API client
   * - "flag" — gated behind a build flag
   * - "none" — no backing endpoint yet; renders an empty state
   */
  backing: "api" | "demo" | "flag" | "none";
};

export const NAV_ITEMS: NavItem[] = [
  { id: "overview", icon: "dashboard", labelKey: "navOverview", backing: "api" },
  { id: "users", icon: "account_circle", labelKey: "navUsers", backing: "api" },
  // Backed by `GET /admin/drivers` plus `PATCH /admin/users/:id/status`. It was
  // previously marked "none" and rendered a placeholder, so those endpoints
  // were never read by the console.
  { id: "verification", icon: "verified_user", labelKey: "navVerification", backing: "api" },
  { id: "requests", icon: "person_pin_circle", labelKey: "navRequests", backing: "api" },
  { id: "matching", icon: "alt_route", labelKey: "navMatching", backing: "demo" },
  { id: "batching", icon: "inventory_2", labelKey: "navBatching", backing: "demo" },
  { id: "trips", icon: "local_shipping", labelKey: "navTrips", backing: "api" },
  { id: "routes", icon: "edit_road", labelKey: "navRoutes", backing: "flag" },
  { id: "comparison", icon: "analytics", labelKey: "navComparison", backing: "demo" },
  { id: "incidents", icon: "report", labelKey: "navIncidents", backing: "none" },
  { id: "safety", icon: "emergency", labelKey: "navSafety", backing: "none" },
  { id: "aiReview", icon: "psychology", labelKey: "navAiReview", backing: "none" },
  { id: "reports", icon: "assessment", labelKey: "navReports", backing: "none" },
  { id: "settings", icon: "settings", labelKey: "navSettings", backing: "api" }
];

export type ModuleFlags = { demoEnabled: boolean; routeManagementEnabled: boolean };

/**
 * Route management stays hidden entirely when its flag is off, matching the
 * previous console behaviour. Demo-only modules remain listed so the
 * information architecture is stable across builds; they render an
 * "unavailable in this build" state instead of demo controls.
 */
export function visibleNavItems(flags: ModuleFlags): NavItem[] {
  return NAV_ITEMS.filter((item) => (item.id === "routes" ? flags.routeManagementEnabled : true));
}

export function isModuleAvailable(id: ModuleId, flags: ModuleFlags): boolean {
  const item = NAV_ITEMS.find((candidate) => candidate.id === id);
  if (!item) return false;
  if (item.backing === "demo") return flags.demoEnabled;
  if (item.backing === "flag") return flags.routeManagementEnabled;
  return item.backing === "api";
}

/** Falls back to the overview when a flag change hides the active module. */
export function resolveActiveModule(active: ModuleId, flags: ModuleFlags): ModuleId {
  return visibleNavItems(flags).some((item) => item.id === active) ? active : "overview";
}
