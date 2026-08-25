# Task 3 report — Route Workspace, Overview, Readiness, and Contextual Lifecycle Menu

## Delivered

- Added `RouteWorkspace` with a compact back action, localized route-name fallback, LTR-isolated route/version identifiers, four separately labeled status concepts, and one accessible Overview/Versions/Stops tablist with a single active panel.
- Added `RouteOverview` with concise route identity, current-version summary, publish-readiness, lifecycle, and secondary map-status sections.
- Added `PublishReadiness`, rendering all six advisory checks with visible ready/failed symbols and text. An empty issue list marks every advisory check ready and explicitly states that backend validation remains authoritative.
- Added one keyboard-usable `RouteActionMenu`. Version actions retain the existing draft/published/paused/retired eligibility; stable-route retirement remains a separately labeled route-level action in the same menu.
- Replaced browser confirmations for route/version lifecycle mutations with the existing accessible `RouteDialog`. Reasons remain required only for pause, version retirement, and route retirement.
- Kept `RouteManagement` as the sole API controller. Clone, publish, pause, resume, version-retire, and route-retire payloads, expected revision/current pointer fields, idempotency fingerprints, settlement rules, and 409 authoritative reloads are unchanged in meaning.
- Scoped lifecycle failures to the Overview lifecycle section after the dialog closes, while successful version actions remain visible at workspace level. Reducer tab state is not changed by authoritative reloads.
- Kept the existing Stop-retirement reason input available inside the Stops panel pending the focused Task 5 refactor.

## Witnessed TDD

1. RED: `RouteWorkspace.test.tsx` failed because `./RouteWorkspace` did not exist. GREEN: the workspace identity/status/tab tests passed after implementation.
2. RED: `RouteOverview.test.tsx` failed because the overview/readiness/action-menu components did not exist, and `routeManagementModel.test.ts` failed because the reason-rule helper was absent. GREEN: 20/20 tests passed after the minimal components/helper.
3. RED: the workspace responsive test failed because workspace/menu/mobile CSS hooks were absent. GREEN: the workspace file passed after the responsive component styles were added.
4. RED: the lifecycle-feedback regression showed scoped errors disappeared with the closed dialog. GREEN: lifecycle feedback now remains visible in the Overview lifecycle section.
5. RED: the confirmation-focus regression showed focus returning to a hidden menu item. GREEN: selecting an action focuses the trigger before opening the dialog, so dialog dismissal restores focus correctly.
6. RED: the tab keyboard regression showed ArrowRight did not select the next panel. GREEN: Arrow/Home/End tab navigation now updates selection and focus.
7. RED: Admin typecheck rejected a ref on the non-forwarding shared `Button`. GREEN: the menu trigger uses a native styled button and typecheck passes.

## Verification

- Focused Task 3 route tests: 47/47 passed.
- Full Admin tests: 167/167 passed.
- `npm run typecheck:admin` passed.
- Configured local non-demo `npm run build:admin` passed.
- `git diff --check` passed.

## Concerns

None.
