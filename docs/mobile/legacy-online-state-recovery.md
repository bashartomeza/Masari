# Legacy driver online-state recovery

The legacy home control sends an explicit desired state rather than an inversion command. Before a new operation it refreshes authoritative legacy route state, synchronously fences rapid taps, creates one stable idempotency key, and writes an actor-bound unresolved bundle to secure storage before sending.

The operation type is `legacy_driver_online_state_v1`. Its normalized payload binds the desired boolean and expected legacy route scope. It shares the existing global version-2 secure-operation slot, so it cannot overwrite M7C2 creation, M7C3B individual-offer, or M7C3C2 shared-offer recovery.

Timeout, connection loss, 502, 503, malformed response, and authentication refresh retain the bundle and key. Logout or terminal authentication removes credentials but preserves unresolved work. Only the same reauthenticated actor can reconcile it. Another actor receives no payload or key. Secure-save failure sends no request. The bundle is deleted only after an owner-authoritative response confirms the target state.

Back, rotation, and process restoration reuse the same unresolved operation. A changed target or different operation is blocked until reconciliation. Expired, corrupt, or clock-anomalous state follows the existing quarantine/support path.
