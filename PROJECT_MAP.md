# PROJECT_MAP.md

[PROJECT_OVERVIEW]
Masari is a Palestine-focused smart route-sharing logistics MVP.

Current implementation status: M6B1B Production HTTP Security, Request Traceability, Rate Limiting, and Readiness.

Locked MVP corridor:
Hebron / PPU / Bab Al-Zawiya -> Bethlehem.

Implemented in M1:
- TypeScript backend API foundation.
- PostgreSQL Prisma schema.
- Seeded demo accounts.
- Deterministic demo reset endpoint.
- Auth login endpoint.
- Protected `/api/v1/me` endpoint.
- Structured audit events for login and demo reset.

Implemented in M2A:
- Passenger manual request APIs.
- Driver locked-corridor route APIs.
- Merchant order/parcels APIs.
- Admin read-only dashboard/list APIs.
- Role guards and ownership checks.
- Audit events for manual role actions.

Implemented in M2B:
- Route-based matching API.
- Merchant parcel batching API.
- Masari vs nearest-driver comparison API.
- Persistent `ParcelBatch`, `Match`, and `ComparisonRun` records.
- Deterministic Haversine-based demo metrics.
- Audit events for match decisions, parcel batches, and comparison runs.

Implemented in M3A:
- Driver/admin match accept and reject APIs.
- Trip creation on match acceptance.
- Trip visibility and status update APIs.
- Deterministic simulated tracking API.
- Latest trip location polling API.
- Status side effects across driver route, passenger request, merchant order, parcel batch, and parcels.
- Audit events for match accept/reject, trip status updates, and tracking events.

Implemented in M3B:
- React/Vite admin demo console under `apps/admin`.
- Admin login and current-admin session loading.
- Demo reset panel with reset-key and admin-JWT support.
- Dashboard overview for seeded users, routes, requests, orders, parcels, and trips.
- Matching panel with selected route, score, scoring breakdown, and explanation.
- Parcel batching panel with batch id, parcel count, distance saved, and explanation.
- Comparison table for Masari vs nearest-driver metrics.
- Trip control panel for match accept/reject and valid status progression.
- Deterministic tracking simulation panel with latest location and route-progress trail.
- Full demo sequence button using existing deterministic APIs.

Implemented in M3C:
- Admin console demo-path QA pass from local dev servers.
- Login screen now shows demo admin credentials.
- Demo reset copy now explains that reset recreates the deterministic judge scenario.
- Full Demo Sequence now shows step-by-step progress.
- Matching panel now labels the selected driver/route more clearly.
- Local API smoke sequence revalidated the full judge demo path.

Implemented in M3D:
- Admin console bilingual localization for Arabic and English.
- Arabic is the default language and uses RTL layout.
- English is optional and uses LTR layout.
- Language switch appears on login and authenticated dashboard.
- Selected language persists in `localStorage` under `masari_locale`.
- Document `<html>` `lang` and `dir` update dynamically.
- UI labels, action text, success/error messages, progress steps, roles, statuses, and demo metrics are translated.
- API enum values remain unchanged and are mapped to translated UI labels.
- Locale-aware number and date/time formatting added for `ar-PS` and `en-US`.

Implemented in M4B:
- Stable Flutter SDK installed under `C:\Users\basha\development\flutter` and added to user PATH.
- Android SDK command-line tools installed under existing Android SDK.
- Android licenses accepted.
- `flutter doctor -v` reports Android-capable environment with no issues.
- Android-only Flutter app created under `apps/mobile`.
- Android application ID set to `ps.masari.mobile`.
- Arabic-default mobile shell implemented with Flutter ARB/gen_l10n.
- English optional language switch implemented.
- Locale persists with `masari_locale`.
- `API_BASE_URL` configured through `String.fromEnvironment`.
- Debug APK builds successfully.
- Android runtime validation passed on emulator `Medium_Phone_API_36.0` / `emulator-5554`, Android 16 API 36.

Implemented in M4C:
- Mobile API client for `POST /api/v1/auth/login` and `GET /api/v1/me` only.
- JWT storage uses `flutter_secure_storage` only.
- Locale storage remains in `shared_preferences` only.
- Startup session restoration reads saved JWT and validates it with `/api/v1/me`.
- 401/invalid token clears secure token and returns to login.
- Temporary network/timeout restore failure preserves the possibly valid token and shows retry.
- Login screen with passenger, driver, and merchant demo presets.
- Logout clears secure token and preserves selected language.
- Role-aware routing for passenger, driver, merchant, and unsupported admin mobile role.
- Passenger, driver, and merchant home shells added as role workspaces only.
- Admin mobile login routes to unsupported-role screen with web-admin guidance.
- No mobile business flows were added.

Implemented in M4D:
- Passenger dashboard backed by existing passenger request and trip APIs.
- Passenger create-request form for the locked corridor only.
- Pickup presets reuse seeded corridor-compatible values: `PPU Main Gate` at `31.550000,35.100000` and `Bab Al-Zawiya` at `31.532600,35.099800`.
- Destination is locked to `Bethlehem Center` at `31.705400,35.202400`.
- Passenger request detail shows status, pickup, destination, preferred time, passenger count, created time, and LTR request ID.
- Passenger cancellation uses existing backend transition rules and refreshes after conflict/error.
- Passenger matching uses `POST /api/v1/matches/run` and `GET /api/v1/matches/:id` only.
- Match result shows selected route, score, scoring breakdown, status, and explanation.
- Passenger trip list/detail uses `GET /api/v1/trips`, `GET /api/v1/trips/:id`, and `GET /api/v1/trips/:id/location` only.
- Passenger trip detail polls REST while visible and pauses/resumes with app lifecycle.
- No driver or merchant business UI was added.
- M4D did not add a role-filtered `GET /api/v1/matches` endpoint; that dependency was completed later in M4E1.

Implemented in M4E1:
- Authenticated role-filtered `GET /api/v1/matches` endpoint.
- Driver inbox is limited to matches connected to the driver's own routes.
- Passenger inbox is limited to matches connected to the passenger's own requests.
- Merchant inbox is limited to matches connected to the merchant's own orders.
- Admin inbox can see all matches.
- Optional `status` query validates against the existing `MatchStatus` enum.
- Match summaries are ordered newest first and expose only safe route/request/order/batch fields.
- `GET /api/v1/matches/:id` now grants the connected driver the same ownership access as the inbox and returns the same safe summary contract.
- No database schema or migration change was required.

Implemented in M4E2:
- Independently audited M4E1 against the source, Prisma relations, automated tests, and a fresh real PostgreSQL smoke; no corrective change was required.
- Replaced the driver placeholder shell with a complete role-protected Flutter driver flow.
- Driver dashboard loads current route, proposed match count, active trip, user identity, language controls, refresh, and logout from real APIs.
- Locked-corridor route view/create/deactivate flow uses backend-fixed corridor coordinates and exposes only seats and parcel capacity as driver choices.
- Driver match inbox and detail use the M4E1 safe match-summary contract, localized status/type labels, scoring breakdown, and accept/reject actions.
- Match acceptance navigates directly to the created driver trip.
- Driver trip UI exposes only the next valid status in the approved lifecycle and refreshes safely after conflicts.
- Deterministic tracking step/reset and latest-location display are available without GPS, maps, Socket.IO, or background tracking.
- Driver trip detail polls every 5 seconds and location every 3 seconds while visible, pauses with app lifecycle, and prevents duplicate timers and overlapping actions.
- Arabic remains the default RTL locale; English is optional LTR and persists independently of the secure JWT session.
- No backend, Prisma schema, migration, or dependency change was required.

Implemented in M4F:
- Replaced the final merchant placeholder with a role-protected Flutter merchant dashboard, locked order form, parcel batching, safe match inbox/detail, and read-only connected trip tracking.
- Persisted safe parcel-batch summaries in merchant order list/detail and rejected duplicate batching with a controlled `409`.
- Completed passenger, driver, and merchant business routing in one Android app; the unused generic role-home shell was removed.

Implemented in M5A:
- Rehearsed the full Arabic-first combined passenger + merchant + selected-driver + admin story against real PostgreSQL, browser, and Android emulator state.
- Linked the newest parcel batch to combined matches/trips so one accepted trip carries passenger request, merchant order, and parcel batch state consistently.
- Stabilized the admin Full Demo Sequence order, live localized progress, accepted/completed result state, and translated network recovery.
- Localized cross-role match explanations and simulated tracking labels; mobile dashboard refresh failures now show translated retry state.
- Added deterministic `demo:preflight` and `demo:smoke` tooling, final screenshots, and `DEMO_RUNBOOK.md`.
- Completed five consecutive clean rehearsals without crash, duplicate trip/batch, or manual database correction.

Implemented in M5B:
- Froze hackathon product scope and limited changes to presentation documentation, preflight service-identity hardening, packaging, rehearsal, and final validation.
- Audited the designated presentation machine, performed a no-snapshot cold start, rehearsed controlled API failure/recovery, and ran three final deterministic presentation checks.
- Added `JUDGE_SCRIPT.md`, `BACKUP_DEMO.md`, `README_DEMO_START.md`, and `RELEASE_NOTES.md`.
- Prepared the ignored `release/masari-hackathon-demo/` package and ZIP with APK, safe templates, evidence, and SHA-256 manifests.

Implemented in M5C:
- Preserved the complete PostgreSQL release at commit `074fc4e7cc79c6b08a2baa18ca251b4802aa48c7` and annotated tag `v0.1.0-hackathon`.
- Migrated the active Prisma datasource from PostgreSQL to MySQL without changing application API contracts, roles, matching, batching, trips, tracking, admin screens, or Flutter screens.
- Replaced `@prisma/adapter-pg`/`pg` with `@prisma/adapter-mariadb`/`mariadb` at Prisma 7.8.0.
- Replaced the active PostgreSQL migration history with a fresh MySQL baseline; PostgreSQL SQL remains available from Git history and the fallback tag.
- Added explicit MySQL `TEXT` storage for explanation/description fields that were unbounded PostgreSQL `TEXT`, preventing an implicit `VARCHAR(191)` capacity regression.
- Updated preflight, smoke environment loading, startup documentation, migration instructions, and release packaging for MySQL.
- Validated five deterministic resets, Arabic/emoji round-trip, full cross-role behavior, and five deterministic MySQL rehearsals against the real local database.

Migration integrity result:
- M2B accidentally modified committed `0001_init` to add M2B audit enum values.
- This was unnecessary because those values belong in `0002_matching_batching_comparison`.
- Corrected by restoring `0001_init` and keeping M2B changes in `0002`.
- Corrective commit created: `chore: normalize Prisma migrations`.

Not implemented yet:
- Mobile/public registration.
- AI parser.
- Live GPS tracking.
- Socket.IO.
- Maps, payments, multi-city support, and app-store deployment.

[TECH_STACK]
Actual local runtime checked on 2026-07:
- Node.js: v22.17.1.
- npm: 10.9.2.
- Flutter: 3.44.6 stable.
- Dart: 3.12.2 stable.
- Flutter SDK path: `C:\Users\basha\development\flutter`.
- Android SDK path: `C:\Users\basha\AppData\Local\Android\Sdk`.
- Android SDK platform: android-36.
- Android build tools: 36.0.0.
- Android Studio bundled JDK selected by Flutter: `C:\Program Files\Android\Android Studio\jbr\bin\java`, OpenJDK 21.0.6.

Package versions checked via `npm view` before pinning:
- express: 5.2.1.
- typescript: 6.0.3.
- prisma: 7.8.0.
- @prisma/client: 7.8.0.
- @prisma/adapter-mariadb: 7.8.0.
- zod: 4.4.3.
- jsonwebtoken: 9.0.3.
- bcryptjs: 3.0.3.
- dotenv: 17.4.2.
- mariadb: 3.4.5.
- @types/express: 5.0.6.
- @types/jsonwebtoken: 9.0.10.
- @types/node: 26.1.0.
- vitest: 4.1.9.
- supertest: 7.2.2.
- @types/supertest: 7.2.0.
- tsx: 4.22.4.
- react: 19.2.7.
- react-dom: 19.2.7.
- vite: 8.1.3.
- @vitejs/plugin-react: 6.0.3.
- @types/react: 19.2.17.
- @types/react-dom: 19.2.3.
- flutter_riverpod: 3.3.2.
- go_router: 17.3.0.
- shared_preferences: 2.5.5.
- http: 1.6.0.
- flutter_secure_storage: 10.3.1.
- intl: 0.20.2, pinned by Flutter 3.44.6 `flutter_localizations`.
- flutter_lints: 6.0.0.

Backend:
- Node.js.
- Express.
- TypeScript.
- Prisma.
- MySQL 8.
- Zod.
- JWT.
- bcryptjs.

Admin console:
- React.
- Vite.
- TypeScript.
- Plain CSS.
- Small typed in-repo i18n dictionary; no external localization library.

Mobile Android app:
- Flutter.
- Dart.
- Android only.
- Riverpod.
- go_router.
- shared_preferences.
- http.
- flutter_secure_storage.
- Flutter SDK `flutter_localizations`.
- Flutter ARB/gen_l10n.

Required admin env:
- `VITE_API_BASE_URL`, for example `http://localhost:3000`.

Localization:
- Supported admin locales: Arabic `ar`, English `en`.
- Default locale: Arabic `ar` unless `masari_locale` is already saved.
- Arabic document mode: `lang="ar"`, `dir="rtl"`.
- English document mode: `lang="en"`, `dir="ltr"`.
- Locale persistence key: `masari_locale`.
- Future Flutter screens must also support Arabic default, English optional, and runtime RTL/LTR switching.

[SYSTEM_FLOW]
M1 flow:
1. Operator configures `DATABASE_URL`, `JWT_SECRET`, and `DEMO_RESET_KEY`.
2. API starts at `PORT`, default `3000`.
3. `GET /api/v1/health` returns health status.
4. `POST /api/v1/demo/reset` resets and seeds demo data.
5. Demo reset is protected by either an admin JWT or `x-demo-reset-key` matching `DEMO_RESET_KEY`.
6. Seeded users can login through `POST /api/v1/auth/login`.
7. Authenticated users can call `GET /api/v1/me`.

M3B admin console flow:
1. Operator starts API and admin app.
2. Admin app reads `VITE_API_BASE_URL`.
3. Judge signs in with seeded admin credentials.
4. Console loads dashboard, routes, passenger requests, merchant orders, and trips.
5. Judge can reset demo data and the console re-authenticates because seeded users are recreated.
6. Judge can run matching, batching, comparison, match accept/reject, trip status progression, and deterministic tracking simulation.

