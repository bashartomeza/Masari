# Canonical shared-trip manifest

M7C3C1 adds an explicit aggregate boundary without changing the M7C3A single-demand model.
`CanonicalTripManifest` owns an ordered set of `CanonicalTripManifestMember` rows, one shared
MatchOffer, one held capacity reservation, and—only after acceptance—one shared canonical Trip.
A manifest may be passenger-only, merchant-only, mixed, or contain one member.

Membership is frozen when the offer is created. `member_sequence` records the deterministic
formation order. Each member binds one existing `CanonicalDemandDispatch` to exactly one
PassengerRequest or MerchantOrder, its immutable route version, capacity contribution, stop
summary, attempt number, and demand fingerprint. Active generated keys prevent one dispatch
from belonging to two live manifests. Composite foreign keys bind dispatch pointers to a
membership containing that same dispatch.

The lifecycle is:

`building -> offered -> accepted`

or:

`building/offered -> rejected | expired | dissolved`

Acceptance is all-or-nothing. One transaction locks the route/version, availability, offer,
reservation, manifest, ordered dispatches, and underlying demands; revalidates every member;
confirms the existing hold; creates one Trip; and assigns every dispatch. Drift dissolves the
whole manifest and creates no partial Trip. Rejection and expiry release all active members so a
later run may regroup them while retaining immutable historical manifests and attempts.

Existing `canonical_route_match_v1` and `canonical_route_trip_v1` rows are not backfilled or
reinterpreted. M7C3C1 does not add Flutter aggregate presentation, maps, GPS, realtime, pricing,
or production dispatch.
