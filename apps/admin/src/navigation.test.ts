import { describe, expect, it } from "vitest";
import { MODULE_IDS, NAV_ITEMS, isModuleAvailable, resolveActiveModule, visibleNavItems } from "./navigation";
import { translations } from "./i18n/translations";

const allOn = { demoEnabled: true, routeManagementEnabled: true };
const allOff = { demoEnabled: false, routeManagementEnabled: false };

describe("admin navigation", () => {
  it("defines the sidebar tabs from the admin flow diagram, in order", () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual([...MODULE_IDS]);
    expect(NAV_ITEMS).toHaveLength(14);
  });

  it("has a translated label for every tab in both locales", () => {
    for (const item of NAV_ITEMS) {
      expect(translations.ar[item.labelKey]).toBeTruthy();
      expect(translations.en[item.labelKey]).toBeTruthy();
    }
  });

  it("hides route management when its build flag is off and keeps every other tab", () => {
    expect(visibleNavItems(allOn).map((item) => item.id)).toContain("routes");
    expect(visibleNavItems(allOff).map((item) => item.id)).not.toContain("routes");
    expect(visibleNavItems(allOff)).toHaveLength(NAV_ITEMS.length - 1);
  });

  it("marks demo-only modules unavailable in a non-demo build without hiding them", () => {
    expect(isModuleAvailable("matching", allOn)).toBe(true);
    expect(isModuleAvailable("batching", allOff)).toBe(false);
    expect(isModuleAvailable("comparison", allOff)).toBe(false);
    expect(visibleNavItems(allOff).map((item) => item.id)).toContain("matching");
  });

  it("treats tabs with no endpoint as unavailable so they never render invented data", () => {
    expect(isModuleAvailable("incidents", allOn)).toBe(false);
    expect(isModuleAvailable("safety", allOn)).toBe(false);
    expect(isModuleAvailable("aiReview", allOn)).toBe(false);
    expect(isModuleAvailable("reports", allOn)).toBe(false);
  });

  // `GET /admin/drivers` and `PATCH /admin/users/:id/status` back these two.
  // They were previously marked "none", which is what left the console
  // rendering a placeholder over working endpoints.
  it("marks the user and verification modules as API-backed", () => {
    expect(isModuleAvailable("users", allOff)).toBe(true);
    expect(isModuleAvailable("verification", allOff)).toBe(true);
  });

  it("falls back to the overview when the active module is hidden by a flag change", () => {
    expect(resolveActiveModule("routes", allOn)).toBe("routes");
    expect(resolveActiveModule("routes", allOff)).toBe("overview");
    expect(resolveActiveModule("trips", allOff)).toBe("trips");
  });
});
