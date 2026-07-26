# ADR-013: Canonical demand dispatch and sequential offers

- Status: accepted for M7C3A implementation
- Date: 2026-07-26

## Context

M7C1 records canonical driver availability, passenger requests, merchant orders, and capacity reservations. M7C2 exposes those entry flows without claiming that matching or assignment exists. M7C3A must connect one canonical demand to one driver at a time without using the coordinate-based legacy matcher, overbooking capacity, or enabling production dispatch.

Passenger and merchant demand have different payloads but share the same assignment lifecycle. A nullable offer link on each demand would not, by itself, provide durable attempt history, one-active-offer enforcement, or one-trip enforcement under concurrent workers.

## Decision

Introduce `CanonicalDemandDispatch` as the normalized assignment owner for exactly one canonical passenger request or one canonical merchant order. A dispatch moves through `pending`, `offered`, `assigned`, `cancelled`, or `unavailable`; retains an attempt counter and optimistic revision; links at most one active offer and one assigned trip; and never deletes offer history.

The existing `Match` table remains the offer record. Canonical offers are distinguished by non-null canonical version, exact route version, canonical operational mode, dispatch, expiry, scorer version, and capacity reservation. Database constraints and restrictive composite foreign keys enforce exact demand, route, availability, reservation, and mode ownership. Generated active/accepted dispatch keys provide database-enforced uniqueness under concurrency.

An internal, bounded runner is the only M7C3A dispatch trigger. It is callable in local, test, or demo environments only when canonical entry and matching gates are explicitly enabled. It has no public endpoint and no production scheduler. Each demand is processed in its own MySQL transaction; a dispatch row lock prevents concurrent claims, while one poisoned demand is quarantined without blocking the batch.

Candidate selection requires the exact current published route version, active canonical availability, an active verified driver account with the driver role, compatible departure time, and sufficient remaining capacity. The `canonical_route_match_v1` scorer uses departure fit (45%), capacity utilization fit (25%), normalized driver trust (20%), and recent accepted-assignment fairness (10%). Stable ties resolve by score descending, departure delta ascending, trust descending, recent assignment count ascending, and DriverRoute ID ascending. No coordinates, map geometry, fake ETA, demographics, or legacy corridor score participate.

Offer lifetime is five minutes, the runner batch defaults to 25 and is capped at 100, and a dispatch permits at most five sequential attempts. These are beta constants. Rejected and expired availability is excluded from later attempts for the same dispatch. Rejection and expiry only return the demand to `pending` after capacity is restored exactly once; a separate bounded run may then issue the next offer.

The common transactional lock order is:

1. `ServiceRoute`
2. `ServiceRouteVersion`
3. demand and `CanonicalDemandDispatch`
4. `Match`
5. `DriverRoute`
6. `CapacityReservation`
7. `Trip`

Operations may omit rows they do not need but never invert the relative order. MySQL deadlock or serialization failure rolls the full transaction back and becomes a safe retryable error.

## Consequences

- At most one active and one accepted offer can exist per canonical demand.
- Offer creation and its capacity decrement commit atomically.
- Acceptance confirms the existing hold without decrementing twice and creates at most one trip.
- Exact idempotency replay returns the existing logical result; changed payload conflicts.
- Passenger and merchant status reads can expose assignment state without exposing candidate drivers or scoring internals.
- Legacy matching, batching, comparison, tracking simulation, and demo metrics remain explicitly legacy-only.
- Staging and production reject canonical matching or trip creation at startup.

## Deferred work

- M7C3B owns Flutter offer and assignment screens.
- M7C3C owns combined passenger and merchant batching.
- M7D/M7E own maps, GPS, live location, realtime transport, pricing, and production operations.

## Rejected alternatives

- Reusing the legacy matcher would mix fixed-corridor coordinate scoring with canonical route authority.
- Multiple simultaneous driver offers would complicate capacity and acceptance authority.
- A public runner endpoint or production timer would expand the attack and operational surface.
- Application-only uniqueness would not survive concurrent workers or direct SQL.
