# Canonical offer operation recovery

Driver accept and reject reuse the version-2 actor-bound secure operation
bundle introduced in M7C2.

## Ordering and replay

1. Flutter creates a normalized payload containing `route_version_id`,
   `offer_id`, and the categorical rejection reason when applicable.
2. The bundle and idempotency key are written to encrypted storage before the
   request is sent. A secure-save failure sends no request.
3. Authentication refresh retries the original closure with the same key.
4. Network, timeout, 502, 503, and documented ambiguous idempotency outcomes
   retain the exact bundle.
5. Flutter reloads the driver-owned offer detail. It deletes the bundle only
   after that detail proves a terminal server state.

One unresolved bundle cannot be replaced by another operation, offer, actor, or
changed rejection reason. Logout, logout-all, revocation, suspension, and
terminal authentication changes clear credentials but preserve the bundle.
Only the same reauthenticated actor can reconcile it.

Unreadable, expired, or clock-anomalous bundles remain quarantined for safe
support handling. UI and logs use generic recovery language and never display
the key or stored payload.

