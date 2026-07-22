# M7C1 backend multi-route operations

M7C1 is a backend-only, review-gated foundation. Admin continues to own canonical routes. Drivers may create one-off availability and passengers/merchants may create canonical demand only when `MULTI_ROUTE_ENTRY_ENABLED=true` in local, test, or demo. Staging and production reject that setting. `MULTI_ROUTE_MATCHING_ENABLED=true` is rejected everywhere.

The deterministic corridor remains a separate compatibility path. Canonical records use `canonical_route_v1`, route/stop IDs, and server-derived display fields. They are not eligible for legacy batching or matching. Existing Flutter and admin operational screens are unchanged.

Operational eligibility requires an active stable route, its current published version, a valid active-date window, active member stops, allowed pickup/drop-off permissions, and downstream sequence. Geometry readiness is deliberately irrelevant until the separately approved map milestone.

Canonical creation uses a defined transactional eligibility point. The service locks the stable route and requested version in the same order as route administration, then revalidates current-version, lifecycle, active-date, boundary, membership, and permission state under `READ COMMITTED` before inserting. A concurrent publication or pause that commits first causes entry to fail; entry that owns the locks first commits against the then-eligible immutable version. Capacity holds perform the same route/version revalidation.

`DriverRoute` remains the availability entity. Canonical availability is one-off and owner-scoped. Remaining capacity is server-managed. `CapacityReservation` provides internal held/confirmed/released/expired transitions for future matching integration through row locks, conditional decrements, terminal-state replay, and bounded expiry processing.

Legacy driver, passenger, merchant, comparison, matching, batching, and trip-decision entry points explicitly exclude or reject canonical mode. Canonical availability cannot be changed through `/driver/routes`; canonical demand cannot be selected by the deterministic comparison; and canonical offers cannot enter legacy accept/reject.

M7C2 owns mobile route/stop selection. M7C3 owns production canonical batching, matching, offer acceptance, and trip snapshot integration. M7D/M7E own any map provider, GPS, location ingestion, or realtime transport.
