# M7C1 backend multi-route operations

M7C1 is a backend-only, review-gated foundation. Admin continues to own canonical routes. Drivers may create one-off availability and passengers/merchants may create canonical demand only when `MULTI_ROUTE_ENTRY_ENABLED=true` in local, test, or demo. Staging and production reject that setting. `MULTI_ROUTE_MATCHING_ENABLED=true` is rejected everywhere.

The deterministic corridor remains a separate compatibility path. Canonical records use `canonical_route_v1`, route/stop IDs, and server-derived display fields. They are not eligible for legacy batching or matching. Existing Flutter and admin operational screens are unchanged.

Operational eligibility requires an active stable route, its current published version, a valid active-date window, active member stops, allowed pickup/drop-off permissions, and downstream sequence. Geometry readiness is deliberately irrelevant until the separately approved map milestone.

`DriverRoute` remains the availability entity. Canonical availability is one-off and owner-scoped. Remaining capacity is server-managed. `CapacityReservation` provides internal held/confirmed/released/expired transitions for future matching integration through row locks, conditional decrements, terminal-state replay, and bounded expiry processing.

M7C2 owns mobile route/stop selection. M7C3 owns production canonical batching, matching, offer acceptance, and trip snapshot integration. M7D/M7E own any map provider, GPS, location ingestion, or realtime transport.
