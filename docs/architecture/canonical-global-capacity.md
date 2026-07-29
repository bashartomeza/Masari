# Canonical global capacity

Shared manifests use a conservative two-dimensional global capacity model:

- passenger capacity is the sum of all passenger seats;
- parcel capacity is the sum of all parcels in all merchant orders.

Both totals must fit the selected availability for the whole route. A mixed manifest creates one
`combined` reservation; passenger-only and merchant-only manifests create their corresponding
reservation type. Zero/zero holds are invalid.

The hold and availability decrement occur once during offer creation. Acceptance changes the
hold to confirmed without decrementing again. Rejection, expiry, or system invalidation restores
both dimensions exactly once. A manifest owns one reservation and one availability may own one
active manifest and one canonical Trip.

The beta bounds are 20 members, 20 passenger requests, 20 merchant orders, 50 parcel units, five
attempts per demand, a five-minute offer lifetime, 25 default seeds, and 100 maximum seeds.

Capacity is not reused after an intermediate stop. There is no segment ledger, route geometry,
or second Trip on unused capacity in M7C3C1.
