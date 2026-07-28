# ADR-016: Canonical shared-trip manifest

Status: accepted for M7C3C1

## Decision

Canonical shared matching uses an explicit, versioned `CanonicalTripManifest` and immutable
`CanonicalTripManifestMember` records. A manifest may contain passenger requests, merchant
orders, or both. One frozen manifest owns one aggregate offer, one aggregate capacity
reservation, and—after acceptance—one canonical shared Trip.

The shared versions are:

- `canonical_shared_trip_match_v1`
- `canonical_shared_trip_v1`
- `canonical_shared_trip_snapshot_v1`

Existing `canonical_route_match_v1`, `canonical_route_trip_v1`, and
`canonical_route_snapshot_v1` rows remain readable and are not rewritten. Legacy/demo rows
remain outside canonical dispatch.

Manifest membership is frozen when an offer is created. Member and manifest fingerprints use
canonical JSON plus SHA-256 and intentionally omit names, phones, parcel descriptions,
coordinates, payment data, and request bodies. Any pre-acceptance member drift invalidates the
entire manifest; partial acceptance is prohibited.

Database ownership joins bind every dispatch pointer to both the aggregate resource and a
manifest membership containing that exact dispatch. Generated non-null active keys close MySQL
nullable-unique gaps for active membership and one active manifest per availability.

## Consequences

- Multiple demands can share one offer and one Trip without weakening ownership.
- One one-off DriverRoute availability still creates at most one canonical Trip.
- Historical manifests and memberships remain immutable.
- Rejection and expiry release all members; later runs may regroup them independently.
- M7C3A single-demand records use dual-version compatibility rather than migration backfill.
- Flutter aggregate presentation remains M7C3C2 and is not advertised by capabilities.

