# M7C2 secure state and response-loss recovery

Canonical create operations use one secure-storage bundle at `masari_canonical_operation_v1`. Version 1 stores only operation type, role scope, random idempotency key, normalized exact payload, deterministic change-detection fingerprint, creation time, and route-version ID. It expires after 24 hours. It is never stored in preferences or logs.

Before sending, the client synchronously fences duplicate taps and persists the bundle. Timeout, connection loss, HTTP 502/503, and `transaction_retry_required` retain it. A recreated screen restores only tentative selections and the exact payload; the current capability and route catalog must load again before retry. An identical retry reuses the same key. A changed normalized payload creates a new operation and key.

Success, idempotent replay success, validation failure, role/account failure, feature disablement, route rejection, and idempotency conflict clear the bundle. Explicit logout, logout-all, current-session revocation, and terminal session transition clear canonical state. Access-token expiry continues through the existing single-flight refresh coordinator, so its authenticated retry reuses the same request closure and idempotency header.

Merchant parcel payloads exist in secure storage only while an uncertain atomic request needs exact replay and are deleted immediately on an authoritative outcome. Raw keys, payloads, tokens, credentials, coordinates, and personal details are not printed.
