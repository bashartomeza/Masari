# M7C3A migration and recovery

M7C3A adds forward-only migrations `20260726130000_canonical_matching_dispatch` and `20260726170000_enforce_match_trip_availability_mode`. Independent-review correction migration `20260727110000_harden_canonical_assignment_integrity` adds demand and assignment fingerprints, same-dispatch pointers, and one-off availability ownership. Migrations 1-15 and the frozen tags remain byte-stable.

Before upgrade, create an ignored checksum-backed dump and record aggregate counts only. Apply:

```powershell
npm run prisma:validate
npm run prisma:generate
npm run db:migrate
npm run db:migrate:status
```

Repeat `npm run db:migrate` to prove a no-op. Never use `db push`, `migrate reset`, `migrate resolve`, or manual checksum changes.

The migration deterministically normalizes PassengerRequest, MerchantOrder, Parcel, and Trip mode to `legacy` or `canonical_route_v1`; adds composite parent/child mode and route constraints; adds dispatch and offer lifecycle fields; and enforces exact demand/availability/reservation/trip ownership. Existing legacy rows remain legacy.

Recovery proof restores the pre-M7C3A checksum dump into an isolated database, upgrades it through migrations 14-16, checks current status and mode normalization, then restores a post-M7C3A dump separately. Restore databases must use the fail-closed isolated naming convention and be removed afterward.

The development migrations were first proven from empty MySQL 8.0.46. MySQL required existing Match and Trip cascade/set-null foreign keys to become restrictive before their columns could participate in CHECK constraints. A replaced composite Match FK also required a distinct name within one ALTER. Mode-only keys close nullable route-key bypass for legacy rows; migration 16 additionally uses explicit `IS NOT NULL` checks because MySQL accepts unknown CHECK expressions, and composite ownership keys bind dispatch pointers and accepted Trip provenance. All corrections occurred only in disposable databases.

Independent correction validation applies all 16 migrations from empty, repeats deployment as a no-op, restores the checksum-backed 13-migration baseline and upgrades it through migration 16, and removes the isolated restore database. The M7C3A MySQL harness passes 98 persistent-state assertions, including direct cross-link rejection and availability/demand/expiry races.
