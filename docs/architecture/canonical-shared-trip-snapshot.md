# Canonical shared-trip snapshot

An accepted manifest creates one Trip with:

- `canonical_trip_version = canonical_shared_trip_v1`;
- `route_snapshot_schema_version = canonical_shared_trip_snapshot_v1`;
- the exact immutable route version and ordered stops;
- the selected availability and departure;
- aggregate passenger, merchant-order, and parcel counts;
- ordered privacy-bounded member entries.

Passenger entries contain only demand type, route stop references, and seat count. Merchant
entries contain only demand type, pickup stop, destination-stop multiset, and parcel count.
The snapshot excludes names, phones, parcel descriptions, recipient data, fingerprints,
idempotency keys, coordinates, prices, payment data, and tokens.

Keys are canonicalized before SHA-256 checksum generation. Snapshot size is bounded to 65,536
bytes. Acceptance persists the snapshot and checksum in the same transaction as offer,
reservation, manifest, dispatch, demand, parcel, availability, and Trip state changes. Existing
`canonical_route_snapshot_v1` Trips remain readable and unchanged.

The snapshot is provenance, not tracking. It creates no LocationEvent, map, GPS, ETA, or
realtime state.
