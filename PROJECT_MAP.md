# PROJECT_MAP.md

[PROJECT_OVERVIEW]
Masari is a Palestine-focused smart route-sharing logistics MVP.

Current implementation status: M1 Foundation + Demo Reset.

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
            │   └── prisma.ts
            ├── middleware
            │   ├── auth.ts
            │   └── error.ts
            ├── modules
            │   ├── auth.ts
            │   └── demoReset.ts
            └── tests
                ├── auth.test.ts
                └── demoReset.test.ts
```

[DATA_MODEL]
Implemented Prisma models:
- User.
- DriverProfile.
- DriverRoute.
- PassengerRequest.
- MerchantOrder.
- Parcel.
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
- driver verification later.
- match decisions later.
- admin actions.

[STATE_MACHINES]
M1 defines schema enum values only. Business state transition enforcement is not implemented yet.

Current enum support:
- UserRole: passenger, driver, merchant, admin.
- DriverRouteStatus: inactive, active, assigned, on_trip, completed.
- RequestStatus: draft, pending, matched, accepted, picked_up, in_transit, delivered, cancelled.
- MerchantOrderStatus: draft, submitted, batched, assigned, in_transit, completed.
- ParcelStatus: pending, batched, assigned, picked_up, in_transit, delivered.
- AuditAction: auth_login, demo_reset, driver_verification, match_decision, admin_action.

[API_CONTRACTS]
Implemented endpoints:
- `GET /api/v1/health`.
- `POST /api/v1/auth/login`.
- `GET /api/v1/me`.
- `POST /api/v1/demo/reset`.

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

[MATCHING_LOGIC]
Not implemented in M1.

Seed data includes the locked corridor and demo route prerequisites needed for later matching work.

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