M3D localization flow:
1. First admin visit opens in Arabic without browser-language detection.
2. Language switch toggles `ar` and `en` without resetting auth or demo state.
3. Selected locale is saved to `masari_locale`.
4. Refresh restores the saved locale.
5. UI direction follows locale and technical values such as phone numbers, IDs, URLs, and coordinates remain readable LTR.

M4B mobile shell flow:
1. Android app starts in Arabic when `masari_locale` is not saved.
2. Arabic UI uses RTL through Flutter localization/direction handling.
3. User can switch to English from the welcome shell.
4. Selected language persists under `masari_locale` through `shared_preferences`.
5. Welcome shell shows app-shell status and configured `API_BASE_URL` diagnostics only.
6. No passenger, driver, merchant, auth, matching, trip, or tracking business flow is implemented yet.

M4C mobile auth/session flow:
1. App starts at `/splash` and loads the saved locale independently from auth state.
2. App reads JWT from secure storage key `masari_jwt`.
3. If no token exists, unauthenticated users route to `/login`.
4. If a token exists, app calls `GET /api/v1/me` with `Authorization: Bearer <token>`.
5. If `/me` succeeds, session is restored and user routes by role.
6. If `/me` returns 401 or invalid token, token is deleted and user routes to `/login`.
7. If restore fails due network or timeout, token is preserved and splash shows retry.
8. Login calls `POST /api/v1/auth/login`, saves JWT securely, sets current user, and routes by role.
9. Logout deletes secure JWT, clears auth state, returns to `/login`, and preserves selected language.
10. No refresh token, registration, biometric auth, GPS, maps, Socket.IO, or business-flow API calls exist.

M4D passenger mobile flow:
1. Passenger logs in with M4C auth.
2. `/passenger` loads active passenger requests and visible passenger trips.
3. If no active request exists, passenger can open `/passenger/request/new`.
4. Create form submits backend snake_case payload fields without translated enum values.
5. Request detail at `/passenger/request/:id` can cancel only when backend-permitted actions are shown.
6. Request detail can run route matching and navigate to `/passenger/match/:id`.
7. Match detail displays selected route, final score, scoring breakdown, status, and explanation.
8. Dashboard exposes connected passenger trip when one exists.
9. Trip detail at `/passenger/trip/:id` polls trip detail every 5 seconds and latest location every 3 seconds while visible.
10. Polling stops on dispose, pauses on background/inactive lifecycle, and resumes on foreground.
11. Passenger cannot accept/reject matches, mutate trip status, trigger tracking simulation, or reset tracking.

M4E1 match inbox flow:
1. Authenticated caller requests `GET /api/v1/matches`, optionally with `?status=<MatchStatus>`.
2. The API applies ownership filtering in the Prisma query for driver, passenger, or merchant callers; admin receives the unscoped inbox.
3. Results are ordered by `created_at desc`.
4. Each result is serialized through the same explicit safe-summary contract used by `GET /api/v1/matches/:id`.
5. Driver detail ownership is based on the connected driver route, matching list, accept, and reject permissions.
6. Invalid statuses return `400`; missing authentication returns `401`.

M4E2 driver mobile flow:
1. Driver logs in through the existing M4C secure session flow and routes to `/driver`.
2. Dashboard loads `GET /api/v1/driver/routes`, `GET /api/v1/matches`, and `GET /api/v1/trips`; failed requests show an error instead of fabricated counts.
3. `/driver/route` shows the current `active`, `assigned`, or `on_trip` route, or creates the locked route when none exists.
4. `/driver/matches` shows own-route matches with proposed/sent assignments first; an optional proposed filter calls `GET /api/v1/matches?status=proposed`.
5. `/driver/match/:id` shows the safe assignment summaries and scoring breakdown, then accepts or rejects only backend-permitted matches.
6. Accepted matches navigate to `/driver/trip/:id`.
7. Driver trip actions follow `accepted -> pickup_started -> picked_up -> in_transit -> delivered -> completed`; arbitrary jumps are never rendered.
8. Tracking controls call deterministic step/reset endpoints and show the latest polled location plus a seven-point progress indicator.
9. Trip and location polling pause in background/inactive lifecycle states, resume in foreground, stop on dispose, and do not create duplicate timers.
10. Driver routes are protected by the existing role redirect, so passenger, merchant, admin, and unauthenticated users cannot enter them.

Workspace scripts:
- `npm run dev:api` starts the API workspace.
- `npm run dev:admin` starts the admin Vite app.
- `npm run build:api` builds the API workspace.
- `npm run build:admin` builds the admin workspace.
- `npm run build` builds all workspaces.
- `npm run typecheck:api` typechecks the API workspace.
- `npm run typecheck:admin` typechecks the admin workspace.
- `npm run typecheck` typechecks all workspaces.
- `npm run test:admin` runs admin localization tests.
- `npm run prisma:generate` generates the API Prisma client from the root workspace.

[ARCHITECTURE]
Actual folder structure:

```text
.
├── package.json
├── README.md
├── PROJECT_MAP.md
└── apps
    ├── admin
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vite.config.ts
    │   ├── index.html
    │   ├── .env.example
    │   └── src
    │       ├── api.ts
    │       ├── App.tsx
    │       ├── i18n
    │       │   ├── LocaleContext.tsx
    │       │   ├── locale.ts
    │       │   ├── locale.test.ts
    │       │   └── translations.ts
    │       ├── main.tsx
    │       ├── styles.css
    │       └── vite-env.d.ts
    ├── mobile
    │   ├── pubspec.yaml
    │   ├── pubspec.lock
    │   ├── l10n.yaml
    │   ├── android
    │   ├── lib
    │   │   ├── main.dart
    │   │   ├── app.dart
    │   │   ├── core
    │   │   │   ├── api
    │   │   │   │   ├── api_client.dart
    │   │   │   │   └── api_error.dart
    │   │   │   ├── config
    │   │   │   │   └── app_config.dart
    │   │   │   ├── i18n
    │   │   │   │   ├── domain_labels.dart
    │   │   │   │   └── locale_controller.dart
    │   │   │   ├── routing
    │   │   │   │   └── app_router.dart
    │   │   │   ├── theme
    │   │   │   │   ├── app_theme.dart
    │   │   │   │   └── app_tokens.dart
    │   │   │   └── widgets
    │   │   │       ├── language_switch.dart
    │   │   │       └── masari_card.dart
    │   │   ├── features
    │   │   │   ├── auth
    │   │   │   │   ├── application
    │   │   │   │   │   └── auth_controller.dart
    │   │   │   │   ├── data
    │   │   │   │   │   ├── auth_repository.dart
    │   │   │   │   │   └── token_storage.dart
    │   │   │   │   ├── domain
    │   │   │   │   │   └── auth_models.dart
    │   │   │   │   └── presentation
    │   │   │   │       ├── demo_accounts.dart
    │   │   │   │       ├── login_screen.dart
    │   │   │   │       ├── splash_screen.dart
    │   │   │   │       └── unsupported_role_screen.dart
    │   │   │   ├── driver
    │   │   │   │   ├── application
    │   │   │   │   │   └── driver_controller.dart
    │   │   │   │   ├── data
    │   │   │   │   │   ├── driver_models.dart
    │   │   │   │   │   └── driver_repository.dart
    │   │   │   │   └── presentation
    │   │   │   │       ├── driver_home_screen.dart
    │   │   │   │       ├── driver_route_screen.dart
    │   │   │   │       ├── driver_match_inbox_screen.dart
    │   │   │   │       ├── driver_match_detail_screen.dart
    │   │   │   │       ├── driver_trip_screen.dart
    │   │   │   │       └── driver_ui.dart
    │   │   │   ├── matching
    │   │   │   │   ├── data
    │   │   │   │   │   ├── matching_models.dart
    │   │   │   │   │   └── matching_repository.dart
    │   │   │   │   └── presentation
    │   │   │   │       └── match_detail_screen.dart
    │   │   │   ├── merchant
    │   │   │   │   ├── application
    │   │   │   │   │   └── merchant_controller.dart
    │   │   │   │   ├── data
    │   │   │   │   │   ├── merchant_models.dart
    │   │   │   │   │   └── merchant_repository.dart
    │   │   │   │   └── presentation
    │   │   │   │       ├── merchant_home_screen.dart
    │   │   │   │       ├── merchant_order_form_screen.dart
    │   │   │   │       ├── merchant_order_detail_screen.dart
    │   │   │   │       ├── merchant_match_inbox_screen.dart
    │   │   │   │       ├── merchant_match_detail_screen.dart
    │   │   │   │       └── merchant_trip_screen.dart
    │   │   │   ├── passenger
    │   │   │   │   ├── application
    │   │   │   │   │   └── passenger_controller.dart
    │   │   │   │   ├── data
    │   │   │   │   │   ├── passenger_models.dart
    │   │   │   │   │   └── passenger_repository.dart
    │   │   │   │   └── presentation
    │   │   │   │       ├── create_request_screen.dart
    │   │   │   │       ├── passenger_home_screen.dart
    │   │   │   │       └── request_detail_screen.dart
    │   │   │   └── trips
    │   │   │       ├── application
    │   │   │       │   └── passenger_trip_controller.dart
    │   │   │       ├── data
    │   │   │       │   ├── trip_models.dart
    │   │   │       │   └── trip_repository.dart
    │   │   │       └── presentation
    │   │   │           └── passenger_trip_screen.dart
    │   │   └── l10n
    │   │       ├── app_ar.arb
    │   │       ├── app_en.arb
    │   │       └── generated AppLocalizations files
    │   └── test
    │       ├── app_shell_test.dart
    │       ├── auth_controller_test.dart
    │       ├── auth_repository_test.dart
    │       ├── driver_controller_test.dart
    │       ├── driver_flow_widget_test.dart
    │       ├── driver_repository_test.dart
    │       ├── merchant_controller_test.dart
    │       ├── merchant_flow_widget_test.dart
    │       ├── merchant_repository_test.dart
    │       ├── passenger_controller_test.dart
    │       └── passenger_flow_repository_test.dart
    └── api
        ├── package.json
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── prisma.config.ts
        ├── .env.example
        ├── prisma
        │   ├── schema.prisma
        │   └── migrations
        │       ├── 0001_init
        │       ├── 0002_matching_batching_comparison
        │       └── 0003_trips_tracking
        └── src
            ├── app.ts
            ├── server.ts
            ├── config.ts
            ├── lib
            │   ├── audit.ts
            │   ├── geo.ts
            │   └── prisma.ts
            ├── middleware
            │   ├── auth.ts
            │   └── error.ts
            ├── modules
            │   ├── admin.ts
            │   ├── auth.ts
            │   ├── batching.ts
            │   ├── comparison.ts
            │   ├── driver.ts
            │   ├── matching.ts
            │   ├── merchant.ts
            │   ├── passenger.ts
            │   ├── trips.ts
            │   └── demoReset.ts
            └── tests
                ├── auth.test.ts
                ├── demoReset.test.ts
                ├── matchInbox.test.ts
                ├── matchingBatchingComparison.test.ts
                ├── manualRoleApis.test.ts
                └── tripsTracking.test.ts
```

[DATA_MODEL]
Implemented Prisma models:
- User.
- DriverProfile.
- DriverRoute.
- PassengerRequest.
- MerchantOrder.
- Parcel.
- ParcelBatch.
- Match.
- ComparisonRun.
- Trip.
- LocationEvent.
- DemoScenario.
- AuditEvent.

User includes:
- id.
- name.
- phone.
- password_hash.
- role.
- demo_account.
- created_at.

AuditEvent covers:
- auth login.
- demo reset.
- passenger request created.
- passenger request cancelled.
- driver route created.
- driver route deactivated.
- merchant order created.
- parcel batch created.
- comparison run created.
- match accepted.
- match rejected.
- trip status updated.
- location recorded.
- tracking simulation step.
- driver verification later.
- match decisions later.
- admin actions.

M2A schema changes:
- Expanded `AuditAction` enum with M2A action values.
- No new tables were required.

M2B schema changes:
- Added `ParcelBatchStatus` enum.
- Added `MatchStatus` enum.
- Added `ParcelBatch` model.
- Added `Match` model with persisted `scoring_breakdown` JSON.
- Added `ComparisonRun` model.
- Expanded `AuditAction` with `parcel_batch_created` and `comparison_run_created`.

M3A schema changes:
- Added `TripStatus` enum.
- Added `Trip` model.
- Added `LocationEvent` model.
- Expanded `AuditAction` with `match_accepted`, `match_rejected`, `trip_status_updated`, `location_recorded`, and `tracking_simulation_step`.

[STATE_MACHINES]
M1 defines schema enum values only. Business state transition enforcement is not implemented yet.

Current enum support:
- UserRole: passenger, driver, merchant, admin.
- DriverRouteStatus: inactive, active, assigned, on_trip, completed.
- RequestStatus: draft, pending, matched, accepted, picked_up, in_transit, delivered, cancelled.
- MerchantOrderStatus: draft, submitted, batched, assigned, in_transit, completed.
- ParcelStatus: pending, batched, assigned, picked_up, in_transit, delivered.
- ParcelBatchStatus: created, proposed, assigned, picked_up, in_transit, delivered.
- MatchStatus: proposed, sent_to_driver, accepted, rejected, expired.
- TripStatus: created, accepted, pickup_started, picked_up, in_transit, delivered, completed, cancelled.
- AuditAction: auth_login, demo_reset, passenger_request_created, passenger_request_cancelled, driver_route_created, driver_route_deactivated, merchant_order_created, parcel_batch_created, comparison_run_created, match_accepted, match_rejected, trip_status_updated, location_recorded, tracking_simulation_step, driver_verification, match_decision, admin_action.

[API_CONTRACTS]
Implemented endpoints:
- `GET /api/v1/health`.
- `POST /api/v1/auth/login`.
- `GET /api/v1/me`.
- `POST /api/v1/demo/reset`.
- `POST /api/v1/passenger/requests`.
- `GET /api/v1/passenger/requests`.
- `GET /api/v1/passenger/requests/active`.
- `GET /api/v1/passenger/requests/:id`.
- `PATCH /api/v1/passenger/requests/:id/cancel`.
- `POST /api/v1/driver/routes`.
- `GET /api/v1/driver/routes`.
- `GET /api/v1/driver/routes/active`.
- `PATCH /api/v1/driver/routes/:id/deactivate`.
- `POST /api/v1/merchant/orders`.
- `GET /api/v1/merchant/orders`.
- `GET /api/v1/merchant/orders/:id`.
- `GET /api/v1/admin/dashboard`.
- `GET /api/v1/admin/drivers`.
- `GET /api/v1/admin/requests`.
- `GET /api/v1/admin/orders`.
- `GET /api/v1/admin/routes`.
- `POST /api/v1/matches/run`.
- `GET /api/v1/matches`.
- `GET /api/v1/matches/:id`.
- `POST /api/v1/merchant/orders/:id/batch`.
- `POST /api/v1/compare/run`.
- `GET /api/v1/compare/runs/:id`.
- `POST /api/v1/matches/:id/accept`.
- `POST /api/v1/matches/:id/reject`.
- `GET /api/v1/trips`.
- `GET /api/v1/trips/:id`.
- `POST /api/v1/trips/:id/status`.
- `POST /api/v1/trips/:id/simulate/step`.
- `POST /api/v1/trips/:id/simulate/reset`.
- `GET /api/v1/trips/:id/location`.

