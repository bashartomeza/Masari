import { describe, expect, it } from "vitest";
import { initialRouteUiState, routeUiReducer } from "./routeManagementModel";

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
});
