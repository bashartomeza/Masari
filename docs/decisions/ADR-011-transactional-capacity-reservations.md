# ADR-011: Transactional capacity reservations

- Status: accepted for M7C1 review
- Date: 2026-07-22

## Context

Canonical driver availability has independent seat and parcel capacity. Future matching must not overbook either dimension when concurrent offers compete or when clients retry uncertain requests.

## Decision

Store immutable reservation history in `CapacityReservation`. A hold locks the `DriverRoute`, validates active canonical availability, performs one conditional decrement guarded by both remaining-capacity predicates, creates one held reservation, and records a bounded audit event in the same MySQL transaction.

Confirm changes only a non-expired held reservation to confirmed and never decrements again. Release and expiry lock the reservation and availability, restore capacity once without exceeding totals, and move to terminal released/expired states. Retries return the existing logical result. Expiry is an explicitly invoked bounded service in M7C1; no production scheduler is introduced.

All mutation idempotency is bound to actor, operation, target scope, and normalized payload digest. Only digests are persisted. The reservation-to-availability route version is protected by a composite foreign key, and database checks enforce nonnegative amounts with at least one positive dimension.

## Consequences

- Concurrent requests cannot make remaining capacity negative.
- Release/expiry cannot inflate remaining capacity or restore twice.
- Confirm-versus-release and confirm-versus-expiry serialize on row locks and yield one terminal outcome.
- Reservation history is retained and contains no request body, raw key, personal data, or free-form metadata.
- M7C3 may bind one reservation to one canonical match after separate review.

## Rejected alternatives

- Read-then-write counters are vulnerable to lost updates.
- Deleting released or expired rows would weaken retry and audit guarantees.
- A scheduled worker or public capacity endpoints are beyond M7C1.