Demo reset protection:
- Admin JWT accepted if admin already exists.
- `x-demo-reset-key` accepted if it matches `DEMO_RESET_KEY`.
- Public unauthenticated reset without the key is rejected.

Auth login request:
```json
{
  "phone": "+970590000001",
  "password": "<DEMO_PASSENGER_PASSWORD>"
}
```

Auth login response:
```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "name": "Demo Passenger",
    "phone": "+970590000001",
    "role": "passenger",
    "demo_account": true
  }
}
```

Passenger create request example:
```json
{
  "pickup_label": "PPU Main Gate",
  "pickup_lat": 31.55,
  "pickup_lng": 35.1,
  "destination_label": "Bethlehem Center",
  "destination_lat": 31.7054,
  "destination_lng": 35.2024,
  "preferred_time": "2026-07-02T10:00:00.000Z",
  "passenger_count": 1
}
```

Driver create route example:
```json
{
  "seats_available": 2,
  "parcel_capacity_available": 5
}
```

Driver route rules:
- Route is automatically locked to Hebron / PPU / Bab Al-Zawiya -> Bethlehem.
- If optional route labels or corridor key are supplied and do not match the locked corridor, the API rejects the request.

Merchant create order example:
```json
{
  "pickup_label": "Hebron Merchant Pickup",
  "pickup_lat": 31.5326,
  "pickup_lng": 35.0998,
  "parcels": [
    {
      "destination_label": "Bethlehem Market",
      "destination_lat": 31.7054,
      "destination_lng": 35.2024,
      "size": "S",
      "priority": "normal"
    }
  ]
}
```

Run match example:
```json
{
  "passengerRequestId": "<passenger_request_id>"
}
```

Run match response includes:
```json
{
  "match": {
    "score": "0.9317",
    "method": "masari_route_score",
    "explanation": "Driver selected because the route matches the Hebron / PPU / Bab Al-Zawiya -> Bethlehem corridor, pickup is near the route, capacity is available, and trust score is high."
  },
  "scoringBreakdown": {
    "corridorOverlap": 0.95,
    "pickupDistanceScore": 0.827,
    "timingFit": 0.9,
    "trustScore": 0.86,
    "capacityFit": 1,
    "finalScore": 0.9317
  }
}
```

Role-filtered match inbox:
```http
GET /api/v1/matches
GET /api/v1/matches?status=proposed
```

Inbox rules:
- Authentication is required; missing authentication returns `401`.
- Driver sees only matches whose driver route belongs to the authenticated driver's profile.
- Passenger sees only matches whose passenger request belongs to the authenticated passenger.
- Merchant sees only matches whose merchant order belongs to the authenticated merchant.
- Admin sees all matches.
- Optional `status` accepts `proposed`, `sent_to_driver`, `accepted`, `rejected`, or `expired` from the existing `MatchStatus` enum.
- Invalid status returns `400`.
- Results use `created_at desc` ordering.

Inbox response shape:
```json
{
  "matches": [
    {
      "id": "<match_id>",
      "status": "proposed",
      "score": "0.9317",
      "method": "masari_route_score",
      "explanation": "...",
      "scoring_breakdown": {
        "corridorOverlap": 0.95,
        "pickupDistanceScore": 0.827,
        "timingFit": 0.9,
        "trustScore": 0.86,
        "capacityFit": 1,
        "finalScore": 0.9317,
        "estimatedDeviationKm": 1.92
      },
      "created_at": "<iso_datetime>",
      "driver_route": {
        "id": "<route_id>",
        "origin_label": "Hebron / PPU / Bab Al-Zawiya",
        "destination_label": "Bethlehem",
        "corridor_key": "hebron-ppu-bab-al-zawiya-to-bethlehem",
        "seats_available": 2,
        "parcel_capacity_available": 5,
        "status": "active",
        "driver": {
          "vehicle_type": "sedan",
          "verified": true,
          "trust_score": 86
        }
      },
      "passenger_request": {
        "id": "<request_id>",
        "pickup_label": "PPU Main Gate",
        "destination_label": "Bethlehem Center",
        "preferred_time": "<iso_datetime>",
        "passenger_count": 1,
        "status": "pending",
        "created_at": "<iso_datetime>"
      },
      "merchant_order": null,
      "parcel_batch": null
    }
  ]
}
```

Safe contract notes:
- Optional `passenger_request`, `merchant_order`, and `parcel_batch` summaries are `null` when not connected.
- Merchant order summary includes `id`, `pickup_label`, `status`, `parcel_count`, and `created_at`.
- Parcel batch summary includes `id`, `status`, `estimated_distance_saved`, `explanation`, and `created_at`.
- Password hashes, JWTs, reset keys, phone numbers, user ownership foreign keys, and unrelated personal fields are not serialized.
- `GET /api/v1/matches/:id` uses the same safe `match` summary and retains top-level `scoringBreakdown` for existing mobile/admin compatibility.

Create parcel batch:
```http
POST /api/v1/merchant/orders/<order_id>/batch
```

Run comparison example:
```json
{
  "scenarioKey": "masari_batch_wins",
  "passengerRequestId": "<passenger_request_id>",
  "merchantOrderId": "<merchant_order_id>"
}
```

Comparison response includes:
```json
{
  "comparison": {
    "masari_trips": 1,
    "nearest_driver_trips": 6,
    "masari_estimated_distance": "21.53",
    "nearest_estimated_distance": "129.18",
    "masari_estimated_cost": "43.06",
    "nearest_estimated_cost": "258.36",
    "parcel_batching_benefit": "5 parcels can use 1 Masari corridor trip instead of 5 nearest-driver parcel trips.",
    "driver_utilization": "1.00",
    "winner": "masari"
  }
}
```

Accept match:
```http
POST /api/v1/matches/<match_id>/accept
```

Reject match:
```http
POST /api/v1/matches/<match_id>/reject
```

Update trip status:
```json
{
  "status": "pickup_started"
}
```

Simulate tracking step:
```http
POST /api/v1/trips/<trip_id>/simulate/step
```

Latest location response:
```json
{
  "location": {
    "trip_id": "<trip_id>",
    "source": "simulated",
    "sequence": 1,
    "lat": "31.550000",
    "lng": "35.100000"
  }
}
```

Role and ownership rules:
- Passenger role only can create/list/view/cancel passenger requests.
- Passenger can only access own requests.
- Passenger cancellation is allowed only for `pending` or `matched` requests.
- Driver role only can create/list/deactivate routes.
- Driver can only access own routes through their driver profile.
- Driver route creation is locked to the single MVP corridor.
- Driver deactivation is allowed only for active routes.
- Merchant role only can create/list/view merchant orders.
- Merchant can only access own orders.
- Merchant order creation accepts 1 to 10 parcels.
- Admin role only can access admin read-only endpoints.
- Passenger can run/view match results for own passenger request.
- Merchant can run/view match results for own merchant order.
- Admin can run/view matches for seeded or explicit demo records.
- Driver can list and view matches connected to own driver routes.
- Passenger can list only matches connected to own passenger requests.
- Merchant can list only matches connected to own merchant orders.
- Admin can list all matches.
- Merchant can batch only own order.
- Admin can batch seeded/demo order.
- Admin only can run and read comparison runs.
- Driver can accept/reject only matches for own driver route.
- Admin can accept/reject demo matches.
- Driver can see/update own trips.
- Passenger can see trips connected to own request.
- Merchant can see trips connected to own order.
- Admin can see all trips.
- Only driver owner or admin can update trip status or trigger simulated tracking.
- Passenger, merchant, driver owner, and admin can read latest location when connected to the trip.

[MATCHING_LOGIC]
Implemented in M2B.

Seed data includes the locked corridor and demo route prerequisites needed for later matching work.

M2B matching filters:
- Driver route must be active.
- Driver route must use `hebron-ppu-bab-al-zawiya-to-bethlehem`.
- Driver profile must exist and be verified.
- Passenger count must fit `seats_available` when a passenger request is present.
- Parcel count must fit `parcel_capacity_available` when a merchant order is present.
- Inactive routes are ignored.

M2B scoring formula:
```text
score =
  0.40 * corridor_overlap
+ 0.25 * pickup_distance_score
+ 0.15 * timing_fit
+ 0.10 * trust_score
+ 0.10 * capacity_fit
```

Scoring breakdown fields:
- `corridorOverlap`.
- `pickupDistanceScore`.
- `timingFit`.
- `trustScore`.
- `capacityFit`.
- `finalScore`.
- `estimatedDeviationKm`.

Tie-breaks:
- Higher score.
- Lower estimated deviation.
- Higher trust score.
- Stable route id order for deterministic demo.

Batching rules:
- Uses parcels from the merchant order.
- Allows 1 to 10 parcels.
- Uses only the locked corridor.
- Requires a verified active driver route with enough parcel capacity.
- Produces one deterministic batch when capacity allows.
- Updates order status to `batched`.
- Produces judge-friendly explanation and estimated distance saved.

Comparison formulas:
- Corridor distance uses Haversine between Hebron/PPU/Bab Al-Zawiya and Bethlehem.
- `masari_trips = 1` when passenger or parcel demand exists.
- `nearest_driver_trips = passenger_request_count + parcel_count`.
- `estimated_cost = estimated_distance * 2`.
- `parcel_batching_benefit` explains trip reduction.
- `driver_utilization = (parcel_count + passenger_count) / (parcel_count + 1)` clamped by deterministic demand formula.
- Winner is `masari` when Masari cost and trips are less than or equal to nearest-driver baseline.

[TRIP_STATUS_LOGIC]
Implemented in M3A.

Match accept side effects:
- Match status becomes `accepted`.
- Trip status becomes `accepted`.
- DriverRoute status becomes `assigned`.
- PassengerRequest status becomes `accepted` if present.
- ParcelBatch status becomes `assigned` if present.
- MerchantOrder status becomes `assigned` if present.
- Parcels become `assigned` if merchant order is present.

Match reject side effects:
- Match status becomes `rejected`.
- No trip is created.

Approved trip flow:
```text
accepted -> pickup_started -> picked_up -> in_transit -> delivered -> completed
```

Allowed cancellation path:
```text
accepted/pickup_started/picked_up/in_transit -> cancelled
```

Status side effects:
- `pickup_started`: DriverRoute becomes `on_trip`.
- `picked_up`: PassengerRequest, ParcelBatch, and Parcels become `picked_up` when present.
- `in_transit`: PassengerRequest, MerchantOrder, ParcelBatch, and Parcels become `in_transit` when present.
- `delivered`: PassengerRequest, ParcelBatch, and Parcels become `delivered`; MerchantOrder becomes `completed`.
- `completed`: DriverRoute becomes `completed`; Trip `completed_at` is set.

[TRACKING_SIMULATION]
Implemented in M3A.

Behavior:
- Uses fixed route points for Hebron / PPU / Bab Al-Zawiya -> Bethlehem.
- `POST /api/v1/trips/:id/simulate/step` creates exactly one `LocationEvent`.
- Sequence starts at `0` and increments by one per simulated step.
- Coordinates repeat deterministically if sequence exceeds route path length.
- `GET /api/v1/trips/:id/location` returns latest event by sequence.
- No Socket.IO and no live GPS integration yet.

[ADMIN_DEMO_CONSOLE]
Implemented in M3B under `apps/admin`.

Features:
- One login screen using `POST /api/v1/auth/login`.
- Login screen displays seeded demo admin credentials for judge/demo use.
- Stores admin JWT in `localStorage` for hackathon demo use.
- Loads current admin via `GET /api/v1/me`.
- Demo Control panel can call `POST /api/v1/demo/reset` with reset key and/or admin JWT.
- Demo Control explains that reset recreates the deterministic judge scenario.
- Reset flow re-authenticates the admin because demo reset recreates seeded users.
- System Overview panel uses admin dashboard/list endpoints for counts and seeded records.
- Matching panel calls `POST /api/v1/matches/run` and displays selected route, score, breakdown, and explanation.
- Parcel Batch panel calls `POST /api/v1/merchant/orders/:id/batch` and displays batch id, parcel count, estimated distance saved, and explanation.
- Comparison panel calls `POST /api/v1/compare/run` and displays Masari vs nearest-driver metrics in a simple table.
- Trip Flow panel calls match accept/reject, lists trips, and advances the valid trip lifecycle.
- Tracking Simulation panel calls simulate step/reset and latest location polling.
- Full Demo Sequence button runs reset, login, dashboard inputs, match, batch, comparison, accept, complete status progression, and one tracking step.
- Full Demo Sequence displays step-by-step progress and stops with a clear surfaced error if a step fails.

Backend changes for M3B:
- No backend permission changes were required.
- Existing M3A permissions already allow admin to batch demo orders, accept/reject matches, update demo trips, and simulate tracking.

M3C QA/polish changes:
- No backend changes were required.
- Admin app HTML was served locally by Vite.
- API was served locally against PostgreSQL.
- Browser automation/visual inspection was not available in the current tool environment, so visual review must still be performed by opening the console in a browser.

Local admin CORS fix:
- API supports env-based `CORS_ORIGINS`.
- Default local origins include `http://localhost:5173`, `http://localhost:5174`, `http://localhost:5175`, and matching `127.0.0.1` origins.
- CORS preflight and login responses include `Access-Control-Allow-Origin` for allowed admin console origins.

M3D localization:
- Arabic and English are supported in the admin console.
- Arabic is the default language and RTL.
- English is optional and LTR.
- Language switch is available on login and authenticated dashboard.
- Switching language does not reload, reset authentication, or reset demo state.
- UI labels, buttons, notices, progress steps, roles, statuses, metrics, and demo explanations use the typed dictionary in `apps/admin/src/i18n/translations.ts`.
- Locale helpers, persistence, status/role/source label mapping, document `lang`/`dir`, and locale-aware formatting live in `apps/admin/src/i18n/locale.ts`.
- React provider/hook live in `apps/admin/src/i18n/LocaleContext.tsx`.
- Admin localization tests live in `apps/admin/src/i18n/locale.test.ts`.
- Backend enum/API values remain unchanged; translations are presentation-only.

