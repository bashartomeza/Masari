# PROJECT_MAP.md

[PROJECT_OVERVIEW]
Masari is a Palestine-focused smart route-sharing logistics MVP.

Current implementation status: M2B Backend Matching, Parcel Batching, and Comparison Metrics.

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

Not implemented yet:
- Flutter app flows.
- React admin dashboard.
- Matching algorithm.
- Parcel batching algorithm.
- Comparison dashboard.
- AI parser.
- Live tracking.
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

Backend:
- Node.js.
- Express.
- TypeScript.
- Prisma.
- PostgreSQL.
- Zod.
- JWT.
- bcryptjs.

[SYSTEM_FLOW]
M1 flow:
1. Operator configures `DATABASE_URL`, `JWT_SECRET`, and `DEMO_RESET_KEY`.
2. API starts at `PORT`, default `3000`.
3. `GET /api/v1/health` returns health status.
4. `POST /api/v1/demo/reset` resets and seeds demo data.
5. Demo reset is protected by either an admin JWT or `x-demo-reset-key` matching `DEMO_RESET_KEY`.
6. Seeded users can login through `POST /api/v1/auth/login`.
7. Authenticated users can call `GET /api/v1/me`.

[ARCHITECTURE]
Actual folder structure:

```text
.
├── package.json
├── README.md
├── PROJECT_MAP.md
└── apps
    └── api
        ├── package.json
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── prisma.config.ts
        ├── .env.example
        ├── prisma
        │   ├── schema.prisma
        │   └── migrations
        │       └── 0001_init
        │           └── migration.sql
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
            │   └── demoReset.ts
            └── tests
                ├── auth.test.ts
                ├── demoReset.test.ts
                ├── matchingBatchingComparison.test.ts
                └── manualRoleApis.test.ts
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
- AuditAction: auth_login, demo_reset, passenger_request_created, passenger_request_cancelled, driver_route_created, driver_route_deactivated, merchant_order_created, parcel_batch_created, comparison_run_created, driver_verification, match_decision, admin_action.

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

Required validation commands:
- `npm install`.
- `npm run typecheck`.
- `npm run prisma:validate`.
- `npm run prisma:generate`.
- `npm run test`.
- `npm run db:push` requires a live PostgreSQL `DATABASE_URL`.
- `npm run build`.
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
