# Canonical manifest expiry

Shared expiry is an internal bounded command; no public scheduler is enabled. Run the shared
command only in an approved local/test/demo environment with all dependency gates enabled.

The worker selects expired `canonical_shared_trip_match_v1` offers in stable
`(expires_at, id)` order. For each candidate it locks manifest, availability, offer,
reservation, and member dispatches in the canonical order. If still eligible, one transaction:

1. marks every offered attempt expired;
2. releases every active member and dispatch;
3. expires the aggregate hold;
4. restores both capacity dimensions exactly once;
5. marks offer and manifest terminal;
6. writes a categorical audit event.

Two workers may observe the same candidate, but only one terminal transition and restoration
survive. Poison candidates increment a bounded failure counter without blocking later
candidates. Generic reservation expiry and shared expiry cannot both restore the same hold.
The generic selector requires `manifest_id IS NULL`; the shared worker is the sole expiry owner
for a manifest reservation.

Driver rejection uses the same whole-manifest release semantics with the categorical rejection
reason. Member drift uses `system_invalidated`, dissolves the manifest, and is never reported as
a driver rejection. Historical manifest, membership, and attempt rows remain available for
reconciliation.