[MOBILE_ANDROID_APP]
Implemented in M4B under `apps/mobile`.

Scope implemented:
- Android-only Flutter project `masari_mobile`.
- Android application ID: `ps.masari.mobile`.
- Welcome/app-shell route only at `/`.
- Arabic default locale with RTL.
- English optional locale with LTR.
- Language switch on the welcome shell.
- Locale persistence key: `masari_locale`.
- ARB/gen_l10n localization files:
  - `apps/mobile/l10n.yaml`.
  - `apps/mobile/lib/l10n/app_ar.arb`.
  - `apps/mobile/lib/l10n/app_en.arb`.
  - Flutter-generated `AppLocalizations` files.
- `API_BASE_URL` build configuration through `String.fromEnvironment`.
- Default development API base URL: `http://10.0.2.2:3000`.
- Debug Android cleartext HTTP enabled only in `android/app/src/debug/AndroidManifest.xml`.
- Main manifest includes internet permission.
- No GPS, live location, Socket.IO, auth, role, matching, trip, tracking, or payment code added.

Mobile API URL examples:
- Android emulator to host API: `--dart-define=API_BASE_URL=http://10.0.2.2:3000`.
- Physical Android phone to host API: `--dart-define=API_BASE_URL=http://<computer-lan-ip>:3000`.
- Future hosted demo API: `--dart-define=API_BASE_URL=https://<demo-api-domain>`.

Mobile match-inbox backend dependency:
- M4E1 resolved the backend gap with role-filtered `GET /api/v1/matches`.
- M4E2 now consumes this endpoint in the Flutter driver inbox and dashboard.

M4B Android runtime validation:
- Existing AVD found: `Medium_Phone_API_36.0`.
- Initial emulator boot got stuck as ADB `offline`; a cold boot with wiped emulator data recovered it.
- Runtime device: `emulator-5554`, `sdk gphone64 x86 64`, Android 16 API 36.
- App launched with `flutter run -d emulator-5554 --no-resident --dart-define=API_BASE_URL=http://10.0.2.2:3000`.
- `adb shell pm clear ps.masari.mobile` succeeded before runtime validation.
- Arabic opened by default and used RTL.
- English switch changed UI to English/LTR.
- English persisted after force-stop/relaunch.
- Switching back to Arabic persisted after force-stop/relaunch.
- API environment text showed `http://10.0.2.2:3000`.
- No Flutter counter-template UI, crash, overflow, or visibly broken layout was observed.
- Screenshots captured under `C:\Users\basha\AppData\Local\Temp\opencode`:
  - `masari_m4b_ar.png`.
  - `masari_m4b_en.png`.
  - relaunch verification screenshots for both languages.

[MOBILE_AUTH_AND_ROLE_ROUTING]
Implemented in M4C under `apps/mobile`.

Scope implemented:
- API client uses existing `String.fromEnvironment('API_BASE_URL')` through `AppConfig`.
- API client calls only `POST /api/v1/auth/login` and `GET /api/v1/me`.
- API client sends JSON headers and `Authorization: Bearer <token>` when a token is provided.
- API timeout is 12 seconds.
- API errors are mapped to network, timeout, validation, unauthorized, forbidden, server, and unknown categories.
- Error objects and `toString()` do not include raw JWT or password values.
- DTO parsing is manual and typed; no code generation or JSON annotation package was added.
- JWT is stored only in Flutter secure storage key `masari_jwt`.
- Passwords, raw login payloads, and JWTs are not stored in shared preferences.
- Locale remains stored in shared preferences key `masari_locale`.
- Riverpod owns auth/session state, login action state, logout, restored user, and role routing inputs.
- go_router routes:
  - `/splash`.
  - `/login`.
  - `/passenger`.
  - `/driver`.
  - `/merchant`.
  - `/unsupported-role`.
- Unauthenticated users route to `/login`.
- Passenger routes to `/passenger`.
- Driver routes to `/driver`.
- Merchant routes to `/merchant`.
- Admin routes to `/unsupported-role`.
- Users cannot manually navigate to another role route because redirects always return them to their own role route.
- Unsupported admin message is localized as:
  - Arabic: `لوحة تحكم المسؤول متاحة عبر تطبيق الويب.`
  - English: `The admin console is available through the web application.`
- Role home shells show Masari branding, current user name, role label, locked corridor, language switch, logout, workspace-ready copy, and clearly labeled coming-next copy.
- No passenger request, driver route, merchant order, match list, match decision, trip, tracking, AI, Socket.IO, GPS, map, registration, refresh-token, or payment feature was implemented.

M4C mobile translations:
- Arabic and English ARB entries added for splash/session restoration, login, phone, password, show/hide password, sign-in, demo accounts, passenger, driver, merchant, admin, logout, errors, retry, role workspace, locked corridor label, coming-next copy, and unsupported admin mobile role.
- Arabic remains default.
- English remains optional and persisted independently of auth state.
- Phone fields and demo phone labels render LTR inside Arabic layouts.

[MOBILE_PASSENGER_FLOW]
Implemented in M4D under `apps/mobile`.

Routes:
- `/passenger`: passenger dashboard.
- `/passenger/request/new`: locked-corridor create request form.
- `/passenger/request/:id`: passenger-owned request detail.
- `/passenger/match/:id`: passenger-owned match result detail.
- `/passenger/trip/:id`: passenger-owned trip and latest location detail.

Endpoint-to-screen mapping:
- Passenger dashboard uses `GET /api/v1/passenger/requests/active` and `GET /api/v1/trips`.
- Create request uses `POST /api/v1/passenger/requests`.
- Request detail uses `GET /api/v1/passenger/requests/:id`.
- Cancel request uses `PATCH /api/v1/passenger/requests/:id/cancel`.
- Matching action uses `POST /api/v1/matches/run` with `{ "passengerRequestId": "<id>" }`.
- Match detail uses `GET /api/v1/matches/:id`.
- Passenger trip detail uses `GET /api/v1/trips/:id` and `GET /api/v1/trips/:id/location`.

Locked corridor form:
- No city selection.
- Pickup presets:
  - `PPU Main Gate`, latitude `31.550000`, longitude `35.100000`.
  - `Bab Al-Zawiya`, latitude `31.532600`, longitude `35.099800`.
- Destination is fixed to `Bethlehem Center`, latitude `31.705400`, longitude `35.202400`.
- Passenger count limited to 1 through 4 to match backend validation.
- Preferred time is sent as ISO UTC.
- API payload fields remain backend snake_case and enum/status values are not translated before submission.

Passenger matching behavior:
- Displays selected driver/route, match status, final score, scoring breakdown, and backend explanation.
- Breakdown labels are localized and values are formatted as percentages.
- No raw JSON is shown.
- No compatible driver errors render a localized empty state.
- The M4D passenger UI does not use the role-filtered `GET /api/v1/matches` endpoint added later in M4E1.

Passenger trip polling behavior:
- Trip detail polls detail every 5 seconds.
- Latest location polls every 3 seconds.
- Polling starts while the screen is visible.
- Polling stops when provider/screen is disposed.
- App lifecycle pause/inactive stops timers.
- App lifecycle resume restarts timers without duplicate timers.
- Stale state is shown when a returned location is older than 5 minutes.
- Passenger cannot mutate trip status or trigger tracking simulation.

M4D mobile translations:
- Arabic and English ARB entries added for passenger dashboard, active request, create request, pickup presets, destination, preferred time, passenger count, submit, request detail, cancel, match action, match result, scoring breakdown, trip detail, latest location, status labels, and refresh/retry states.
- Arabic remains default; English remains optional and persisted independently of auth/session state.
- Request IDs, match IDs, trip IDs, coordinates, and phone numbers remain readable LTR where used.

[MOBILE_DRIVER_FLOW]
Implemented in M4E2 under `apps/mobile`.

Role-protected routes:
- `/driver`: driver dashboard.
- `/driver/route`: locked-corridor route detail/create/deactivate.
- `/driver/matches`: role-filtered match inbox.
- `/driver/match/:id`: driver-owned match detail and accept/reject.
- `/driver/trip/:id`: driver-owned trip lifecycle and deterministic tracking.

Endpoint mapping:
- Dashboard: `GET /api/v1/driver/routes`, `GET /api/v1/matches`, `GET /api/v1/trips`.
- Route flow: `GET /api/v1/driver/routes`, `GET /api/v1/driver/routes/active`, `POST /api/v1/driver/routes`, `PATCH /api/v1/driver/routes/:id/deactivate`.
- Match flow: `GET /api/v1/matches`, optional `?status=proposed`, `GET /api/v1/matches/:id`, `POST /api/v1/matches/:id/accept`, `POST /api/v1/matches/:id/reject`.
- Trip flow: `GET /api/v1/trips`, `GET /api/v1/trips/:id`, `POST /api/v1/trips/:id/status`.
- Tracking: `POST /api/v1/trips/:id/simulate/step`, `POST /api/v1/trips/:id/simulate/reset`, `GET /api/v1/trips/:id/location`.

Locked driver route:
- Origin: `Hebron / PPU / Bab Al-Zawiya`, latitude `31.532600`, longitude `35.099800`.
- Destination: `Bethlehem`, latitude `31.705400`, longitude `35.202400`.
- Corridor key: `hebron-ppu-bab-al-zawiya-to-bethlehem`.
- Backend owns and persists the fixed coordinates; mobile submits only the accepted locked labels/corridor and selected capacities.
- Driver may select seats from backend-compatible `0..8` and parcel capacity from `0..20`; raw coordinates and city selection are not editable.
- Operational route summary includes `active`, `assigned`, and `on_trip`; deactivation is rendered only for `active` routes.

Driver match behavior:
- Inbox consumes only the safe M4E1 response and never displays raw JSON, credentials, phone numbers, or owner foreign keys.
- Proposed and sent-to-driver assignments are grouped first; each group remains newest first.
- Cards show assignment type, pickup/destination, passenger/parcel counts, batch savings when present, final score, status, created time, and explanation.
- Detail shows corridor overlap, pickup-distance score, timing fit, trust score, capacity fit, related assignment summaries, explanation, and status.
- Accept/reject buttons exist only for `proposed` and `sent_to_driver`, are disabled during requests, and refresh after conflicts.

Driver trip and tracking behavior:
- UI sequence is strictly `accepted -> pickup_started -> picked_up -> in_transit -> delivered -> completed`.
- Only one valid next action is rendered; completed/cancelled trips render no transition action.
- Status mutations remain backend-authoritative and conflict errors trigger a translated refresh.
- Trip detail polls every 5 seconds; latest location polls every 3 seconds.
- Poll failures preserve the last known good state; explicit action failures are surfaced.
- App pause/inactive stops timers; resume restarts them; provider disposal cancels them; repeated resume does not duplicate timers.
- Simulation uses the backend's seven deterministic route points and shows latitude, longitude, sequence, source, recorded time, and progress without a map.

M4E2 localization:
- All driver dashboard, route, inbox, match action, trip action, tracking, error, and status text is present in Arabic and English ARB files.
- Arabic remains default RTL; English remains optional LTR; `masari_locale` persistence is unchanged.
- Technical IDs and coordinates are rendered LTR where needed.

[MOBILE_MERCHANT_FLOW]
Implemented in M4F under `apps/mobile`.

Role-protected routes:
- `/merchant`: merchant dashboard with latest order, latest persisted batch, role-filtered match count, and connected active trip.
- `/merchant/order/new`: locked-corridor order form.
- `/merchant/order/:id`: merchant-owned order, parcels, persisted batch, match, and connected-trip actions.
- `/merchant/matches`: merchant-owned role-filtered match inbox.
- `/merchant/match/:id`: safe read-only merchant match detail.
- `/merchant/trip/:id`: read-only connected trip, order, parcel, and latest-location state.

Endpoint mapping:
- Orders: `GET /api/v1/merchant/orders`, `GET /api/v1/merchant/orders/:id`, and `POST /api/v1/merchant/orders`.
- Batching: `POST /api/v1/merchant/orders/:id/batch`.
- Matching: `POST /api/v1/matches/run` with `{ "merchantOrderId": "<id>" }`, `GET /api/v1/matches`, optional `?status=proposed`, and `GET /api/v1/matches/:id`.
- Trips and tracking: `GET /api/v1/trips`, `GET /api/v1/trips/:id`, and `GET /api/v1/trips/:id/location`.
- Merchant screens never call match accept/reject, trip mutation, simulation step, or simulation reset endpoints.

Locked order form:
- Pickup is fixed to `Hebron Merchant Pickup`, latitude `31.532600`, longitude `35.099800`.
- Destination choices are limited to the seeded route-compatible Bethlehem presets: `Bethlehem Market`, `Bethlehem University Area`, `Manger Street`, `Beit Jala Junction`, and `Bethlehem Center` at latitude `31.705400`, longitude `35.202400`.
- Each parcel selects only a destination preset, backend enum size `S|M|L`, and backend enum priority `low|normal|high`.
- The form enforces 1 through 10 parcel rows, never exposes coordinate fields, disables submission while running, preserves rows after API failures, and navigates to the new order detail after success.
- Arabic labels are displayed to the user while backend labels and enum values remain English in API payloads.

Batching and matching behavior:
- Order detail renders every parcel, its size/priority/status, latest persisted batch status, estimated distance benefit, and backend explanation.
- Batch action is available only for a submitted order without a persisted batch; backend `order_already_batched`, invalid state, and unavailable capacity responses are translated and followed by an authoritative refresh.
- Matching becomes available after a batch exists and is hidden while an existing proposed, sent-to-driver, or accepted match exists.
- Match inbox consumes the M4E1 safe role-filtered contract; cards and detail show order, route, score, status, scoring breakdown, explanation, and batch summary when connected.
- Merchant match detail is explicitly read-only and contains no accept/reject controls.

Merchant trip polling behavior:
- Connected trip detail and merchant order detail each poll every 5 seconds using separate guarded timers.
- Latest location polls every 3 seconds using its own guarded timer.
- App lifecycle pause/inactive/detached stops all timers; resume restarts them; provider disposal cancels them; repeated resume cannot duplicate timers.
- Poll failures preserve the last good state.
- Trip detail shows the locked route, status timeline, order state, each parcel state, latitude, longitude, sequence, source, recorded time, and deterministic progress without maps or GPS.
- Trip and tracking screens are read-only for merchants.

M4F backend contract correction:
- `GET /api/v1/merchant/orders` and `GET /api/v1/merchant/orders/:id` now include newest-first `parcel_batches` with only batch fields and a safe route summary, so batch state survives app relaunch.
- Batch route summaries exclude driver ownership/profile fields and other personal data.
- `POST /api/v1/merchant/orders/:id/batch` now rejects an existing batch with `409 order_already_batched` and accepts only the `submitted` state, preventing duplicate batches.
- No Prisma schema or migration change was required.

