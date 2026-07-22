# Admin route-management API

Every route-management endpoint requires a live trusted admin session and `ROUTE_MANAGEMENT_ENABLED=true`. When disabled, these paths return `404`. Request bodies are strict allowlists and the global 64 KB JSON limit still applies.

## Routes and versions

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/service-routes` | Search/filter/page stable routes |
| POST | `/api/v1/admin/service-routes` | Create one stable route identity |
| GET | `/api/v1/admin/service-routes/:id` | Read route, versions, current version, stops, and usage counts |
| POST | `/api/v1/admin/service-routes/:id/versions` | Create a draft or clone a non-draft version |
| GET | `/api/v1/admin/route-versions/:id` | Read an admin version detail |
| PATCH | `/api/v1/admin/route-versions/:id` | Replace editable draft fields with `expected_revision` |
| PUT | `/api/v1/admin/route-versions/:id/stops` | Replace ordered draft stops with `expected_revision` |
| POST | `/api/v1/admin/route-versions/:id/publish` | Transactionally publish with expected draft/current versions |
| POST | `/api/v1/admin/route-versions/:id/pause` | Pause the current published version |
| POST | `/api/v1/admin/route-versions/:id/resume` | Resume the current paused version |
| POST | `/api/v1/admin/route-versions/:id/retire` | Terminally retire a version after usage checks |
| POST | `/api/v1/admin/service-routes/:id/retire` | Retire a stable route after all versions are retired |

Create, clone, publish, pause, resume, and retire calls require `Idempotency-Key` with 8–128 URL-safe characters. Same key and payload replay the resource. A changed payload returns `409 idempotency_conflict`; an in-flight claim returns `409 idempotency_in_progress`.

Draft PATCH and stop replacement use optimistic revision checks. A stale write returns `409 draft_revision_conflict`; any content mutation after publication returns `409 published_version_immutable`.

Publication requires bilingual names, two or more active unique contiguous stops, exact origin/first and destination/last alignment, distinct endpoints, downstream passenger pickup/drop-off, internally valid parcel permissions, and valid active dates. It locks both route identity and version in one real MySQL transaction. `expected_current_version_id` fences concurrent publication so exactly one caller selects the new current version.

## Stops

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/stops` | Search/filter/page reusable stops |
| POST | `/api/v1/admin/stops` | Create a stop with validated numeric coordinates |
| PATCH | `/api/v1/admin/stops/:id` | Edit an active stop not referenced by a non-draft version |
| POST | `/api/v1/admin/stops/:id/retire` | Retire without deleting history |

Coordinates must be within latitude `-90..90` and longitude `-180..180`. Stop keys are immutable. A stop referenced by published, paused, or retired history cannot be edited or deleted.

## Safe output and audits

Admin responses exclude password hashes, session/token data, encoded geometry, raw provider data, and actor credentials. Audit metadata is restricted to safe IDs, lifecycle transition, revision/count, request ID, direction, and categorical reason code. Free descriptions and coordinates are not copied into audit events or operational logs.
