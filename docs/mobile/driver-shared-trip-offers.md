# Driver shared-trip offers

M7C3C2 presents aggregate canonical offers through a separate, capability-gated Flutter flow. It does not merge shared and individual pagination streams.

## Entry and capability

- Driver navigation is visible only when `canonical_shared_driver_offers_available` is true.
- List, detail, accept, reject, recovery, foreground return, and authentication retry fetch a fresh safe capability before protected work.
- A missing or malformed shared capability fails closed. A disabled direct route shows a dedicated unavailable state and sends no mutation.
- The API also enforces active account, driver role, verified profile, route ownership, shared version, and the server-side mobile gate.

## Presentation

Cards and detail show only route/direction, departure and expiry, lifecycle state, composition, aggregate passenger-request/seat and merchant-order/parcel totals, and server-produced public stop events. Passenger-only, merchant-only, and mixed compositions are explicit typed values.

The driver decides the complete manifest. Acceptance assigns one shared Trip; rejection releases the complete group. The client cannot add/remove members, alter capacity, trigger matching, or mutate Trip lifecycle.

The screen uses manual refresh and one foreground-resume refresh. It does not poll in the background and provides no maps, GPS, movement, tracking, realtime, or ETA claims.

## Compatibility

Shared endpoints use `canonical_shared_trip_match_v1` and shared Trips use `canonical_shared_trip_v1`. Individual `canonical_route_match_v1` offers retain their existing routes, model, ordering, and cursor state. Unknown shared status/composition/version fails safely.
