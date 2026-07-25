# M7C2 passenger canonical route request

The passenger selects one eligible current route version and sees its ordered stops. Pickup options require `passenger_pickup_allowed`. Drop-off options require `passenger_dropoff_allowed` and a strictly greater server sequence. Changing route or pickup clears dependent selections.

The request contains only route-version ID, approved pickup/drop-off IDs, a valid future departure window, and 1–8 passengers. There is no address, coordinate, custom route label, map, or automatic matching call. The route catalog must have loaded successfully in the current screen before submission.

After a successful or idempotently replayed response, the result states only that the request was recorded. It explicitly says matching is unavailable, no driver is assigned, and no trip was created. The exact secure replay bundle remains until the confirmed result is acknowledged. Owner history is not added in M7C2; an unresolved bundle that reaches the server idempotency boundary is quarantined for support-assisted resolution instead of being discarded or replaced.
