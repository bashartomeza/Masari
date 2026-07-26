# ADR-012: Mobile canonical route entry

- Status: accepted for M7C2 implementation
- Date: 2026-07-25

## Context

M7B provides an authenticated published-route catalog and M7C1 provides local/test/demo-only canonical driver availability, passenger request, and merchant order writes. Flutter still exposes only the deterministic legacy corridor. M7C2 must add mobile data-entry and lifecycle screens without enabling canonical matching, capacity mutation, trips, maps, GPS, realtime, or production entry.

Catalog publication and canonical operational entry are independent backend gates. A local UI build flag is not authoritative, and a stale cached route must never authorize a submission. Uncertain writes also need exact replay across process death without placing raw idempotency keys or merchant payloads in ordinary preferences.

## Decision

Add one authenticated, allowlisted capability read that reports only whether the published catalog and canonical entry are available. Matching, maps, and live tracking remain explicitly unavailable. The server environment remains private, staging/production continue to reject canonical entry, and a disabled canonical route returns safely before resource disclosure.

Flutter adds a separate canonical module alongside—not inside—the existing passenger, driver, and merchant legacy repositories. It uses strict typed catalog and operational response parsing, revalidates capability and the selected current route before submission, derives stop choices only from ordered server permissions, and never treats route data as geometry.

Each logical create operation owns one secure in-flight bundle containing the operation type, role scope, authenticated actor ID, raw idempotency key, normalized exact payload, fingerprint, creation time, and safe route identifier. The bundle is written through `flutter_secure_storage` before sending, retained for ambiguous outcomes and across authentication termination, reused unchanged after response loss or process death only by the same actor, and cleared after confirmed result reconciliation/acknowledgement or a definitively uncommitted terminal failure. A changed payload or different operation cannot replace an unresolved bundle. Expired, clock-anomalous, or unreadable bundles are quarantined for support-assisted resolution rather than silently deleted. Lifecycle actions use optimistic revisions and synchronous busy fencing; they do not call capacity services.

Canonical navigation is available only to the authenticated matching role after a fresh enabled capability result. Disabled, stale, revoked, suspended, role-changed, or terminal-session state clears canonical providers and safely returns to the role dashboard. The existing fixed-corridor demo UI and contracts remain unchanged.

## Consequences

- Driver mobile users can manage one-off canonical availability without editing route content.
- Passenger and merchant users can record normalized route/stop demand with truthful matching-disabled results.
- Exact response-loss replay cannot create a second logical operation, and an unresolved operation blocks replacement with a new payload or actor.
- Production-like builds cannot enable canonical entry locally.
- No schema or migration change is required.
- M7C3 retains responsibility for canonical matching, batching, offers, capacity holds, acceptance, trips, and normalized parent/child Parcel mode enforcement before any standalone Parcel writer.
- M7D retains responsibility for map providers, geometry UI, GPS, location ingestion, and realtime transport.

## Rejected alternatives

- Reusing the legacy corridor repositories would mix coordinate-based and canonical authority.
- Trusting a compile-time mobile switch would permit stale or unauthorized entry.
- Persisting raw operation data in shared preferences would weaken the secure-storage boundary.
- Adding owner history endpoints is unnecessary for exact replay and would expand backend scope.
- Displaying a fake route line or map placeholder would imply geometry that M7C2 does not provide.
