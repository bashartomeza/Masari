import { describe, expect, it } from "vitest";
import {
  initialRouteUiState,
  lifecycleActionRequiresReason,
  normalizeRouteVersionDraft,
  routeUiReducer,
  routeVersionDraftFrom
} from "./routeManagementModel";

describe("routeManagementModel", () => {
  it("opens a selected route in its overview workspace", () => {
    const next = routeUiReducer(initialRouteUiState, { type: "open-route", routeId: "route-1" });

    expect(next).toMatchObject({
      surface: "workspace",
      selectedRouteId: "route-1",
      selectedVersionId: null,
      tab: "overview"
    });
  });

  it("keeps tab and version selection feature-local", () => {
    const workspace = routeUiReducer(initialRouteUiState, { type: "open-route", routeId: "route-1" });
    const versionSelected = routeUiReducer(workspace, { type: "select-version", versionId: "version-2" });
    const next = routeUiReducer(versionSelected, { type: "select-tab", tab: "versions" });

    expect(next).toMatchObject({
      surface: "workspace",
      selectedRouteId: "route-1",
      selectedVersionId: "version-2",
      tab: "versions"
    });
  });

  it("clears route-scoped feedback when leaving or opening a route identity", () => {
    const routeA = {
      ...initialRouteUiState,
      surface: "workspace" as const,
      selectedRouteId: "route-a",
      selectedVersionId: "version-a",
      feedback: { scope: "lifecycle" as const, kind: "error" as const, text: "Route A changed" }
    };

    const directory = routeUiReducer(routeA, { type: "back-to-directory" });
    const routeB = routeUiReducer(directory, { type: "open-route", routeId: "route-b" });

    expect(directory).toMatchObject({ surface: "directory", selectedRouteId: null, feedback: null });
    expect(routeB).toMatchObject({ surface: "workspace", selectedRouteId: "route-b", feedback: null });
  });

  it.each(["create-route", "create-version", "add-stop", "create-stop", "edit-stop", "lifecycle"] as const)(
    "opens and closes %s without changing the selected route",
    (dialog) => {
      const workspace = {
        ...initialRouteUiState,
        surface: "workspace" as const,
        selectedRouteId: "route-1",
        selectedVersionId: "version-2",
        tab: "stops" as const
      };

      const opened = routeUiReducer(workspace, { type: "open-dialog", dialog });
      const closed = routeUiReducer(opened, { type: "close-dialog" });

      expect(opened).toMatchObject({ selectedRouteId: "route-1", dialog });
      expect(closed).toMatchObject({
        selectedRouteId: "route-1",
        selectedVersionId: "version-2",
        tab: "stops",
        dialog: null
      });
    }
  );

  it("exits draft edit mode when an edit is cancelled", () => {
    const editing = routeUiReducer(initialRouteUiState, { type: "begin-version-edit" });
    const next = routeUiReducer(editing, { type: "cancel-version-edit" });

    expect(editing.versionEditMode).toBe(true);
    expect(next.versionEditMode).toBe(false);
  });

  it("exits draft edit mode when selection is reconciled to an authoritative version", () => {
    const editing = { ...initialRouteUiState, versionEditMode: true, selectedVersionId: "version-before" };
    const next = routeUiReducer(editing, { type: "select-version", versionId: "version-after" });

    expect(next).toMatchObject({ selectedVersionId: "version-after", versionEditMode: false });
  });

  it("restores an authoritative draft shape and normalizes edited local dates for the update contract", () => {
    const draft = routeVersionDraftFrom({
      name_ar: "مسار الخليل",
      name_en: "Hebron route",
      description_ar: null,
      description_en: "A draft",
      active_from: "2026-08-25T06:00:00.000Z",
      active_until: null
    });

    expect(draft).toEqual({
      name_ar: "مسار الخليل",
      name_en: "Hebron route",
      description_ar: "",
      description_en: "A draft",
      active_from: "2026-08-25T06:00",
      active_until: ""
    });
    expect(normalizeRouteVersionDraft(draft)).toEqual({
      ...draft,
      active_from: new Date("2026-08-25T06:00").toISOString(),
      active_until: null
    });
  });

  it("preserves the logical workspace when a stale mutation is reloaded", () => {
    const state = {
      ...initialRouteUiState,
      surface: "workspace" as const,
      selectedRouteId: "route-1",
      selectedVersionId: "version-2",
      tab: "stops" as const
    };
    const next = routeUiReducer(state, {
      type: "feedback",
      scope: "stops",
      kind: "error",
      text: "Another session changed this draft"
    });
    expect(next).toMatchObject({
      surface: "workspace",
      selectedRouteId: "route-1",
      selectedVersionId: "version-2",
      tab: "stops",
      feedback: { scope: "stops", kind: "error" }
    });
  });

  it("requires reasons only for the existing pause and retirement semantics", () => {
    expect(lifecycleActionRequiresReason("pause")).toBe(true);
    expect(lifecycleActionRequiresReason("retire-version")).toBe(true);
    expect(lifecycleActionRequiresReason("retire-route")).toBe(true);
    expect(lifecycleActionRequiresReason("clone")).toBe(false);
    expect(lifecycleActionRequiresReason("publish")).toBe(false);
    expect(lifecycleActionRequiresReason("resume")).toBe(false);
  });
});
