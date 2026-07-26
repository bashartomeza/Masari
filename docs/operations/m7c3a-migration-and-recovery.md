# M7C3A migration and recovery

M7C3A adds forward-only migration `20260726130000_canonical_matching_dispatch`. The prior 13 migrations and frozen tags remain byte-stable.

Before upgrade, create an ignored checksum-backed dump and record aggregate counts only. Apply:

```powershell
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:migrate:status
```

Repeat `npm run db:migrate` to prove a no-op. Never use `db push`, `migrate reset`, `migrate resolve`, or manual checksum changes.

The migration deterministically normalizes PassengerRequest, MerchantOrder, Parcel, and Trip mode to `legacy` or `canonical_route_v1`; adds composite parent/child mode and route constraints; adds dispatch and offer lifecycle fields; and enforces exact demand/availability/reservation/trip ownership. Existing legacy rows remain legacy.

Recovery proof restores the pre-M7C3A checksum dump into an isolated database, upgrades it through migration 14, checks current status and mode normalization, then restores a post-M7C3A dump separately. Restore databases must use the fail-closed isolated naming convention and be removed afterward.

The development migration was first proven from empty MySQL 8.0.46. MySQL required existing Match and Trip cascade/set-null foreign keys to become restrictive before their columns could participate in CHECK constraints. A replaced composite Match FK also required a distinct name within one ALTER. Both corrections occurred only in disposable databases before the migration reached the backed-up baseline.