M4F localization:
- Merchant dashboard, order form, parcel fields, batch flow, matching inbox/detail, waiting-for-driver copy, trip/order/location state, errors, priorities, and merchant-specific statuses are present in Arabic and English ARB files.
- Arabic remains default RTL, English remains optional LTR, and `masari_locale` plus secure JWT restoration are unchanged.
- Technical IDs and coordinates remain LTR where needed.

[DEMO_MODE]
Implemented endpoint:
- `POST /api/v1/demo/reset`.

Seeded demo accounts:
- Passenger: `+970590000001` / local `DEMO_PASSENGER_PASSWORD` value.
- Driver 1: `+970590000002` / local `DEMO_DRIVER_PASSWORD` value.
- Driver 2: `+970590000003` / local `DEMO_DRIVER_PASSWORD` value.
- Merchant: `+970590000004` / local `DEMO_MERCHANT_PASSWORD` value.
- Admin: `+970590000005` / local `DEMO_ADMIN_PASSWORD` value.

Seeded demo data:
- Locked corridor: Hebron / PPU / Bab Al-Zawiya -> Bethlehem.
- Driver profiles.
- One active driver route on the locked corridor.
- One inactive alternate driver route.
- One pending passenger request.
- One submitted merchant order.
- Five parcels.
- Three demo comparison scenario records.

[SECURITY_AND_PRIVACY]
Implemented:
- Seeded demo-account login.
- JWT auth for protected route.
- `/api/v1/demo/reset` bootstrap protection via admin JWT or `x-demo-reset-key`.
- Password hashing with bcryptjs.
- Structured audit records for login and reset.
- Zod validation for login input.

Not implemented yet:
- Rate limiting.
- Full role matrix beyond M1 routes.
- Production logging sink.

[TESTING_STRATEGY]
Implemented minimal tests:
- Auth login validation and JWT issue path with mocked Prisma.
- Demo reset rejects missing reset key.
- Demo reset succeeds with valid reset key and mocked Prisma transaction.
- Passenger request create/read ownership/cancel tests.
- Driver route create/locked-corridor/deactivate ownership tests.
- Merchant order create/ownership/parcel-count tests.
- Admin dashboard/list authorization tests.
- Matching route-compatible route beats wrong-direction route.
- Matching ignores inactive/unverified routes through candidate query.
- Matching rejects capacity mismatch.
- Matching rejects non-owner access.
- Matching returns persisted scoring breakdown.
- Match inbox rejects unauthenticated requests.
- Match inbox applies driver-route, passenger-request, merchant-order, and admin-all role filters.
- Match inbox validates status filtering and newest-first ordering.
- Match inbox and detail responses include scoring and related summaries while excluding sensitive fields.
- Match detail allows the connected driver, passenger, merchant, and admin, and rejects unrelated users.
- Batching own order succeeds.
- Batching rejects non-merchant/non-admin.
- Batching rejects another merchant's order.
- Batching rejects invalid order state.
- Comparison admin run succeeds and persists.
- Comparison rejects non-admin.
- Comparison GET returns saved run.
- Match accept/reject tests.
- Trip visibility tests for driver, passenger, merchant, admin, and unrelated user.
- Trip status transition tests.
- Status side-effect tests.
- Simulated tracking step tests.
- Latest location polling tests.
- Admin console TypeScript typecheck.
- Admin console production build.
- Admin localization tests for Arabic default, saved English restore, document `lang`/`dir`, persistence, translation lookup, unknown-key fallback, and status label mapping.
- Mobile app-shell tests for Arabic default, RTL direction, English switching, LTR direction, `masari_locale` persistence, saved English restoration, `API_BASE_URL` config, and absence of Flutter counter-template content.
- Mobile auth repository tests for successful login parsing, failed login mapping, `/me` parsing, authorization header sending, and avoiding raw-token exposure in errors.
- Mobile auth controller tests for no-token login state, valid saved-token restoration, 401 token removal, temporary network failure preserving token with retry state, and logout token removal.
- Mobile routing/widget tests for passenger, driver, merchant, unsupported admin, role-route protection, Arabic RTL login, English LTR switch, demo preset fill, loading disabled button, translated invalid credentials, logout returning to login, and locale preservation after logout.
- Mobile M4D repository tests for passenger request list/active/detail parsing, create request payload, cancel request, match run/scoring breakdown parsing, trip list/detail parsing, latest-location parsing, and backend error mapping.
- Mobile M4E2 repository tests for route list/active parsing, locked create payload, deactivation, match inbox/filter/detail, accept/reject, trip list/detail/status payload, simulation step/reset, and latest-location parsing.
- Mobile M4E2 controller tests for dashboard success/empty/error, route creation conflict and deactivation failure, inbox empty/order/filter/error, accept/reject refresh, valid next status, and polling lifecycle/timer deduplication.
- Mobile M4E2 routing/widget tests for driver-only routes, passenger/merchant/unauthenticated redirects, Arabic RTL and English LTR, locked route form without editable coordinates, safe match summaries, scoring detail, accept/reject loading state, valid-only trip action, and simulated location progress.
- Mobile M4F repository/controller/widget tests for locked merchant order creation, persisted batching, safe merchant matching, read-only connected trip observation, polling lifecycle, localization, and role-route protection.
- M5A API regression proves a combined match carries the newest merchant parcel batch into its accepted trip.
- M5A mobile controller regressions prove passenger, driver, and merchant dashboard refresh failures enter visible error state; localized match/tracking widget assertions cover Arabic explanations and simulated-source labels.

Required validation commands:
- `npm install`.
- `npm run typecheck`.
- `npm run prisma:validate`.
- `npm run prisma:generate`.
- `npm run test`.
- `npm run db:migrate` applies the checked-in MySQL migration history with `prisma migrate deploy`.
- `npm run db:migrate:status` verifies the MySQL migration state.
- `npm run build`.
- `npm run typecheck:admin`.
- `npm run test:admin`.
- `npm run build:admin`.
- Endpoint validation against local API and MySQL.
- Mobile: `flutter pub get`, `flutter gen-l10n`, `dart format --set-exit-if-changed .`, `flutter analyze`, `flutter test`, and the port-3000 debug APK build.
- Demo: `npm run demo:preflight` and `npm run demo:smoke`.
- `npm audit --omit=dev`.

Prisma config behavior:
- `apps/api/prisma.config.ts` uses `DATABASE_URL` when set.
- For schema validation/generation without a local `.env`, it uses a non-secret placeholder MySQL URL.
- Real database operations require a reachable MySQL `masari` database.
- The approved release migration mechanism is `npm run db:migrate`, not `db push`.

[MILESTONES]
M1 Foundation And Demo Reset target:
- Backend starts.
- PostgreSQL schema exists.
- Prisma validation passes.
- Seeded demo accounts exist after reset.
- Demo corridor exists after reset.
- Demo reset endpoint works with protection.
- Auth login works for all four roles after reset.
- `/api/v1/me` works.

M1 validation results:
- `npm install`: passed.
- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 2 files and 4 tests.
- `npm run build`: passed.
- `npm run db:push`: passed against `postgresql://postgres:postgres@localhost:5432/masari?schema=public`; database `masari` was created/synced.
- Real API validation: passed for `GET /api/v1/health`, `POST /api/v1/demo/reset`, `POST /api/v1/auth/login` for passenger/driver/merchant/admin, and `GET /api/v1/me` for each role.
- `npm audit --omit=dev`: reports 3 moderate findings through Prisma CLI transitive `@hono/node-server`; `npm audit fix --force` would install `prisma@6.19.3`, a breaking downgrade, so it was not applied.

M2A validation results:
- Pre-step M1 validation passed: `npm run prisma:validate`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run build`.
- Git initialized and M1 committed as `chore: initialize Masari foundation`.
- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 3 files and 21 tests.
- `npm run build`: passed.
- `npm run db:push`: passed against local PostgreSQL.
- Real M2A smoke validation passed for health, demo reset, auth, `/me`, passenger request create/list-active/read/cancel, driver route create/list/list-active/deactivate, merchant order create/list/detail, and admin dashboard/list endpoints.

M2B validation results:
- Pre-step git status: clean.
- Pre-step validation passed: `npm run prisma:validate`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run build`.
- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 4 files and 34 tests.
- `npm run build`: passed.
- `npm run db:push`: passed against local PostgreSQL.
- Real M2B smoke validation passed for demo reset, match run/read, merchant batch, comparison run/read.
- Real smoke output included match score `0.9317`, batch status `created`, estimated distance saved `86.12`, comparison winner `masari`, Masari trips `1`, nearest-driver trips `6`.

M3A validation results:
- Migration integrity check completed.
- Corrective migration commit created: `chore: normalize Prisma migrations`.
- Pre-step validation passed: `npm run prisma:validate`, `npm run prisma:generate`, `npm run db:push`, `npm run typecheck`, `npm run test`, `npm run build`.
- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 5 files and 47 tests.
- `npm run build`: passed.
- `npm run db:push`: passed against local PostgreSQL.
- Real M3A smoke validation passed against local PostgreSQL for `GET /api/v1/health`, `POST /api/v1/demo/reset`, login as admin/passenger/driver/merchant, `GET /api/v1/me`, match run, parcel batch, comparison run/read, match accept, full trip status progression to `completed`, simulated tracking step, and latest location polling.
- Real smoke output included dashboard users `5`, match status `proposed`, match score `0.9317`, batch status `created`, comparison winner `masari`, accepted trip status `accepted`, final trip status `completed`, simulated location sequence `0`, latest sequence `0`, latest source `simulated`.

M3B validation results:
- `npm install`: passed; reported existing 3 moderate audit findings, and `npm audit fix --force` was not run.
- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed.
- `npm run typecheck:api`: passed.
- `npm run test`: passed, 5 files and 47 tests.
- `npm run build:api`: passed.
- `npm run typecheck:admin`: passed.
- `npm run build:admin`: passed.
- `npm run typecheck`: passed for admin and API workspaces.
- `npm run build`: passed for admin and API workspaces.
- Real M3B smoke validation passed against local PostgreSQL for demo reset, admin login, dashboard load, admin routes/requests/orders load, match run/read, parcel batch, comparison run/read, match accept, full status progression to `completed`, trips list, simulated tracking step, and latest location polling.
- Real smoke output included dashboard users `5`, routes `2`, requests `1`, orders `1`, match score `0.9317`, batch status `created`, distance saved `86.12`, comparison winner `masari`, trip count `1`, final status `completed`, location sequence `0`, latest source `simulated`.

M3C validation results:
- Pre-step `git status`: clean.
- Pre-step `npm run prisma:validate`: passed.
- Pre-step `npm run prisma:generate`: passed.
- Pre-step `npm run typecheck`: passed for admin and API workspaces.
- Pre-step `npm run test`: passed, 5 files and 47 tests.
- Pre-step `npm run build`: passed for admin and API workspaces.
- Local API dev server started with PostgreSQL on port `3100`.
- Local admin Vite server started and served the app HTML on port `5174` via IPv6 loopback.
- Local full demo API sequence passed for demo reset, admin login, dashboard/routes/requests/orders load, match run, parcel batch, comparison run, match accept, trip progression to `completed`, tracking step, and latest location.
- Local smoke output included users `5`, routes `2`, requests `1`, orders `1`, match score `0.9317`, batch status `created`, comparison winner `masari`, final status `completed`, location sequence `0`, latest sequence `0`.
- Final `npm run prisma:validate`: passed.
- Final `npm run prisma:generate`: passed.
- Final `npm run typecheck`: passed for admin and API workspaces.
- Final `npm run test`: passed, 5 files and 47 tests.
- Final `npm run build`: passed for admin and API workspaces.
- Final `npm run typecheck:admin`: passed.
- Final `npm run build:admin`: passed.
- Visual browser inspection could not be performed from the current tool environment; remaining manual check is to open the admin app in a browser and click through the full demo path.

M3D validation results:
- `npm install`: passed; reported existing 3 moderate audit findings, and `npm audit fix --force` was not run.
- `git status`: showed only intended M3D files before commit.
- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed.
- `npm run typecheck`: passed for admin and API workspaces.
- `npm run test`: passed, 5 files and 48 API tests.
- `npm run build`: passed after rerunning sequentially once Prisma generation completed.
- `npm run typecheck:admin`: passed.
- `npm run build:admin`: passed.
- `npm run test:admin`: passed, 1 file and 7 tests.
- Admin localization tests cover Arabic default, saved English restore, document `lang`/`dir`, persistence, translation lookup, unknown-key fallback, and status labels without changing API values.
- Local API dev server started with PostgreSQL on port `3103`.
- Local admin Vite server started and served the app on port `5175`.
- Local full backend demo smoke passed after localization changes: reset, admin login, dashboard, match, batch, comparison, accept, status progression to `completed`, tracking step, and latest location.
- Local smoke output included users `5`, match score `0.9317`, batch status `created`, comparison winner `masari`, final status `completed`, location sequence `0`, latest sequence `0`.
- Interactive browser visual inspection could not be performed from the current tool environment; remaining manual check is to clear `masari_locale`, open the admin console, confirm Arabic RTL default, login and run demo flow in Arabic, switch to English, refresh to confirm English persists, switch back to Arabic, and confirm auth/demo state remain functional.

M4B validation results:
- Initial toolchain inspection found Flutter, Dart, and adb missing from PATH.
- Flutter stable installed to `C:\Users\basha\development\flutter` and added to user PATH.
- Android platform-tools added to user PATH.
- Android command-line tools installed under `C:\Users\basha\AppData\Local\Android\Sdk\cmdline-tools\latest`.
- `flutter channel stable`: completed.
- `flutter upgrade`: Flutter already current on stable.
- `flutter config --android-sdk "C:\Users\basha\AppData\Local\Android\Sdk"`: completed.
- `flutter doctor --android-licenses`: all SDK licenses accepted.
- Installed missing Android SDK Platform 36 and Android Build Tools 28.0.3 to satisfy Flutter doctor.
- Final `flutter --version`: Flutter 3.44.6 stable, Dart 3.12.2.
- Final `dart --version`: Dart 3.12.2 stable.
- Final `flutter doctor -v`: no issues found; Android toolchain ready with Android SDK 36.0.0 and Android Studio bundled JDK OpenJDK 21.0.6.
- `flutter pub get`: passed.
- `flutter gen-l10n`: passed.
- `dart format --set-exit-if-changed .`: passed after formatting.
- `flutter analyze`: passed, no issues.
- `flutter test`: passed, 5 tests.
- `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000`: passed.
- Debug APK output: `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`.
- `flutter devices`: no Android emulator or physical Android device connected; Windows, Chrome, and Edge only.
- `adb devices`: no Android devices attached.
- Existing repo regression passed: `npm run prisma:validate`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, and sequential `npm run build`.

