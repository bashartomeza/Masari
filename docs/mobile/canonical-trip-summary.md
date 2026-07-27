# Canonical Trip mobile summary

M7C3B consumes an allowlisted, read-only Trip summary after a driver accepts an
offer:

- `id`
- `status`
- `route_version_id`
- `departure_at`
- `vehicle_type`
- `created_at`

The summary intentionally has no driver profile, phone, coordinates, route
snapshot internals, price, ETA, location, tracking controls, or Trip lifecycle
actions. A missing summary before acceptance is expected and is not inferred
client-side.

One accepted M7C3A offer still creates at most one canonical Trip for its
one-off availability. Flutter does not create or repair Trips.

