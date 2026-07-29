# M7C3C1 migration and recovery

M7C3C1 adds forward-only migration
`20260728130000_canonical_shared_trip_aggregation` after the 16-migration M7C3B baseline.
Independent review adds forward-only migration
`20260729120000_harden_canonical_shared_trip_integrity`. Migrations 1–17 and both frozen tags
remain unchanged.

Before upgrading a populated environment, create an ignored checksum-backed backup and record
aggregate counts only. Then run:

```powershell
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:migrate
npm run db:migrate:status
```

The second deployment must be a no-op and status must report all 18 migrations current. Never
use `db push`, `migrate reset`, `migrate resolve`, or manual migration checksum changes.

Migration 17 adds versioned manifests, ordered members, per-demand attempts, aggregate ownership
and provenance columns, restrictive composite foreign keys, generated active ownership keys,
and mixed shared-reservation checks. Existing canonical single-demand rows remain null in the
new shared columns and retain their M7C3A constraints and versions; legacy combined reservations
remain valid. There is no row transfer from legacy/demo data and no single-demand backfill.

Migration 18 enforces one offer per manifest, exact offer/reservation/manifest ownership with
restrictive composite foreign keys, coherent lifecycle timestamps, immutable aggregate/member
snapshots, and monotonic manifest/member/offer/reservation/attempt transitions. The MySQL
triggers use single-statement bodies so Prisma Migrate can apply them without client delimiter
directives. Protected demo reset moves shared rows only toward terminal cleanup before deleting
the restrictive dependency cycle. The backup writer narrowly normalizes the MySQL 8
single-statement-trigger delimiter emitted by `mysqldump`; checksum verification still covers
the exact normalized artifact, and restore never edits application rows.

Recovery proof must use isolated disposable MySQL 8.0.46 databases with utf8mb4. Restore the
checksum-backed migration-16 backup, apply migrations 17–18, repeat deployment, verify current
status, and prove existing canonical rows remain readable. Separately back up and restore a
post-M7C3C1 database and verify manifest/member/offer/reservation/Trip ownership and aggregate
counts. Remove both restore databases afterward. Do not print credentials, private rows,
fingerprints, or snapshots.

Rollback is application-level: disable the local/test/demo shared gate and continue using
M7C3A single-demand behavior. Migrations 17–18 are forward-only and are not reversed in place.
