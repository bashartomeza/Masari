# Shared-offer secure recovery

Shared accept and reject reuse the existing version-2 actor-bound secure canonical operation slot.

Operation names are:

- `canonical_shared_offer_accept_v1`
- `canonical_shared_offer_reject_v1`

The stored payload is limited to route version ID, offer ID, shared match version, and the categorical rejection reason when applicable. The bundle is written to encrypted platform storage before any request. A secure-save failure sends nothing.

One unresolved slot provides mutual exclusion across canonical create, individual offer, and shared offer operations. Another actor, operation, offer, payload, or rejection reason cannot overwrite or replay it. Logout and terminal session changes clear credentials and private providers but preserve the unresolved encrypted bundle for same-account recovery.

The same idempotency key and payload are retained across an access-token refresh and response-loss replay. A fresh shared capability check runs before the post-refresh retry. Successful accept is acknowledged only after the same shared offer/version is accepted and includes its shared Trip. Successful reject is acknowledged only after the same offer/version is rejected, has no Trip, and retains the exact categorical reason.

Network, timeout, selected server failures, and malformed success data are ambiguous and retain the bundle. Capability loss sends no new mutation and also preserves ambiguity. Expired, future-clock-anomalous, corrupt, or actor-mismatched bundles remain blocked for safe support-assisted handling; values are never logged.
