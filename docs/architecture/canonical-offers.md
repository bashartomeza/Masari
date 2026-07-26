# Canonical driver offers

`CanonicalDemandDispatch` owns exactly one passenger request or merchant order. It records `pending`, `offered`, `assigned`, `cancelled`, or `unavailable`, the active offer, assigned trip, attempt count, revision, and bounded failure quarantine.

The existing `Match` table is the immutable offer history. A canonical offer references one dispatch, exact route version, canonical DriverRoute, one passenger request or merchant order, one held `CapacityReservation`, scorer version, bounded explanation, offer/expiry timestamps, and attempt number.

Generated active and accepted dispatch keys plus unique indexes enforce one active and one accepted offer per demand. Restrictive composite foreign keys enforce route and operational-mode equality between demand, availability, reservation, offer, dispatch, and trip.

Offer creation locks and revalidates current state, decrements capacity conditionally, creates the hold and offer, links both, transitions dispatch to offered, and writes one safe audit event in one transaction. Passenger holds reserve only seats; merchant holds reserve only the exact parcel count.

Rejection and expiry are terminal. They restore held capacity once, clear the active dispatch link, and return the dispatch to pending unless the fifth attempt makes it unavailable. A later bounded runner call selects the next candidate and excludes previously rejected or expired DriverRoutes.

No personal names, phones, parcel descriptions, coordinates, reservation internals, raw idempotency keys, or request bodies appear in offer responses, audit metadata, or operational logs.
