# ADR-010: Canonical operational route references

- Status: accepted for M7C1 review
- Date: 2026-07-22

## Context

M7B introduced immutable route versions and ordered stop memberships while the approved demo continued to use legacy labels, coordinates, and `corridor_key`. M7C1 needs an operational foundation that can reference canonical route content without changing the matcher, batching, trip creation, or mobile contracts.

## Decision

Add nullable canonical references and an explicit `canonical_route_v1` marker to passenger requests, merchant orders/parcels, matches, and trips. Legacy fields remain present and authoritative only for unmarked records. New canonical entry uses separate feature-gated endpoints, derives compatibility labels and coordinates from server-owned stops, and never accepts them from clients.

Passenger pickup/drop-off and merchant pickup/parcel destination references are protected by composite foreign keys to `(service_route_version_id, stop_id)` membership. Parcel route ownership is also tied to its owning order. Published/current/active-date eligibility and stop permission/order are checked by one shared service before writes.

`MULTI_ROUTE_ENTRY_ENABLED` is false by default and may be enabled only in local, test, or demo during M7C1. `MULTI_ROUTE_MATCHING_ENABLED` is false and startup rejects it in every environment. Canonical requests and orders are explicitly rejected by the legacy matching and batching paths.

## Consequences

- Existing rows and deterministic demo contracts remain valid with null canonical fields.
- Canonical operational records retain the exact immutable route version they referenced.
- Database constraints prevent cross-version stop substitution even if API validation is bypassed.
- Compatibility labels and coordinates remain populated because legacy columns are non-null, but are serialized as derived display data rather than authority.
- M7C3 must independently review and enable canonical matching and trip snapshot integration.

## Rejected alternatives

- Replacing legacy fields would break the frozen demo and mobile contracts.
- Trusting route labels, coordinates, or client-supplied stop order would bypass catalog governance.
- Automatically sending canonical demand into the legacy corridor matcher would make the feature gate unsafe.
