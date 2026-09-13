# Task 5 report — Overview and Matching UX

## RED

Command (using the pinned Node 22.17.1 toolchain and specified npm CLI):

`npm run test -w @masari/admin -- src/navigation.test.ts src/features/monitoring/MatchingBatchingMonitoring.test.tsx src/features/monitoring/MatchingResults.test.tsx`

Observed failure: both new component imports could not be resolved because the production files did not exist, and the navigation assertion received `demo` instead of the required `api` backing. The seven pre-existing navigation assertions remained green.

## GREEN

- Focused tests: 3 files, 20 tests passed.
- Full Admin tests: 26 files, 332 tests passed.
- Admin typecheck: passed with `tsc -p tsconfig.json --noEmit`.
- Admin production build: passed with the repository validation environment (`VITE_APP_ENV=production`, non-demo flags, inert staging URL). The first build invocation correctly stopped at the existing configuration guard when these required variables were absent.
- `git diff --check`: passed; only Git line-ending notices were emitted.

## Self-review

- The module is API-backed even with `demoEnabled=false`, keeps all three compatibility aliases, starts on Overview, and no longer renders the demo matching, batching, or comparison controls.
- Overview keeps pending passenger requests and submitted merchant orders separate, labels all-time current state separately from the date-filtered match creation cohort, displays complete zero-valued status maps, and uses the returned range and server observation time.
- Static capability copy states the production-supported legacy scope and accurately marks canonical monitoring, failed-attempt history, and completed batches unavailable without claiming certified production provenance.
- Matching sends status, demand-kind, explicit UTC range, and trimmed exact-ID filters to the server; every filter resets page 1. Initial/default refresh omits dates, while paging echoes the returned server range. Explicit dates remain selected when the server rejects them.
- Overview, list, and detail requests have independent generation gates. Tests cover older deferred responses, stale-data timestamp retention, token/session invalidation, selection replacement, 401/403 list clearing, and 404 detail clearing.
- The matching table and detail render only the bounded monitoring DTO. Combined rows show both passenger-request and merchant-order IDs, score remains a decimal string labeled Score, unknown future states use a neutral badge, and no success rate, confidence, algorithm control, or fake realtime behavior exists.
- English and Arabic copy, RTL layout, responsive grids/tables, labeled filters, keyboard tabs, modal focus entry/trap/return, Escape close, empty/loading/error states, and the page-1000 narrowing instruction are covered.
- Task 6 retains ownership of the full Legacy Batches directory, detail, and parcel paging behavior.

Concerns: none found within Task 5 scope.
