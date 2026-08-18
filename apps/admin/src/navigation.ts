import type { IconName } from "./ui/Icon";
import type { TranslationKey } from "./i18n/translations";

/** The ten operational destinations owned by the Admin dashboard. */
export const MODULE_IDS = [
  "overview",
  "users",
  "drivers",
  "trips",
  "routes",
  "deliveries",
  "matchingBatching",
  "incidentsSafety",
  "reports",
  "settings"
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export const NAV_GROUP_IDS = ["main", "people", "operations", "safety", "insights", "system"] as const;
export type NavGroupId = (typeof NAV_GROUP_IDS)[number];

export type NavItem = {
  id: ModuleId;
  icon: IconName;
  labelKey: TranslationKey;
  group: NavGroupId;
  /**
   * What the module needs in order to show real data:
   * - "api"  — a production endpoint exists today
   * - "demo" — existing tools are available only in demo builds
   * - "flag" — existing tools are gated behind a build flag
   * - "none" — no backing endpoint yet; renders an honest empty state
   */
  backing: "api" | "demo" | "flag" | "none";
};

export const NAV_GROUPS: Array<{ id: NavGroupId; labelKey: TranslationKey }> = [
  { id: "main", labelKey: "navGroupMain" },
  { id: "people", labelKey: "navGroupPeople" },
  { id: "operations", labelKey: "navGroupOperations" },
  { id: "safety", labelKey: "navGroupSafety" },
  { id: "insights", labelKey: "navGroupInsights" },
  { id: "system", labelKey: "navGroupSystem" }
];

export const NAV_ITEMS: NavItem[] = [
  { id: "overview", icon: "dashboard", labelKey: "navOverview", group: "main", backing: "api" },
  { id: "users", icon: "account_circle", labelKey: "navUsers", group: "people", backing: "api" },
  { id: "drivers", icon: "verified_user", labelKey: "navDrivers", group: "people", backing: "api" },
  { id: "trips", icon: "local_shipping", labelKey: "navTrips", group: "operations", backing: "api" },
  { id: "routes", icon: "edit_road", labelKey: "navRoutes", group: "operations", backing: "flag" },
  { id: "deliveries", icon: "inventory_2", labelKey: "navDeliveries", group: "operations", backing: "api" },
  {
    id: "matchingBatching",
    icon: "alt_route",
    labelKey: "navMatchingBatching",
    group: "operations",
    backing: "demo"
  },
  {
    id: "incidentsSafety",
    icon: "emergency",
    labelKey: "navIncidentsSafety",
    group: "safety",
    backing: "none"
  },
  { id: "reports", icon: "assessment", labelKey: "navReports", group: "insights", backing: "none" },
  { id: "settings", icon: "settings", labelKey: "navSettings", group: "system", backing: "api" }
];

export type ModuleFlags = { demoEnabled: boolean; routeManagementEnabled: boolean };

/** Keep the information architecture stable across environments. */
export function visibleNavItems(_flags: ModuleFlags): NavItem[] {
  return NAV_ITEMS;
}

export function isModuleAvailable(id: ModuleId, flags: ModuleFlags): boolean {
  const item = NAV_ITEMS.find((candidate) => candidate.id === id);
  if (!item) return false;
  if (item.backing === "demo") return flags.demoEnabled;
  if (item.backing === "flag") return flags.routeManagementEnabled;
  return item.backing === "api";
}

export function resolveActiveModule(active: ModuleId, _flags: ModuleFlags): ModuleId {
  return MODULE_IDS.includes(active) ? active : "overview";
}

const HASH_BY_MODULE: Record<ModuleId, string> = {
  overview: "#/overview",
  users: "#/users",
  drivers: "#/drivers",
  trips: "#/trips",
  routes: "#/routes",
  deliveries: "#/deliveries-orders",
  matchingBatching: "#/matching-batching",
  incidentsSafety: "#/incidents-safety",
  reports: "#/reports",
  settings: "#/settings"
};

const MODULE_BY_HASH = new Map<string, ModuleId>([
  ...Object.entries(HASH_BY_MODULE).map(([id, hash]) => [hash, id as ModuleId] as const),
  // Compatibility aliases for the previous flat console modules.
  ["#/verification", "drivers"],
  ["#/requests", "deliveries"],
  ["#/matching", "matchingBatching"],
  ["#/batching", "matchingBatching"],
  ["#/comparison", "matchingBatching"],
  ["#/incidents", "incidentsSafety"],
  ["#/safety", "incidentsSafety"],
  ["#/ai-review", "incidentsSafety"]
]);

export function hashForModule(id: ModuleId) {
  return HASH_BY_MODULE[id];
}

export function moduleFromHash(hash: string): ModuleId {
  const normalized = hash.replace(/\/+$/, "") || "#/overview";
  return MODULE_BY_HASH.get(normalized) ?? "overview";
}
