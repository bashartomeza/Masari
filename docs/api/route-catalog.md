# Authenticated route catalog

M7B exposes public-ready contracts but requires the existing live authentication middleware.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/v1/routes?page=1&limit=25` | Active routes whose current version is published or paused |
| GET | `/api/v1/routes/:id` | One eligible current route/version |
| GET | `/api/v1/route-versions/:id/stops` | Ordered stops for an eligible current version |

Pagination is bounded to 50 rows. When route management is disabled, list returns `{ enabled: false, routes: [], total: 0 }`; detail and stops return `404`. Unauthenticated calls return `401`.

The catalog never exposes drafts, retired stable routes, non-current versions, audit/actor metadata, idempotency records, encoded geometry, geometry provider identifiers, or credentials. It includes bilingual names/descriptions, explicit lifecycle and geometry readiness, active dates, ordered permission flags, and six-decimal numeric coordinates.

These contracts are not consumed by Flutter in M7B. Passenger, merchant, driver, matching, batching, and trip entry remain on the legacy deterministic path until M7C.
