# M7C2 merchant canonical route order

The merchant selects one eligible route version, one approved parcel-pickup stop, and a future departure window. Each parcel uses only the existing size (`S`, `M`, `L`), priority (`low`, `normal`, `high`), and an approved parcel drop-off with a strictly greater server stop sequence.

The screen submits one atomic order with 1–50 parcels. It prevents a 51st parcel, clears parcel destinations when the route or pickup changes, and never creates standalone parcels, imports data, accepts arbitrary addresses/coordinates, splits orders, or calls matching, batching, capacity, assignment, or trip endpoints.

After successful creation or exact replay, the result says only that the order was recorded. It explicitly says batching and matching are unavailable, no driver is assigned, and no delivery trip was created. The encrypted exact replay bundle remains until the confirmed result is acknowledged. Owner history is not added in M7C2; an unresolved bundle that reaches the server idempotency boundary is quarantined for support-assisted resolution instead of being discarded or replaced.
