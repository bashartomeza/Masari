# ADR-015: Mobile canonical offers and assignment status

- Status: accepted for M7C3B implementation
- Date: 2026-07-27

## Context

M7C3A provides local/test/demo-only canonical matching, driver-owned offers,
idempotent accept/reject, owner assignment status, and canonical Trip creation.
Flutter can create canonical availability and demand but cannot yet present
offers or assignment results. M7C3B must add that interface without moving
matching, capacity, expiry, Trip creation, or tracking authority to the client.

## Decision

The server publishes explicit safe capabilities for canonical matching, Trip
creation, driver offers, and owner assignment reads. Driver offer history uses
an opaque `(created_at, id)` keyset cursor. Flutter refreshes manually and once
on safe foreground resume; it does not poll or invoke the matcher.

Accept and reject extend the existing single actor-bound secure-operation slot.
The exact offer action is written to encrypted storage before send, retains one
idempotency key through authentication refresh and ambiguous response loss, and
is cleared only after the driver-owned offer detail reconciles the terminal
server state. Logout and terminal session changes remove credentials while
preserving unresolved encrypted work. Another actor cannot inspect or replay it.

Passenger and merchant screens read only their own canonical demand status.
Before acceptance they receive no candidate identity. After assignment they
show a minimum Trip and vehicle summary plus explicit wording that tracking,
ETA, maps, and Trip lifecycle actions are unavailable.

## Consequences

- One canonical offer still owns one demand and one one-off availability.
- One accepted offer still creates at most one canonical Trip.
- Flutter cannot create offers, mutate reservations, run matching, expire
  offers, or request reassignment.
- Production and staging remain fail closed.
- M7C3C retains aggregation and shared-Trip membership.
- M7D/M7E retain maps, GPS, location ingestion, and realtime transport.
- No schema, migration, or dependency change is required.