M4B runtime validation results:
- Repository baseline before runtime validation was clean at commit `a00ed58 feat: initialize Arabic-first Flutter app`.
- Existing AVD `Medium_Phone_API_36.0` found through emulator list.
- AVD cold boot with wiped emulator data became visible as `emulator-5554`.
- `flutter devices` reported `sdk gphone64 x86 64 (mobile)`, Android 16 API 36.
- App data cleared with `adb shell pm clear ps.masari.mobile`.
- Runtime launch passed with `flutter run -d emulator-5554 --no-resident --dart-define=API_BASE_URL=http://10.0.2.2:3000`.
- Arabic default, RTL, English/LTR switch, relaunch persistence for English, relaunch persistence for Arabic, configured API URL, no counter-template UI, and no visible crash/overflow were verified.
- No M4B code fix was needed and no separate M4B fix commit was created.

M4C validation results:
- Added dependency versions: `http 1.6.0`, `flutter_secure_storage 10.3.1`.
- `flutter pub get`: passed.
- `flutter gen-l10n`: passed.
- `dart format --set-exit-if-changed .`: passed.
- `flutter analyze`: passed, no issues.
- `flutter test`: passed, 22 mobile tests.
- `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000`: passed.
- Debug APK output: `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`.
- Existing repo regression passed: `npm run prisma:validate`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, and `npm run build`.

M4C Android runtime smoke:
- API started locally with `npm run dev:api` using local PostgreSQL URL, development JWT secret, and demo reset key.
- API health returned `{"ok":true,"service":"masari-api"}`.
- Demo data reset passed with `POST /api/v1/demo/reset` and `x-demo-reset-key`.
- Mobile launched on `emulator-5554` with `API_BASE_URL=http://10.0.2.2:3000`.
- Cleared app data before smoke.
- Arabic default login screen verified.
- Passenger demo account logged in and routed to passenger home shell.
- Force-stop/relaunch restored passenger session through `/api/v1/me`.
- Logout returned to login and preserved Arabic locale.
- Driver demo account logged in and routed to driver home shell.
- Merchant demo account logged in and routed to merchant home shell.
- Invalid password showed translated invalid-credentials error.
- English switch changed login UI to LTR English.
- Force-stop/relaunch preserved English selection.
- No crash, overflow, or visibly broken layout was observed during smoke.
- Runtime screenshots captured under `C:\Users\basha\AppData\Local\Temp\opencode`, including Arabic login, passenger restore, driver, merchant, invalid-password, English, and English relaunch screenshots.

M4D validation results:
- Pre-step repository baseline was clean at `a72e876 feat: add mobile auth and role routing`.
- Pre-step mobile validation passed: `flutter pub get`, `flutter gen-l10n`, `flutter analyze`, `flutter test`.
- Pre-step workspace validation passed: `npm run prisma:validate`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run build`.
- Backend contracts inspected directly before implementation: `passenger.ts`, `matching.ts`, `trips.ts`, `demoReset.ts`, and this project map.
- No backend contract mismatch blocked M4D.
- No backend code changes were made.
- `flutter pub get`: passed.
- `flutter gen-l10n`: passed.
- `dart format --set-exit-if-changed .`: passed.
- `flutter analyze`: passed, no issues.
- `flutter test`: passed, 25 mobile tests.
- `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000`: passed.
- Debug APK output: `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`.
- Existing repo regression passed: `npm run prisma:validate`, `npm run prisma:generate`, `npm run typecheck`, `npm run test`, `npm run build`.

M4D Android runtime smoke:
- Emulator: `emulator-5554`, `Medium_Phone_API_36.0`, Android 16 API 36.
- API started locally with local PostgreSQL URL, development JWT secret, and demo reset key.
- API health returned `{"ok":true,"service":"masari-api"}`.
- Demo data reset passed with `POST /api/v1/demo/reset` and `x-demo-reset-key`.
- App data cleared before runtime smoke.
- App launched with `flutter run -d emulator-5554 --no-resident --dart-define=API_BASE_URL=http://10.0.2.2:3000`.
- Arabic default verified.
- Passenger login verified.
- Passenger dashboard loaded and showed seeded active request.
- Request detail opened and showed LTR request ID, pickup, destination, preferred time, count, status, and created time.
- Matching ran for the passenger request and showed selected route, score, scoring breakdown, and explanation.
- Seeded request cancellation was verified when backend state permitted it.
- New locked-corridor request was created from the passenger form and opened in detail.
- Matching ran for the new request and displayed result.
- Existing admin API was used outside the passenger app to accept the generated match and simulate one location event.
- Passenger dashboard showed connected trip after relaunch/session restoration.
- Passenger trip detail showed accepted status and latest simulated location with latitude, longitude, sequence, source, and recorded time.
- English switch changed UI to LTR English.
- Force-stop/relaunch preserved passenger session and English locale.
- Passenger app did not show driver/merchant accept/reject, trip mutation, or simulation controls.
- Runtime screenshots captured under `C:\Users\basha\AppData\Local\Temp\opencode`, including dashboard, request detail, match, cancel result, create form, created request, trip detail, and English relaunch.

M4E1 validation results:
- Repository baseline was clean on `master` at `cb0ff92 feat: add passenger mobile flow`.
- No remote is configured for this repository.
- No Prisma schema or migration files changed.
- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed with Prisma 7.8.0.
- `npm run typecheck`: passed for admin and API workspaces.
- `npm run test`: passed, 6 API test files and 57 tests.
- `npm run build`: passed for admin and API workspaces.
- `flutter pub get`: passed.
- `flutter gen-l10n`: passed.
- `dart format --set-exit-if-changed .`: passed, 42 files checked and 0 changed.
- `flutter analyze`: passed with no issues.
- `flutter test`: passed, 25 mobile tests.
- Focused M4E1 test file contains 9 tests covering authentication, all four role filters, newest-first ordering, safe summaries, scoring breakdown, valid/invalid status filters, and detail ownership consistency.

M4E1 real PostgreSQL smoke:
- Local PostgreSQL on port `5432` and a temporary API on port `3110` were used; demo data was reset through the protected real endpoint.
- Passenger, both drivers, merchant, and admin logged in through the real auth endpoint.
- Passenger matching created match `cmrixqnun000qkkhnwkoufhvk` and merchant matching created match `cmrixqnvb000skkhna1zahtjo`.
- Selected driver inbox returned both connected matches; alternate driver inbox returned zero.
- Passenger inbox returned exactly the passenger match; merchant inbox returned exactly the merchant match; admin inbox returned both.
- Admin results were newest first and included scoring breakdown and the safe summary contract without sensitive ownership or credential fields.
- Connected driver detail returned `200`; unrelated driver detail returned `403`.
- After the passenger match was accepted, `status=proposed` returned only the merchant match and `status=accepted` returned only the passenger match.
- Invalid status returned `400`.

M4E1 independent audit before M4E2:
- Audited `PROJECT_MAP.md`, `apps/api/src/modules/matching.ts`, `apps/api/src/tests/matchInbox.test.ts`, Prisma `Match` relations, list ownership scopes, safe serialization, and detail ownership.
- Confirmed the M4E1 commit added no Prisma schema or migration change.
- Fresh regression passed unchanged: Prisma validation/generation, workspace typecheck, 6 API files/57 tests, workspace build, Flutter dependency/localization generation, clean formatting, analysis, and the then-current 25 mobile tests.
- Fresh PostgreSQL smoke on port `5432` with API port `3111` reset the demo, created passenger match `cmriyh2ht001ebghng3bcfr2p`, and confirmed selected driver 1 saw exactly one match while alternate driver 2 saw zero.
- The same smoke confirmed passenger/admin visibility, proposed filtering, scoring breakdown, invalid status `400`, and unauthenticated `401`.
- M4E1 passed without a corrective change or audit-only commit.

M4E2 validation results:
- No package dependency, backend source, Prisma schema, or migration change was made.
- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed with Prisma 7.8.0.
- `npm run typecheck`: passed for admin and API workspaces.
- `npm run test`: passed, 6 API files and 57 tests including the M4E1 inbox regression.
- `npm run build`: passed for admin and API workspaces.
- `flutter pub get`: passed.
- `flutter gen-l10n`: passed.
- `dart format --set-exit-if-changed .`: passed, 54 files checked and 0 changed.
- `flutter analyze`: passed with no issues.
- `flutter test`: passed, 44 mobile tests including M4C auth/session and M4D passenger regressions.
- `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000`: passed.
- Debug APK output: `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`.

M4E2 Android/PostgreSQL runtime smoke:
- Emulator: `emulator-5554`, AVD `Medium_Phone_API_36.0`, Android 16 API 36.
- Local PostgreSQL remained on port `5432`; an unrelated existing local project occupied port `3000`, so the runtime-only Masari build used API port `3111` and `API_BASE_URL=http://10.0.2.2:3111` without stopping the unrelated process.
- Demo reset passed; passenger matching created match `cmriyy9cm0028bghnls3fe209` for driver 1, while alternate driver 2 inbox returned zero.
- App data was cleared before launch and Arabic opened by default in RTL.
- Driver 1 login reached the real driver dashboard with seeded active route, proposed count `1`, and no fabricated active trip.
- Active route detail was visible; automated tests separately cover create/deactivate payloads, states, and failures.
- Own-route match appeared in the inbox with passenger summary and score; match detail showed all scoring components and accept/reject actions.
- Accept created trip `cmriyzs91002dbghnwcvfxeie` and navigated directly to driver trip detail.
- Two deterministic simulated points were recorded; latest location showed sequence `1`, source `simulated`, and updated route progress.
- UI advanced only through `accepted -> pickup_started -> picked_up -> in_transit -> delivered -> completed`; all timeline steps completed and the next-status action disappeared.
- Real API verification after UI completion returned trip status `completed`, driver route status `completed`, latest sequence `1`, and alternate driver match count `0`.
- English switch changed the complete driver trip to LTR English.
- Force-stop/relaunch restored the driver secure session and English locale, returning to the English driver dashboard.
- Logout returned to the English login screen, confirming locale persistence after session removal.
- Visual inspection found no crash, overflow, raw JSON, editable coordinates, map/GPS controls, or visibly broken layout in the exercised Arabic and English paths.
- The final deliverable APK was rebuilt after runtime smoke with the requested default emulator API URL on port `3000`.

M4F validation results:
- Baseline was clean on `master` at `103099e feat: add driver mobile flow`; no Git remote is configured.
- Port `3000` was selected after both `3000` and `3111` were verified free; API, emulator runtime, smoke, documentation, and APK all use `http://10.0.2.2:3000`.
- Backend correction was committed separately as `70e8f97 fix: persist merchant batch state`.
- No dependency, Prisma schema, migration, admin, passenger, or driver feature change was made.
- The now-unused generic `RoleHomeScreen` shell was removed after the merchant role became the final specialized mobile role; no role-home Dart orphan remains.
- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed with Prisma 7.8.0.
- `npm run typecheck`: passed for admin and API workspaces.
- `npm run test`: passed, 6 API files and 59 tests.
- `npm run build`: passed for admin and API workspaces.
- `flutter pub get`: passed.
- `flutter gen-l10n`: passed.
- `dart format --set-exit-if-changed .`: passed.
- `flutter analyze`: passed with no issues.
- `flutter test`: passed, 60 mobile tests including M4C auth/session, M4D passenger, and M4E2 driver regressions.
- `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000`: passed.
- Debug APK output: `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`.

M4F tests added:
- Repository contract tests cover order list/detail, safe persisted batches, exact locked pickup/destination DTOs, three-parcel creation, batch, merchant matching body, inbox/status filter, match detail, trip list/detail, and latest location.
- Controller tests cover dashboard success/empty/error state, latest order/batch/waiting match/active trip, 1-to-10 parcel bounds, batch-then-match state gating, and exactly three lifecycle-aware trip/order/location timers.
- Widget/routing tests cover Arabic RTL merchant dashboard, English persistence, locked form without editable coordinates, three-parcel submission, batching, scoring detail, absence of accept/reject and trip/simulation controls, read-only trip/location state, cross-role guards, and unauthenticated redirect.
- API regression tests cover safe persisted batch summaries and `409 order_already_batched` without creating a duplicate.

M4F real PostgreSQL/API smoke:
- Protected reset succeeded against local PostgreSQL on port `5432` with API port `3000`.
- Merchant login returned the seeded order, then a real three-parcel order was created using the locked coordinates.
- Batch creation returned status `created`, estimated distance saved `43.06`, persisted in subsequent order detail, and a duplicate attempt returned `409`.
- Merchant matching returned final score `0.951`; merchant inbox returned the owned match, selected driver 1 returned it, and alternate driver returned zero.
- Selected driver accepted the match; merchant trip list returned the connected trip.
- Authorized driver progressed the trip through `pickup_started`, `picked_up`, and `in_transit` and recorded two deterministic locations.
- Merchant subsequently observed trip/order/all-parcel status `in_transit` and location sequence `1`.
- Merchant trip mutation and simulation attempts both returned `403`.

M4F Android runtime smoke:
- Emulator `emulator-5554`, AVD `Medium_Phone_API_36.0`, Android 16 API 36 ran through `flutter run` with `API_BASE_URL=http://10.0.2.2:3000` after app data was cleared.
- Arabic opened by default in RTL; merchant preset login reached the real merchant dashboard.
- A new order with three parcel rows was created in the UI; no editable latitude/longitude field was present and order detail showed all three parcels.
- With no route capacity available, batching rendered the translated no-compatible-driver state without losing the order; after an authorized alternate route was activated, retry succeeded and displayed persisted batch ID, explanation, and `43.06 km` benefit.
- Merchant matching navigated to safe scoring detail with status proposed, all scoring components, and the explicit read-only notice; no accept/reject controls were present.
- Role-filtered inbox displayed only merchant-owned matches from the exercised merchant account.
- The selected driver accepted through the authorized API; dashboard refresh showed the connected trip and assigned order.
- While merchant trip detail remained visible, authorized driver actions changed trip/order/all parcel states to `in_transit` and added location sequence `0`; the UI updated automatically after the 5/5/3-second polling windows.
- Merchant trip displayed no status or simulation controls.
- Switching to English changed the screen to LTR; force-stop/relaunch restored both secure merchant session and English locale; logout returned to English login and preserved locale.
- Visual inspection found no crash, overflow, raw JSON, coordinate editor, map/GPS controls, or driver mutation actions in the exercised merchant flow.

