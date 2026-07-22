# M7C1 migration and recovery

M7C1 adds forward-only migrations `20260722130000_multi_route_operational_foundation` and `20260722143000_isolate_canonical_availability`. The nine prior migrations and both frozen release tags remain byte-stable.

The first migration adds nullable canonical operational references, composite membership/order integrity, match/trip foundation fields, `CapacityReservation`, constraints/indexes, and bounded audit vocabulary. The second adds the canonical availability mode marker used to isolate new supply from M7B-linked legacy/demo `DriverRoute` rows.

Before the populated upgrade, create an ignored checksum-backed backup and record aggregate counts only. Apply with `npm run db:migrate`, verify with `npm run db:migrate:status`, and repeat deploy to prove a no-op. Never use `db push`, `migrate reset`, edit an applied migration, or rewrite `_prisma_migrations` checksums.

The development upgrade exposed MySQL 8.0.46 error 3823 when a checked canonical column used an `ON UPDATE CASCADE` foreign key. The failed `passenger_requests` ALTER was atomic; only the preceding new audit enum and two new indexes had committed. No application row changed. The uncommitted migration was corrected to restrictive updates, the two partial indexes were removed with FK index coverage preserved, Prisma marked the failed attempt rolled back, and the corrected migration then passed from an empty disposable database before the populated retry. The committed migration is the corrected byte-stable form.

Recovery proof requires both the pre-M7C1 backup restored into an isolated database and upgraded through all migrations, and a post-M7C1 backup restored at current status. Restore destinations must use the existing fail-closed isolated naming policy and be removed after verification.
