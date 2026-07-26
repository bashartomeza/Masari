# M7C2 mobile multi-route navigation

M7C2 adds role-scoped canonical entry routes beside the unchanged deterministic demo flows:

- driver: `/driver/availabilities`, `/driver/availability/new`, and owner detail
- passenger: `/passenger/routes/request/new`
- merchant: `/merchant/routes/order/new`

The authenticated `GET /api/v1/capabilities` response is authoritative. Canonical navigation is visible only when both the route catalog and multi-route entry capabilities are true. Every direct screen repeats this guard. Loading and temporary failure never expose a selectable stale route, and a disabled result returns the user safely to the existing role dashboard.

The router's existing role prefix guard prevents cross-role access. Pending, suspended, disabled, revoked, wrong-role, and unauthenticated users cannot enter these screens because trusted session restoration and backend authorization remain unchanged. Production and staging reject canonical entry at startup, so their capability response keeps navigation hidden.

The existing fixed-corridor screens and routes are not renamed or replaced. M7C2 does not add matching, offers, assignments, trips, maps, GPS, location permissions, or realtime navigation.
