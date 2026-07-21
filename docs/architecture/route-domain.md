# Canonical route domain

M7B separates a stable route identity from immutable operational versions. It adds a catalog without changing the fixed-corridor matcher, passenger requests, merchant orders, batching, trips, or mobile contracts.

## Aggregate

- `ServiceRoute` owns the immutable `route_key`, direction group, region, direction, stable lifecycle, and the nullable current-version pointer.
- `ServiceRouteVersion` owns bilingual display content, active dates, geometry readiness, publication metadata, and a monotonically increasing version number.
- `Stop` is a stable reusable bilingual identity with bounded keys and `DECIMAL(9,6)` coordinates.
- `RouteVersionStop` freezes server-authoritative order and pickup/drop-off permissions for one version.
- `DriverRoute` remains the compatibility and one-off availability entity. Its legacy corridor/coordinate/capacity fields remain authoritative to the current matcher.

All new history-bearing foreign keys are restrictive. There is no published route/version delete API. A used stop or version cannot be removed through cascading deletion.

## Identity and versions

Route and stop keys are lower-case URL-safe values of at most 80 characters. API input normalizes spaces and underscores to hyphens; stored keys are immutable because update contracts do not include them.

Directions are separate canonical routes: `outbound`, `inbound`, or an explicitly approved `loop`. Opposite directions share a `route_group_key`. Mutable names never participate in route identity.

Versions start as `draft`. Only drafts accept name, description, active-date, stop-order, and permission changes. Publication changes the version to `published`; later correction clones the published/paused version into a new draft. Publication may pause a prior current published version, but never mutates its route content.

## Geometry boundary

M7B stores optional geometry fields and exposes only readiness, precision, distance, and duration summaries. Normal admin drafts start `pending`; no provider is called and no geometry is invented. The deterministic demo version alone stores the exact pre-existing fixture points as `demo-json-v1`.

No map SDK, geocoder, provider key, GPS permission, realtime transport, location ingestion, or route pricing is part of this domain.

## Compatibility boundary

`DriverRoute.route_version_id` and one-off availability fields are nullable. Existing rows are backfilled from their legacy capacities/status without removing legacy fields. The demo forward driver row links safely to the deterministic published version; the reverse legacy row remains unlinked because direction is different.

`MULTI_ROUTE_ENTRY_ENABLED` is rejected at startup throughout M7B. The production matcher continues to use the existing `corridor_key`, labels, coordinates, and capacities. M7C must explicitly migrate operational entry paths before this boundary changes.
