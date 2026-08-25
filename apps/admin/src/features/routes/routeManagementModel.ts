import type { RouteVersionDraft } from "../../api";

export type RouteWorkspaceTab = "overview" | "versions" | "stops";

type RouteVersionDraftSource = Pick<
  RouteVersionDraft,
  "name_ar" | "name_en" | "description_ar" | "description_en" | "active_from" | "active_until"
>;

export function routeVersionDraftFrom(version: RouteVersionDraftSource): Required<RouteVersionDraft> {
  return {
    name_ar: version.name_ar,
    name_en: version.name_en,
    description_ar: version.description_ar ?? "",
    description_en: version.description_en ?? "",
    active_from: version.active_from ? version.active_from.slice(0, 16) : "",
    active_until: version.active_until ? version.active_until.slice(0, 16) : ""
  };
}

export function normalizeRouteVersionDraft(draft: RouteVersionDraft): Required<RouteVersionDraft> {
  return {
    name_ar: draft.name_ar,
    name_en: draft.name_en,
    description_ar: draft.description_ar ?? "",
    description_en: draft.description_en ?? "",
    active_from: draft.active_from ? new Date(draft.active_from).toISOString() : null,
    active_until: draft.active_until ? new Date(draft.active_until).toISOString() : null
  };
}

export type RouteLifecycleDialogAction =
  | "clone"
  | "publish"
  | "pause"
  | "resume"
  | "retire-version"
  | "retire-route";

export function lifecycleActionRequiresReason(action: RouteLifecycleDialogAction) {
  return action === "pause" || action === "retire-version" || action === "retire-route";
}

export type RouteDialogName =
  | "create-route"
  | "create-version"
  | "add-stop"
  | "create-stop"
  | "edit-stop"
  | "lifecycle"
  | null;

export type RouteFeedbackScope = "page" | "create-route" | "version-editor" | "stops" | "stop-editor" | "lifecycle";
export type RouteFeedbackKind = "success" | "error";

export type RouteUiState = {
  surface: "directory" | "workspace";
  selectedRouteId: string | null;
  selectedVersionId: string | null;
  tab: RouteWorkspaceTab;
  dialog: RouteDialogName;
  versionEditMode: boolean;
  feedback: { scope: RouteFeedbackScope; kind: RouteFeedbackKind; text: string } | null;
};

export const initialRouteUiState: RouteUiState = {
  surface: "directory",
  selectedRouteId: null,
  selectedVersionId: null,
  tab: "overview",
  dialog: null,
  versionEditMode: false,
  feedback: null
};

export type RouteUiAction =
  | { type: "open-route"; routeId: string }
  | { type: "back-to-directory" }
  | { type: "select-tab"; tab: RouteWorkspaceTab }
  | { type: "select-version"; versionId: string | null }
  | { type: "open-dialog"; dialog: Exclude<RouteDialogName, null> }
  | { type: "close-dialog" }
  | { type: "begin-version-edit" }
  | { type: "cancel-version-edit" }
  | { type: "feedback"; scope: RouteFeedbackScope; kind: RouteFeedbackKind; text: string }
  | { type: "clear-feedback" };

export function routeUiReducer(state: RouteUiState, action: RouteUiAction): RouteUiState {
  switch (action.type) {
    case "open-route":
      return {
        ...state,
        surface: "workspace",
        selectedRouteId: action.routeId,
        selectedVersionId: null,
        tab: "overview",
        dialog: null,
        versionEditMode: false,
        feedback: null
      };
    case "back-to-directory":
      return {
        ...state,
        surface: "directory",
        selectedRouteId: null,
        selectedVersionId: null,
        dialog: null,
        versionEditMode: false,
        feedback: null
      };
    case "select-tab":
      return { ...state, tab: action.tab };
    case "select-version":
      return { ...state, selectedVersionId: action.versionId, versionEditMode: false };
    case "open-dialog":
      return { ...state, dialog: action.dialog };
    case "close-dialog":
      return { ...state, dialog: null };
    case "begin-version-edit":
      return { ...state, versionEditMode: true };
    case "cancel-version-edit":
      return { ...state, versionEditMode: false };
    case "feedback":
      return { ...state, feedback: { scope: action.scope, kind: action.kind, text: action.text } };
    case "clear-feedback":
      return { ...state, feedback: null };
  }
}
