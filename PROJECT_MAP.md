# PROJECT_MAP.md

[PROJECT_OVERVIEW]
Masari is a Palestine-focused smart route-sharing logistics MVP.

Current implementation status: M3D Admin Console Arabic/English Localization.

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

Migration integrity result:
- M2B accidentally modified committed `0001_init` to add M2B audit enum values.
- This was unnecessary because those values belong in `0002_matching_batching_comparison`.
- Corrected by restoring `0001_init` and keeping M2B changes in `0002`.
- Corrective commit created: `chore: normalize Prisma migrations`.

Not implemented yet:
- Flutter app flows.
- AI parser.
- Live GPS tracking.
- Socket.IO.

[TECH_STACK]
Actual local runtime checked on 2026-07:
- Node.js: v22.17.1.
- npm: 10.9.2.

Package versions checked via `npm view` before pinning:
- express: 5.2.1.
- typescript: 6.0.3.
- prisma: 7.8.0.
- @prisma/client: 7.8.0.
- @prisma/adapter-pg: 7.8.0.
- zod: 4.4.3.
- jsonwebtoken: 9.0.3.
- bcryptjs: 3.0.3.
- dotenv: 17.4.2.
- pg: 8.22.0.
- @types/express: 5.0.6.
- @types/jsonwebtoken: 9.0.10.
- @types/node: 26.1.0.
- @types/pg: 8.20.0.
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

Backend:
- Node.js.
- Express.
- TypeScript.
- Prisma.
- PostgreSQL.
- Zod.
- JWT.
- bcryptjs.

Admin console:
- React.
- Vite.
- TypeScript.
- Plain CSS.
- Small typed in-repo i18n dictionary; no external localization library.

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
  "password": "demo-passenger-123"
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

[DEMO_MODE]
Implemented endpoint:
- `POST /api/v1/demo/reset`.

Seeded demo accounts:
- Passenger: `+970590000001` / `demo-passenger-123`.
- Driver 1: `+970590000002` / `demo-driver-123`.
- Driver 2: `+970590000003` / `demo-driver-123`.
- Merchant: `+970590000004` / `demo-merchant-123`.
- Admin: `+970590000005` / `demo-admin-123`.

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

Required validation commands:
- `npm install`.
- `npm run typecheck`.
- `npm run prisma:validate`.
- `npm run prisma:generate`.
- `npm run test`.
- `npm run db:push` requires a live PostgreSQL `DATABASE_URL`.
- `npm run build`.
- `npm run typecheck:admin`.
- `npm run build:admin`.
- Endpoint validation against local API and PostgreSQL.
- `npm audit --omit=dev`.

Prisma config behavior:
- `apps/api/prisma.config.ts` uses `DATABASE_URL` when set.
- For schema validation/generation without a local `.env`, it falls back to the `.env.example` local PostgreSQL URL.
- Real database operations still require a reachable PostgreSQL database.

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
- Manual browser visual QA remains pending because this tool environment cannot visually inspect the interactive browser. Required manual check: run `npm run dev:api`, run `npm run dev:admin`, open the admin console, login as admin, run full demo sequence, and verify the judge-facing layout and copy.
- Manual M3D language QA remains pending because this tool environment cannot visually inspect the interactive browser. Required manual check: clear `masari_locale`, verify Arabic RTL default, switch to English LTR, refresh, verify English persistence, switch back to Arabic, and run the full demo path.

Commands to run locally:
```bash
Copy-Item apps/api/.env.example apps/api/.env
# Fill DATABASE_URL, JWT_SECRET, DEMO_RESET_KEY
npm install
npm run prisma:validate
npm run prisma:generate
npm run db:push
npm run dev:api
```
