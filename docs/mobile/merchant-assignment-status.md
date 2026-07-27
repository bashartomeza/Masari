# Merchant canonical assignment status

The merchant Flutter flow lists and opens only canonical orders owned by the
authenticated merchant. It presents the route, pickup, downstream destinations,
parcel count, departure window, and server-owned assignment state.

The merchant sees no driver candidate identity before acceptance. Assigned
orders expose only the approved minimal canonical Trip/vehicle summary and
explicitly state that maps, ETA, and live tracking are unavailable.

M7C3B does not add combined passenger/merchant batching, parcel membership in a
shared Trip, rematching controls, or a standalone Parcel writer. Those data
model changes remain M7C3C work.

