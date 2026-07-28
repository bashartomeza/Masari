# ADR-017: Global capacity before segment reuse

Status: accepted for M7C3C1

## Decision

Shared manifests use `canonical_global_capacity_v1`.

Passenger seats are summed across all passenger members. Parcel units are summed across all
merchant-order members. The two dimensions remain independent, and a mixed manifest may reserve
both. Formation requires both totals to fit the selected availability's remaining global
capacity.

The aggregate capacity is held once when the offer is created, confirmed without a second
decrement on acceptance, and restored exactly once on rejection, expiry, or system
invalidation. One manifest owns one reservation.

Capacity is considered occupied for the entire canonical route. Capacity is not reused after a
member's destination, and unused capacity on an offered or accepted availability cannot produce
a second Trip.

## Bounds

- maximum manifest members: 20
- maximum passenger requests: 20
- maximum merchant orders: 20
- maximum parcel units: 50
- maximum attempts per demand: 5
- default offer lifetime: 5 minutes
- default seed batch: 25
- maximum seed batch: 100

These are beta safety bounds, not permanent business rules.

## Deferred

Segment ledgers, seat or parcel reuse, route geometry, pricing, ETA, GPS, maps, realtime
dispatch, and multiple Trips per availability are explicitly deferred.

