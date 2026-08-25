export type RouteWorkspaceTab = "overview" | "versions" | "stops";

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
        versionEditMode: false
      };
    case "back-to-directory":
      return { ...state, surface: "directory", selectedRouteId: null, selectedVersionId: null, dialog: null, versionEditMode: false };
    case "select-tab":
      return { ...state, tab: action.tab };
    case "select-version":
      return { ...state, selectedVersionId: action.versionId };
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