[M5A_DEMO_HARDENING]
Scope:
- Integration validation and surgical demo hardening only; no new product feature, table, migration, dependency, AI, Socket.IO, live GPS, map, payment, registration, multi-city, deployment, or scoring design was added.
- Baseline was clean on `master` at `8531bb0 feat: add merchant mobile flow`; no Git remote is configured.
- Preferred environment is fixed to host API `http://localhost:3000`, Android emulator API `http://10.0.2.2:3000`, and Vite admin `http://localhost:5173` with 5174/5175 supported by CORS.

Final judge story and combined-flow result:
- The existing schema and contracts were explicitly intended to support one match with both `passenger_request_id` and `merchant_order_id`; M5A uses that combined story.
- A surgical correction now loads the merchant order's newest parcel batch during matching and writes `parcel_batch_id` to the combined match. Accepting it creates one trip linked to passenger request, merchant order, and parcel batch.
- Primary story: reset -> passenger request -> merchant five-parcel batch -> one explainable combined match -> selected driver acceptance -> valid lifecycle and deterministic locations -> passenger/merchant observers -> admin comparison.
- The selected driver owns the match through its route; the alternate driver sees zero. Passenger and merchant see only their connected data and cannot mutate trip/tracking.

Deterministic reset audit:
- Protected reset without a key/admin token returned `403`.
- Five consecutive real PostgreSQL resets produced identical counts and stable seeded identities: 5 users, 2 driver profiles, 2 driver routes, 1 passenger request, 1 merchant order, 5 parcels, 3 demo scenarios, and 2 reset audit events.
- Every reset left 0 parcel batches, matches, trips, location events, and comparison runs; no duplicate active route, batch, accepted match, orphan trip, or mutable demo-created request/order remained.
- Each full smoke also ends with the no-route `404` recovery case followed by a clean protected reset.

Demo tooling and documentation:
- `npm run demo:preflight` checks required environment values, PostgreSQL, API health, admin reachability/config, mobile URL, debug APK, and adb device. Final result: 10/10 checks passed.
- `npm run demo:smoke` uses real HTTP APIs for protection, reset, all role logins, combined match/batch, ownership isolation, acceptance conflicts, lifecycle conflicts, three locations, cross-role state, comparison, CORS, no-route handling, and reset recovery.
- The smoke script contains no reset/JWT/database secrets; only intentionally seeded demo credentials are present.
- A controlled dead-port invocation exits nonzero with `[demo:smoke] FAILED`, proving failure is not silently skipped.
- Presenter runbook: `DEMO_RUNBOOK.md`.
- Evidence screenshots: `docs/demo/screenshots/` outside generated build directories.

Five-run rehearsal result:
- Five consecutive `npm run demo:smoke` runs passed in 2.20, 1.86, 1.79, 1.76, and 1.80 seconds.
- Every run produced final score `0.9317`, location sequence `2`, comparison winner `masari`, 1 versus 6 trips, distance `21.53` versus `129.19`, and estimated cost `43.06` versus `258.38`.
- Every run rejected unauthorized/cross-role/duplicate/invalid actions as expected and restored the deterministic seed without manual database edits.

Admin Full Demo Sequence audit:
- Real browser QA ran the Arabic default RTL console through reset/login/load, merchant batch, combined match, comparison, acceptance, full lifecycle, and tracking using current APIs.
- The sequence is ordered so the merchant batch exists before the combined match, stops visibly on a failed API call, and updates the match, batch, route, request, order, trip, tracking, and comparison cards to authoritative final state.
- All 14 progress steps retranslate live when switching locale; English LTR and Arabic RTL persist through `masari_locale` and page reload.
- Controlled API outage showed the translated network error; API recovery plus refresh restored the authenticated dashboard.

Cross-role emulator and visual QA:
- Real Android 16/API 36 emulator QA covered Arabic login; passenger dashboard/request/match/trip; driver dashboard/inbox/match/trip; merchant dashboard/order/batch/match/trip; and an English representative screen for every role.
- The selected driver accepted and advanced the real combined trip through `accepted -> pickup_started -> picked_up -> in_transit -> delivered -> completed`; invalid lifecycle controls disappeared.
- Passenger and merchant observed the same in-transit trip and location sequence `1`; merchant order, all five parcels, and batch agreed with trip state and remained read-only.
- Merchant English locale and secure JWT survived force-stop/relaunch. Passenger, driver, and merchant representative English screens were LTR.
- Visual inspection found no crash, overflow, clipped primary action, untranslated localization key, raw JSON, unauthorized control, or sensitive credential exposure. Technical IDs/coordinates remained readable LTR.
- Match/explanation/status and simulated-source display were localized; backend API enum values remain English.

Failure and recovery result:
- Invalid login/no token, reset protection/idempotence, duplicate batch `409`, duplicate acceptance `409`, invalid status jump `409`, role mutation `403`, cross-role match isolation, no-route `404`, polling disposal/lifecycle timer deduplication, CORS, session/locale relaunch, and API outage/retry are covered by real smoke, emulator/browser exercises, and focused regressions.
- Dashboard manual refresh now promotes failures to visible translated retry state for passenger, driver, and merchant instead of silently retaining stale success state; retry after API recovery succeeds without clearing the valid JWT.
- No authorization rule was weakened.

Final M5A validation:
- `npm install`: passed; existing 3 moderate Prisma CLI transitive findings remain and `npm audit fix --force` was not run.
- `npm run prisma:validate` and `npm run prisma:generate`: passed with Prisma 7.8.0; no schema or migration changed.
- Workspace `npm run typecheck`, `npm run test`, and `npm run build`: passed; API has 6 files / 60 tests.
- Admin `npm run typecheck:admin`, `npm run test:admin`, and `npm run build:admin`: passed; admin has 1 file / 7 tests.
- Mobile dependency/localization generation, clean formatting (69 files), analysis, tests, and debug APK build passed; mobile has 62 tests.
- Final post-build `demo:preflight` passed 10/10 and `demo:smoke` passed against real PostgreSQL/API in 1.98 seconds, ending with clean reset recovery.

APK:
- Final command: `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000`.
- Output: `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`.
- Installed successfully on `emulator-5554`.

[M5B_PRESENTATION_FREEZE]
Scope freeze:
- Masari feature development is frozen for the hackathon presentation. Only presentation-blocking corrections are permitted.
- No new API, screen, business feature, database table, dependency, matching formula, architecture, AI, Socket.IO, GPS, map, payment, registration, multi-city, app-store, or deployment work was added.
- The only executable correction was strengthening `demo:preflight` to validate Masari API/admin identity instead of accepting any HTTP 200 response on the expected ports.

Designated presentation machine audit (2026-07-13):
- The exact event judge machine cannot be independently identified from repository context. M5B validated the currently designated presentation machine `C:\Users\basha\Desktop\Masari`; if the event uses another physical machine, run the transfer checklist in `README_DEMO_START.md` before presenting.
- Windows 11 Pro 24H2, version `10.0.26100`, build `26100` (`flutter doctor` reported `10.0.26100.8655`).
- Node.js `v22.17.1`; npm `10.9.2`; PostgreSQL `18.3`, Windows service `postgresql-x64-18` running automatically on port 5432.
- Flutter `3.44.6` stable; Dart `3.12.2`; Android SDK `C:\Users\basha\AppData\Local\Android\Sdk`, platform/build-tools 36.0.0.
- Flutter-selected Java: Android Studio bundled OpenJDK `21.0.6` at `C:\Program Files\Android\Android Studio\jbr\bin\java`.
- AVD `Medium_Phone_API_36.0`, `emulator-5554`, Android 16/API 36.
- Memory: 15.84 GB total / 3.16 GB free at audit. Disk: C 77.01 GB free; D 163.16 GB free.
- Active presentation network: Wi-Fi `192.168.6.28`, gateway `192.168.6.1`; VMware and Hyper-V local adapters also present.
- Port ownership was inspected before stopping anything: verified Masari Node API on 3000, verified Masari Vite on 5173, PostgreSQL on 5432. No unrelated process was terminated.

Frozen URLs and artifacts:
- API `http://localhost:3000`; admin `http://localhost:5173`; Android emulator API `http://10.0.2.2:3000`.
- Debug APK source: `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`, 191,880,956 bytes.
- APK SHA-256: `0F9C367DEFC1A9E986E1522D2E2331962EE6E5D685B32D217FA09DB4B425B619`, unchanged after the required final rebuild.
- Presenter script: `JUDGE_SCRIPT.md`; operational runbook: `DEMO_RUNBOOK.md`; backup: `BACKUP_DEMO.md`; start card: `README_DEMO_START.md`; notes: `RELEASE_NOTES.md`.
- Ignored package folder: `release/masari-hackathon-demo/`; ignored ZIP: `release/masari-hackathon-demo.zip`.

Cold-start result:
- Verified M5A API/Vite ownership, stopped only those processes, shut down the emulator, left PostgreSQL untouched, and confirmed ports 3000/5173 free.
- Cold-state preflight correctly blocked at 7/10 because API, admin, and Android device were unavailable.
- No-snapshot AVD boot, API, Vite, fresh APK uninstall/install, launch, and readiness completed in `33.71` seconds (target under 3 minutes).
- Post-start preflight passed 10/10; protected reset completed in `0.73` seconds (target under 30 seconds); cold smoke completed in `2.95` seconds.
- Fresh mobile install opened Arabic by default; real browser opened the admin login in Arabic RTL; the full admin sequence completed with authoritative match/batch/trip/tracking/comparison state.
- An initial dress-rehearsal launcher incorrectly forwarded Vite flags through the nested root npm script, so Vite did not bind. No source defect existed; the exact documented command `npm run dev:admin` was used for the timed clean rerun and passed.

Failure and recovery rehearsal:
- With authenticated Arabic admin and passenger sessions open, the verified API process was stopped during the demo.
- Admin displayed the translated server-connection error; mobile displayed the Arabic retry state without crashing or losing the passenger session.
- Restarting the same API configuration restored admin Refresh and mobile Retry; a protected reset then completed without database edits.
- Full visual recovery time was `89.07` seconds (target under 2 minutes); API was healthy after `53.83` seconds and the recovery reset took `0.45` seconds.
- A separate final recovery run proved preflight blocks while API is absent and completed API restart + 10/10 preflight + full smoke in `4.10` seconds.
- Controlled unrelated HTTP services on a temporary port were rejected as “not the Masari API” and “not the Masari admin console,” proving port/service conflict identity detection.

Three final rehearsals using `JUDGE_SCRIPT.md`:
- The written presenter timeline is fixed at exactly `8:00`; automated technical execution is recorded separately and does not pretend to be spoken presentation time.
- Arabic-primary: passed, technical flow `2.56` seconds, no presenter/technical issue.
- Normal full: passed, technical flow `2.16` seconds, no presenter/technical issue.
- Recovery: preflight blocked the outage, then passed after restart; technical smoke `2.43` seconds and recovery + smoke `4.10` seconds.
- Every run returned score `0.9317`, sequence `2`, trips `1` versus `6`, distance `21.53` versus `129.19`, cost `43.06` versus `258.38`, winner `masari`, and clean reset recovery.

Final M5B validation:
- Prisma validation/generation passed with Prisma 7.8.0; no schema or migration changed.
- Workspace typecheck/build passed; API 6 files / 60 tests passed.
- Admin typecheck/build passed; 1 file / 7 tests passed.
- Mobile dependency/localization generation, clean formatting (69 files), analysis, 62 tests, and debug APK build passed.
- Final `demo:preflight` passed 10/10; final real PostgreSQL/API `demo:smoke` passed in `2.04` seconds with all frozen values.
- `npm audit fix --force` was not run. The existing Prisma CLI advisory remains documented.

Release identity:
- Final annotated local tag: `v0.1.0-hackathon`, pointing to the M5B freeze commit.
- The package checksum manifest and packaged `RELEASE_NOTES.md` resolve the exact freeze commit after the commit/tag is created.
- No remote was configured or pushed.

[M5C_MYSQL_PROVIDER_MIGRATION]
Safety and fallback:
- Work began from clean PostgreSQL release commit `074fc4e7cc79c6b08a2baa18ca251b4802aa48c7`; `v0.1.0-hackathon` still points exactly to it.
- Work is isolated on branch `mysql-release`; the PostgreSQL commit/tag and migration history were not amended or moved.
- The local ignored `apps/api/.env` is used without printing, documenting, packaging, or committing real credentials/secrets.
- Authenticated read-only inspection confirmed the intended `masari` database had 0 tables, views, triggers, routines, and events before migration.
- No PostgreSQL row transfer was performed; deterministic demo reset is the MySQL data strategy.

Observed MySQL target:
- MySQL Community Server 8.0.46 on local port 3306.
- Database: `masari`.
- Database character set/collation: `utf8mb4` / `utf8mb4_0900_ai_ci`.
- Prisma-created tables use `utf8mb4_unicode_ci` and support Arabic, English, and emoji.

Prisma/provider changes:
- Prisma schema datasource provider is `mysql`; Prisma ORM/Client remain 7.8.0.
- Runtime uses `@prisma/adapter-mariadb` 7.8.0 and `mariadb` 3.4.5 with credentials parsed internally from `DATABASE_URL` into driver options.
- PostgreSQL runtime dependencies `@prisma/adapter-pg`, `pg`, and `@types/pg` were removed after real MySQL validation.
- Active migration history contains `20260713114812_mysql_baseline` and `20260713114851_preserve_text_capacity`, with `migration_lock.toml` provider `mysql`.
- The follow-up migration explicitly maps parcel-batch/match explanations, comparison benefit, and demo-scenario description to MySQL `TEXT`, preserving the former unbounded PostgreSQL capacity.
- JSON maps to MySQL `JSON`; deterministic decimals retain their declared precision/scale; dates use `DATETIME(3)` through Prisma.
- Approved commands: `npm run db:migrate` and `npm run db:migrate:status`. `db push` is not the release mechanism.

Reset and Unicode verification:
- Five consecutive protected resets produced the exact counts: users 5, driver profiles 2, routes 2, passenger requests 1, merchant orders 1, parcels 5, demo scenarios 3, audit events 2, and zero batches, matches, trips, locations, and comparison runs.
- After every reset, the admin dashboard returned users 5, drivers 2, routes 2, passenger requests 1, merchant orders 1, and parcels 5.
- An Arabic-plus-emoji passenger request was created and read through the real HTTP API with exact text equality, then removed by a final protected reset.

