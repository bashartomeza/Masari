# Driver one-off availability API

All endpoints require a live active driver session and `MULTI_ROUTE_ENTRY_ENABLED=true`. The gate is local/test/demo only in M7C1; disabled routes return `404`. An approved (`verified`) driver profile is required, and non-owner IDs are concealed as `404`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/driver/availabilities` | List the driver's canonical one-off availability |
| `POST` | `/api/v1/driver/availabilities` | Create a draft; requires `Idempotency-Key` |
| `GET` | `/api/v1/driver/availabilities/:id` | Read one owner record |
| `PATCH` | `/api/v1/driver/availabilities/:id` | Edit a draft/paused record using `expected_revision` |
| `POST` | `/api/v1/driver/availabilities/:id/activate` | Draft to active |
| `POST` | `/api/v1/driver/availabilities/:id/pause` | Active to paused |
| `POST` | `/api/v1/driver/availabilities/:id/resume` | Paused to active |
| `POST` | `/api/v1/driver/availabilities/:id/cancel` | Cancel a draft/active/paused record with no held/confirmed capacity |

Creation accepts only `route_version_id`, `departure_at`, optional `availability_window_end`, `total_seats`, and `total_parcel_capacity`. Beta limits are 1–8 seats, 0–20 parcel units, departure 10 minutes–30 days ahead, and a window ending at most two hours after departure. Route content is server-owned; labels, coordinates, recurrence, and remaining capacity are never accepted.

Responses expose the `canonical_route_v1` mode, safe bilingual route summary, owner totals/remaining values, lifecycle timestamps, and optimistic revision. They exclude coordinates, provider/geometry data, internal audit/idempotency fields, and other drivers' availability.
