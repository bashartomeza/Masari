# ADR-018: Mobile shared-trip presentation

- Status: accepted for M7C3C2 implementation
- Date: 2026-08-05

## Context

M7C3C1 provides local/test/demo-only canonical shared matching, whole-manifest
driver decisions, and one shared Trip. It intentionally does not advertise a
Flutter capability. M7C3C2 must present that existing state without moving
matching, capacity, manifest, expiry, assignment, or Trip authority to the
client.

## Decision

Shared mobile presentation has a separate, false-by-default capability. It
requires canonical entry, matching, Trip creation, and shared matching, and it
is rejected in staging and production. Shared driver endpoints are separate
from the M7C3B single-demand endpoints and use their own opaque
`(created_at, id)` cursor.

Flutter discriminates `canonical_shared_trip_match_v1` and
`canonical_shared_trip_v1` explicitly. Driver screens show aggregate counts
and server-built public stop events only. Passenger and merchant assignment
screens remain owner-only and receive only a neutral shared-Trip marker after
assignment; they never receive aggregate or co-member data.

Shared accept and reject extend the existing actor-bound, encrypted, global
one-operation slot. The exact operation is persisted before send, retains one
idempotency key through authentication refresh and ambiguous response loss,
and is deleted only after an authoritative terminal offer is reconciled.
Logout and terminal session changes preserve unresolved encrypted work for
same-account recovery.

Expiry display uses a server-time offset. Refresh is manual, pull-to-refresh,
or one bounded foreground-resume read. The client adds no polling, push,
realtime transport, map, GPS, ETA, tracking, or Trip lifecycle mutation.

## Consequences

- Individual and shared offer cursors remain independent.
- Accept and reject always apply to the complete manifest.
- Conservative whole-route capacity wording is explicit; segment reuse is not
  implied or enabled.
- Unknown offer, Trip, status, composition, direction, and vehicle values fail
  closed with localized safe wording and no mutation controls.
- No schema, migration, matching, reservation, expiry, or Trip-creation change
  is required.
- Production shared-trip presentation remains disabled.
- Maps/GPS remain M7D and realtime remains M7E.