Demo tooling and rehearsal:
- `demo:preflight` loads the ignored API environment when shell values are absent and reports only presence/provider-safe facts.
- Preflight verifies MySQL protocol, connectivity, expected database, `utf8mb4`, collation, Masari API/admin identity, API URL consistency, APK, and Android device.
- `demo:smoke` loads the same ignored environment without displaying values and retains the complete cross-role story and recovery checks.
- Five full real MySQL rehearsals passed with score `0.9317`, sequence `2`, trips `1` versus `6`, distance `21.53` versus `129.19`, cost `43.06` versus `258.38`, winner `masari`, alternate-driver isolation, combined trip state, and clean recovery reset.
- Rehearsal technical durations were 5.46, 5.03, 4.96, 4.99, and 6.03 seconds.
- Final preflight passed 12/12.
- Final workspace validation passed: Prisma validate/generate, migration deploy/status, typecheck, 6 API files / 60 tests, and build.
- Final admin validation passed: typecheck, 1 file / 7 tests, and production build.
- Final mobile validation passed: dependency/localization generation, 69 files with zero formatting changes, analysis with no issues, and 62 tests.
- The unchanged debug APK retained the approved API URL/hash, installed on `emulator-5554`, opened Arabic-first, and completed real passenger login/dashboard loading against the MySQL-backed API.

Release documentation:
- MySQL setup/provider-transition instructions: `MYSQL_MIGRATION.md`.
- Updated operational files: `README.md`, `README_DEMO_START.md`, `DEMO_RUNBOOK.md`, `BACKUP_DEMO.md`, `RELEASE_NOTES.md`, and the safe API environment template.
- PostgreSQL fallback instructions consistently reference `v0.1.0-hackathon`.

[SUCCESS_CRITERIA]
M1 success criteria:
- API can start.
- Prisma schema validates.
- Demo reset is protected.
- Demo reset seeds deterministic users and corridor data.
- Seeded demo accounts can login after reset.
- Authenticated users can call `/api/v1/me`.
- PROJECT_MAP.md documents actual implementation state.

[ORPHANS & PENDING]
Current pending items:
- npm audit reports 3 moderate findings through Prisma CLI transitive `@hono/node-server`. The available force fix would downgrade Prisma from 7.8.0 to 6.19.3, so this needs a Prisma upstream patch or explicit approval to downgrade.
- Judge-day reliability now depends on local MySQL, API, Vite, and emulator readiness; run `npm run db:migrate:status`, `npm run demo:preflight`, and `npm run demo:smoke` before presenting.
- The comparison and tracking are intentionally deterministic hackathon simulations, not production routing, live GPS, or live prices.
- Existing PostgreSQL rows were intentionally not migrated; `v0.1.0-hackathon` remains the working PostgreSQL fallback.
- If a different physical event machine is used, its MySQL database/service, safe local environment, port 3306, emulator acceleration, APK install, migration status, and full preflight remain a required transfer check.
- Next recommended step: preserve both release tags, transfer the ignored MySQL release ZIP to the actual event machine, apply/status-check migrations against an empty dedicated database, run preflight and one smoke, then present the frozen eight-minute script.

Commands to run locally:
```powershell
# Set DATABASE_URL, JWT_SECRET, DEMO_RESET_KEY in the current shell.
npm install
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:migrate:status
npm run dev:api
npm run demo:preflight
npm run demo:smoke
```

[M6B1A_PRODUCTION_ISOLATION]
Scope:
- Added the canonical `APP_ENV` model: `local`, `test`, `demo`, `staging`, and `production`.
- Added fail-closed backend validation for database URL, minimum/non-placeholder JWT secret, explicit production-like CORS, release identity, and demo-only credentials.
- Staging/production reject demo enablement; production also rejects wildcard and local CORS origins.
- No Prisma schema, migration, or dependency change was made.

Route registration:
- `POST /api/v1/demo/reset`, tracking simulation step/reset, and deterministic comparison routes register only when demo features are enabled.
- Staging and production return `404` because these routers are absent.
- Normal role routes, trip lifecycle/reads, and latest-location reads remain registered.

Credential/build isolation:
- Backend demo reset reads passwords only from validated `DEMO_*_PASSWORD` values.
- Admin uses typed `VITE_APP_ENV` configuration; production-like builds require HTTPS and omit credentials, reset tools, full demo automation, deterministic comparison, and simulation UI.
- Admin JWT persistence moved from `localStorage` to `sessionStorage`; logout/startup clear the legacy token location.
- Flutter uses typed compile-time `APP_ENV` configuration; production-like builds require HTTPS and omit presets and driver simulation controls while retaining read-only location.

Sensitive-data safety:
- Admin user relations use explicit safe selections and allowlisted serializers.
- `password_hash` and authentication metadata cannot be serialized by admin driver/request/order/route responses.

Focused documentation:
- `docs/architecture/environment-matrix.md`.
- `docs/security/production-isolation.md`.
- `docs/decisions/ADR-001-demo-production-separation.md`.

Validation status:
- Focused configuration, route-isolation, safe-serialization, admin configuration/session, and Flutter build-isolation tests added.
- Prisma validate/generate, workspace typecheck/build, 8 API files / 72 tests, and 3 admin files / 12 tests passed.
- Flutter dependency/localization generation, 70-file clean formatting, analysis, and 65 tests passed.
- Explicit demo and production-like admin builds passed; the production bundle scan found no former passwords, reset header/path, simulation/comparison paths, or Full Demo Sequence text.
- Explicit demo debug and production-like release APKs built; extracted production APK scan found no known or injected demo passwords. Production-like APK SHA-256: `5B55A9D1E59801E5C341A7C56845EA989FEC40D490E3F3BE9EF47178B3F46A9A`.
- Real MySQL demo preflight passed 18/18 and full smoke retained score `0.9317`, tracking sequence `2`, trips `1` versus `6`, distance `21.53` versus `129.19`, cost `43.06` versus `258.38`, and winner `masari`.
- Separate production-mode runtime validation passed 10/10: health and normal role/trip/location routes remained registered, while reset, simulation step/reset, and deterministic comparison returned `404`.

Remaining after M6B1A:
- M6B1B implements rate limiting, structured/redacted production logging, request IDs, security headers, body limits, and database-backed readiness below.
- Server-managed admin sessions remain part of the later authentication lifecycle milestone.

[M6B1B_PRODUCTION_HTTP_BASELINE]
Scope:
- Every request receives a generated UUID or strictly validated inbound `X-Request-Id`; responses expose the same header and safe errors include `request_id`.
- Pino emits asynchronous JSON operational logs using an allowlist of environment/release, request, route, status, duration, actor, and event fields. Bodies, query strings, headers, tokens, passwords, phones, coordinates, database URLs, reset keys, error messages, and stacks are excluded.
- Global `/api/v1` and stricter login rate limiters use IPv6-safe IP keys. Login adds only a one-way normalized-phone digest. Health routes and CORS preflight are excluded; the current MemoryStore is single-instance only.
- Staging/production require explicit `TRUST_PROXY`; direct mode trusts no forwarded headers and proxy mode accepts only a documented hop count.

HTTP policy:
- Helmet disables `X-Powered-By`, MIME sniffing, framing, and referrer leakage, and applies same-site resource policy. HSTS is emitted only in staging/production.
- JSON bodies are limited to 64 KB and form bodies to 16 KB. Invalid/oversized bodies return controlled errors without echoing content.
- Central errors preserve safe domain codes, sanitize Zod details, map known Prisma conflict/not-found cases, and return generic unknown/database failures with request IDs.
- Shared coordinate schemas enforce latitude `-90..90` and longitude `-180..180` for passenger requests, merchant pickup, and parcel destinations while retaining the existing numeric-string contract.

Health and lifecycle:
- `/api/v1/health` preserves service identity; `/health/live` is database-independent; `/health/ready` performs a bounded, read-only Prisma/MySQL check and returns redacted `503` on failure/timeout.
- Health endpoints precede rate limiting. Demo preflight now requires database-backed readiness.
- SIGINT/SIGTERM stop new connections, close the HTTP server, disconnect Prisma, emit safe lifecycle events, and enforce a 10-second shutdown bound.
- No Prisma schema or migration change was made. Admin and Flutter contracts/source remain unchanged by M6B1B.

Focused documentation:
- `docs/security/http-security-baseline.md`.
- `docs/operations/logging-and-request-ids.md`.
- `docs/operations/health-and-readiness.md`.
- `docs/decisions/ADR-002-operational-logging-and-correlation.md`.

Validation status:
- Configuration, request ID, redaction, actor metadata, global/login rate limits, proxy spoof resistance, IPv6-safe keying, headers/HSTS/CORS, body limits, safe errors, coordinate boundaries, and readiness success/failure/timeout regressions are automated.
- Added exact dependencies after 2026-07 registry checks: Helmet `8.3.0`, express-rate-limit `8.5.2`, and Pino `10.3.1`. `pino-http` was evaluated but not added because the smaller allowlisted middleware avoids broad default request serialization.
- Prisma validate/generate, workspace typecheck/build, 10 API files / 94 tests, and production-like admin typecheck/build with 3 files / 12 tests passed.
- Flutter dependency/localization generation, 70-file clean formatting, analysis, and 65 tests passed. No APK rebuild was performed because M6B1B changed no admin/mobile source or shared client configuration.
- Real MySQL demo preflight passed 19/19, including readiness. Full smoke retained score `0.9317`, tracking sequence `2`, trips `1` versus `6`, distance `21.53` versus `129.19`, cost `43.06` versus `258.38`, winner `masari`, and reset recovery.
- Demo runtime headers/request IDs passed and 55 captured structured completion events contained no authorization material, password/phone keys, database URLs, seeded phones, or precise demo coordinates.
- Production-like real-MySQL checks passed: health/live/ready `200`, normal protected API `401`, demo reset/comparison/simulation `404`, CORS preflight `204`, login `401,401,401,429` with `Retry-After`, oversized JSON safe `413`, malformed JSON safe `400`, HSTS/security headers present, and `X-Powered-By` absent.
- Production log inspection passed across 14 completion events. With an unavailable database, liveness stayed `200`, readiness returned redacted `503 not_ready`, and a safe readiness-failure event was recorded.
- `npm audit --omit=dev` still reports the three known moderate Prisma CLI transitive `@hono/node-server` findings; its only proposed repair is the prohibited breaking Prisma `6.19.3` downgrade. `npm audit fix --force` was not run.
- No Prisma schema or migration changed.

Remaining security backlog after M6B1B:
- Shared external rate-limit storage is required before horizontal multi-instance scaling.
- Hosting selection must confirm the exact proxy-hop topology, TLS termination, React deployment headers, and external health-check policy.
- Server-managed admin sessions, refresh/session lifecycle, registration/OTP, distributed tracing, and production deployment remain later milestones.

[M6B2_ENGINEERING_DELIVERY_FOUNDATION]
Scope:
- Added four focused, locally validated GitHub Actions workflows for real-MySQL backend checks, admin, Flutter Android, and security/configuration gates.
- Added canonical `.nvmrc`, `.flutter-version`, and `.java-version` toolchain sources plus portable `validate`, focused validation, audit, workflow, tracked-content, and artifact-scan commands.
- Added a multi-stage, non-root API runtime image, separate controlled migration target, and private-network local staging simulation. No provider, hosting, schema, migration, API, admin, or mobile product change was introduced.
- Added transaction-consistent MySQL backup with SHA-256, fail-closed isolated restore verification, and reproducible safe release metadata.

CI and security contract:
- Backend CI creates only `masari_ci` in an ephemeral MySQL 8 service, deploys migrations from empty twice, checks status, runs all API tests/build, and executes the compiled deterministic real-MySQL smoke.
- Admin and mobile build production-like artifacts without demo configuration or signing secrets and scan outputs for reset/simulation/demo markers.
- Production APK scanning proved runtime-only UI gating retained driver simulation endpoint strings. A surgical compile-time product-build guard now removes those two existing calls from release artifacts while preserving demo/debug behavior; no screen or backend contract changed.
- Security CI rejects prohibited tracked artifacts and high-confidence credentials without printing values; high/critical and unapproved moderate dependency advisories fail. The moderate exception is limited to the documented Prisma CLI chain.
- External GitHub actions are immutable-SHA pinned. CI remains pending activation because no private remote URL has been supplied.

Operator commands:
- `npm run validate`, `validate:backend`, `validate:admin`, `validate:security`, and `validate:all`.
- `npm run mysql:backup` and `npm run mysql:restore:verify -- -- --dump <ignored-dump> --database masari_restore_<name> --confirm-isolated [--cleanup]` (the extra separator preserves flags with npm 10 on Windows).
- `npm run release:metadata -- -- --release <id> --environment <type> --output release/metadata.json`.
- Staging build/start, migration, health, isolation, and shutdown procedures are in `docs/operations/staging-startup.md`.

Recovery targets and boundaries:
- Provisional controlled-beta targets are RPO 15 minutes, RTO 2 hours, 30-day retention pending approval, monthly isolated restore rehearsal, and future encrypted owner-limited managed backups. No cloud backup infrastructure is claimed.
- Clean staging cannot exercise an authenticated normal route until onboarding or approved restored staging identities exist; unauthenticated `401` confirms protected routes remain registered.
- Remaining product work includes production user onboarding/OTP, server-managed access/refresh session lifecycle, verification, and later product capabilities. M6B2 does not implement them.

M6B2 validation status (2026-07-13):
- Local workflow parsing and required-step/reference checks passed for all four workflow files. The standard repository validation passed Prisma validate/generate, workspace typecheck/build, 94 API tests, 12 admin tests, tracked-content scanning, the precise npm audit policy, and 5 tooling safety/reproducibility tests.
- The production admin artifact scan passed. Flutter dependency/localization generation, 70-file clean formatting, analysis, and all 65 tests passed; the production-like release APK built and its extracted native payload passed the forbidden demo-marker scan. The generated APK remains ignored and is not a release artifact.
- Both API Docker targets built. Runtime user `node`, missing-configuration failure, explicit empty-database migration, live/ready `200`, protected route `401`, demo reset/comparison/simulation `404`, HSTS/security/request-ID headers, structured logs, and graceful shutdown (0.41 seconds) passed against an isolated MySQL 8 staging simulation with no seeded users.
- A real local MySQL logical backup and SHA-256 sidecar were created in the ignored backup directory. Restore into `masari_restore_m6b2_20260713` passed checksum, Prisma migration status, Masari physical-table identity, and read-only connectivity checks; verification took 2.876 seconds (3.53 seconds command elapsed) and cleanup removed only the isolated database.
- Demo preflight passed 19/19 and the real MySQL deterministic smoke retained score `0.9317`, tracking sequence `2`, trips `1` versus `6`, distance `21.53` versus `129.19`, cost `43.06` versus `258.38`, winner `masari`, and reset recovery.
- Safe release metadata generation passed with two migration checksums and reproducible output under `SOURCE_DATE_EPOCH`. No remote was configured and no CI run is claimed; private GitHub activation remains pending the team leader's exact approved URL.
