# Canonical passenger route requests

`POST /api/v1/passenger/route-requests` is an explicit M7C1 contract. It requires a live active passenger session, local/test/demo `MULTI_ROUTE_ENTRY_ENABLED=true`, and `Idempotency-Key`.

The strict body is:

```json
{
  "route_version_id": "...",
  "pickup_stop_id": "...",
  "dropoff_stop_id": "...",
  "requested_departure_from": "2026-07-23T08:00:00.000Z",
  "requested_departure_until": "2026-07-23T09:00:00.000Z",
  "passenger_count": 1
}
```

The current published route version must be active; both stops must be active members, permissions must allow passenger pickup/drop-off, and pickup must precede drop-off. Passenger count is 1–8. Departure starts 10 minutes–30 days ahead and the window is positive and at most four hours. Coordinates, labels, sequence numbers, actor IDs, and mixed legacy fields are rejected.

The response uses `mode: canonical_route_v1` and explicitly reports matching disabled in M7C1. The created request is never passed to the legacy matcher.
