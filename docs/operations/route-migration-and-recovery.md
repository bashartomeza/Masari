# Route migration and recovery

M7B uses the forward-only MySQL migration `20260721110000_canonical_route_catalog`. The seven earlier migration directories and both frozen release tags remain unchanged.

## Before deploy

1. Confirm the target is the intended MySQL database and has current migration history.
2. Inspect only aggregate DriverRoute/trip/corridor counts and validate nonnegative legacy capacities.
3. Create an ignored `mysqldump` backup and SHA-256 sidecar with `npm run mysql:backup`.
4. Verify the backup into an isolated `masari_restore_*` database.

## Deploy

```text
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:migrate:status
```

Run `npm run db:migrate` a second time to prove repeatability. Do not use `db push`, edit an applied migration, drop a populated database, or seed beta routes from migration SQL.

The migration creates `service_routes`, `service_route_versions`, `stops`, and `route_version_stops`; extends the audit enum; adds nullable DriverRoute compatibility/availability fields; backfills legacy capacity/status values; and adds Unicode tables, restrictive FKs, unique indexes, coordinate/date/sequence/capacity checks, and lookup indexes.

## Recovery evidence required

- Deploy all migrations from an empty `utf8mb4` database.
- Upgrade a populated seven-migration database.
- Restore the pre-M7B backup into an isolated database, apply M7B, and confirm current status.
- Create a post-migration backup, restore it without data loss, and remove the isolated target.
- Run the real route concurrency suite in an `_ci` or `masari_route_*` disposable database.
- Run deterministic demo reset/smoke and verify the locked metrics.

The test/demo reset deletes the new catalog in FK-safe order and recreates one exact deterministic route/version plus three canonical fixture stops. It is unavailable outside demo/test-enabled environments and does not seed production beta routes.

Rollback is application-level: disable both route flags. Schema rollback is not performed; history-bearing tables remain additive. Restore is reserved for a validated incident plan, never an automatic downgrade.
