# Canonical route domain

M7B separates a stable route identity from immutable operational versions. It adds a catalog without changing the fixed-corridor matcher, passenger requests, merchant orders, batching, trips, or mobile contracts.

## Aggregate

- `ServiceRoute` owns the immutable `route_key`, direction group, region, direction, stable lifecycle, and the nullable current-version pointer.
- `ServiceRouteVersion` owns bilingual display content, active dates, geometry readiness, publication metadata, and a monotonically increasing version number.
- `Stop` is a stable reusable bilingual identity with bounded keys and `DECIMAL(9,6)` coordinates.
- `RouteVersionStop` freezes server-authoritative order and pickup/drop-off permissions for one version.
- `DriverRoute` remains the compatibility and one-off availability entity. Its legacy corridor/coordinate/capacity fields remain authoritative to the current matcher.

All new history-bearing foreign keys are restrictive. There is no published route/version delete API. A used stop or version cannot be removed through cascading deletion.

The current-version pointer is protected by a composite foreign key from `(ServiceRoute.id, current_version_id)` to `(ServiceRouteVersion.service_route_id, id)`. The database therefore rejects a current pointer to a version owned by another route, even if application validation is bypassed.

## Identity and versions

Route and stop keys are lower-case URL-safe values of at most 80 characters. API input normalizes spaces and underscores to hyphens; stored keys are immutable because update contracts do not include them.

Directions are separate canonical routes: `outbound`, `inbound`, or an explicitly approved `loop`. Opposite directions share a `route_group_key`. Mutable names never participate in route identity.

Versions start as `draft`. Only drafts accept name, description, active-date, stop-order, and permission changes. Publication changes the version to `published`; later correction clones the published/paused version into a new draft. Publication may pause a prior current published version, but never mutates its route content.

Stops become content-immutable as soon as any route version references them, including a draft. This deliberately favors historical consistency over in-place stop correction: correct a not-yet-used stop before membership, otherwise create a new stable stop and a new route version. Retirement remains non-destructive, and published history keeps its names and coordinates. Stop replacement locks and validates all selected stops, increments the draft revision exactly once, and invalidates any prior geometry approval metadata.

The controlled-beta limit is five active `ServiceRoute` identities, not five lifetime rows or versions. Retired identities and replacement drafts do not consume an active slot. Creation enforces the envelope in a retryable serializable transaction so concurrent requests cannot exceed it.

## Geometry boundary

M7B stores optional geometry fields and exposes only readiness, precision, distance, and duration summaries. Normal admin drafts start `pending`; no provider is called and no geometry is invented. The deterministic demo version alone stores the exact pre-existing fixture points as `demo-json-v1`.

Cloning copies route content and ordered permissions, but clears encoded geometry, provider, checksum, precision, distance, duration, and approval state. A clone also locks its source stops and fails if any is retired or belongs to another service region.

No map SDK, geocoder, provider key, GPS permission, realtime transport, location ingestion, or route pricing is part of this domain.

## Compatibility boundary

`DriverRoute.route_version_id` and one-off availability fields are nullable. Existing rows are backfilled from their legacy capacities/status without removing legacy fields. The demo forward driver row links safely to the deterministic published version; the reverse legacy row remains unlinked because direction is different.

`MULTI_ROUTE_ENTRY_ENABLED` is rejected at startup throughout M7B. The production matcher continues to use the existing `corridor_key`, labels, coordinates, and capacities. M7C must explicitly migrate operational entry paths before this boundary changes.
