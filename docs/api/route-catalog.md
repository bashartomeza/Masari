# Authenticated route catalog

`GET /api/v1/capabilities` requires a trusted active session and returns only
five safe booleans: canonical route catalog, canonical multi-route entry,
canonical matching, maps, and live tracking availability. It exposes no
environment names or configuration values. M7C2 uses it as the authoritative
mobile navigation gate.

M7B exposes public-ready contracts but requires the existing live authentication middleware.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/v1/routes?page=1&limit=25` | Active routes whose current version is published or paused |
| GET | `/api/v1/routes/:id` | One eligible current route/version |
| GET | `/api/v1/route-versions/:id/stops` | Ordered stops for an eligible current version |

Public stop summaries intentionally omit coordinates. M7C2 treats stop order
and permissions as textual selection authority, never as map geometry.

Pagination is bounded to 50 rows. When route management is disabled, list returns `{ enabled: false, routes: [], total: 0 }`; detail and stops return `404`. Unauthenticated calls return `401`.

The catalog never exposes drafts, retired stable routes, non-current versions, audit/actor metadata, idempotency records, encoded geometry, geometry provider identifiers, or credentials. It includes bilingual names/descriptions, the approved current lifecycle and geometry-readiness summary, active dates, ordered permission flags, and six-decimal numeric coordinates.

Public responses also omit route/stop creation and update timestamps, version publication/pause timestamps, internal membership IDs, origin/destination foreign-key IDs, the parent service-route foreign-key ID, and stop lifecycle/retirement metadata. Stable route, version, and stop IDs remain because clients need them for approved catalog navigation; sequence and permission flags remain because they are operational catalog content.

These contracts are not consumed by Flutter in M7B. Passenger, merchant, driver, matching, batching, and trip entry remain on the legacy deterministic path until M7C.
