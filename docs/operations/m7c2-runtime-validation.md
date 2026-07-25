# M7C2 runtime validation

M7C2 is validated only with explicit local/demo `ROUTE_MANAGEMENT_ENABLED=true` and `MULTI_ROUTE_ENTRY_ENABLED=true`. `MULTI_ROUTE_MATCHING_ENABLED` remains false. Staging/production must reject entry enablement and advertise catalog/entry capability truthfully without exposing environment values.

Runtime evidence must cover three published routes, multiple directions, at least five ordered stops, passenger-only and parcel-only permissions, paused/retired/replaced/inactive versions, active role authorization, route replacement during a form, response loss and process restart for each atomic create, 50/51 parcel behavior, lifecycle conflicts, access-token refresh, logout/session revocation, Arabic/English, 200% text, rotation, and system/gesture back.

The gate also reruns all 13 migrations from empty/current status, M7C1 real-MySQL assertions, trusted sessions, public onboarding, backup/restore cleanup, 22/22 preflight, deterministic smoke, production-like capability isolation, and artifact/log scans. Expected deterministic demo values remain score `0.9317`, sequence `2`, trips `1` versus `6`, distance `21.53` versus `129.19`, cost `43.06` versus `258.38`, and winner `masari`.

No database migration or data cleanup is introduced by M7C2. Canonical test records are disposable owner data; the protected deterministic reset remains the approved demo reset.

## Completed validation evidence

The final branch gate passed a clean npm install, Prisma validation and generation,
repeat no-op deployment and current status for all 13 migrations, workspace
typecheck/build, 179 API tests, 27 admin tests, eight tooling tests, and the
standard and security policy suites. The production-configured admin build and
production-like release APK built and passed artifact isolation scanning. The
raw production dependency audit contains four documented moderate findings in
the Prisma CLI chain and no high or critical finding; no force fix or Prisma
version change was used.

Flutter dependency and localization generation, zero-change formatting,
analysis, and all 155 tests passed. A fresh rebuilt debug APK was installed on
`Medium_Phone_API_36.0` / Android API 36 and reached the MySQL-backed API.
Arabic opened RTL by default, English switched to LTR, the driver availability,
passenger request, and merchant atomic-order paths completed successfully, and
the matching-disabled boundary remained truthful. System back returned to the
role dashboard. Portrait, landscape, and 200% text remained scrollable without
overflow. An internal service-region key found during emulator review was
removed from visible route cards and the rebuilt APK was rechecked.

The dedicated real-MySQL suites passed from an empty 13-migration database,
including migration repeatability, trusted sessions, onboarding, public
onboarding, M7B route behavior, and the M7C1 78-assertion operational/concurrency
suite, followed by cleanup. A checksum-backed backup restored into an isolated
database, reported current migrations, and removed the isolated database.
Live demo preflight passed 22/22 and deterministic smoke retained score
`0.9317`, sequence `2`, trips `1` versus `6`, distance `21.53` versus `129.19`,
cost `43.06` versus `258.38`, and winner `masari`. Captured-log scanning found
no credential, authorization, idempotency-header, or coordinate markers.
