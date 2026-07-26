# ADR-014: Immutable canonical trip snapshots

- Status: accepted for M7C3A implementation
- Date: 2026-07-26

## Context

Canonical routes are immutable by version, but route status and the current version pointer can change after a driver accepts an offer. Trip history must remain understandable without consulting mutable catalog state or leaking personal, parcel, coordinate, or provider data.

## Decision

A canonical trip is created only from an accepted canonical offer and its confirmed capacity reservation, inside the same MySQL transaction. It references the exact route version, dispatch, offer, DriverRoute, and exactly one passenger request or merchant order. Database uniqueness permits at most one canonical trip per offer and per dispatch.

The trip stores a bounded `canonical_route_snapshot_v1` JSON document and SHA-256 checksum. The snapshot is built from freshly locked route data and serialized with recursively sorted object keys. Arrays retain semantic route order. The document contains only:

- snapshot schema version and canonical operational mode;
- route ID, key, direction, and bilingual route names;
- route-version ID, number, status, and publication metadata;
- origin and destination stop IDs with bilingual names;
- selected pickup and passenger drop-off or merchant parcel destinations;
- ordered relevant stop IDs, keys, bilingual names, and sequence numbers.

Merchant destination stops are deduplicated and ordered by route sequence. The snapshot excludes phone numbers, user names, parcel descriptions, coordinates, geometry, provider responses, notes, payments, tokens, and raw request or idempotency data. The same normalized input always yields the same bytes and checksum.

Acceptance revalidates the route is active, current, published, and within its activation window. If route, demand, availability, driver authority, or reservation is no longer eligible, no trip is created. The invalid offer is expired, its held capacity is restored in the same transaction, and the dispatch returns to a retryable state or becomes unavailable at the attempt limit.

Canonical trips reuse the existing status vocabulary but are excluded from legacy comparison, deterministic simulated tracking, and legacy trip mutation endpoints. M7C3A creates no `LocationEvent`.

## Consequences

- Historical route identity survives later route replacement, pause, or retirement.
- Snapshot checksums are deterministic and privacy-bounded.
- A response-loss replay returns the existing trip instead of creating another.
- Legacy demo metrics and tracking remain unchanged.

## Deferred work

Flutter assignment/trip presentation is M7C3B. Combined-demand snapshots are M7C3C. Geometry, maps, GPS, realtime location, and navigation are M7D/M7E.

## Rejected alternatives

- Reading live catalog data for historical trips would make history mutable.
- Storing the full route or request payload would retain unnecessary personal and location data.
- Hashing non-canonical JSON would make checksum stability runtime-dependent.
