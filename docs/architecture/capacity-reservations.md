# Capacity reservation invariants

`CapacityReservation` is internal-only in M7C1. It records passenger, parcel, or combined held capacity against one canonical `DriverRoute` and immutable route version. A nullable unique match reference is reserved for M7C3.

A hold locks availability and its driver/profile/account state, then locks and revalidates the canonical route/version before conditionally decrementing both remaining counters in the same MySQL transaction. The update requires active verified supply, active account, future departure, exact route equality, and sufficient capacity. An optional Match must carry the same canonical route and availability; composite foreign keys enforce that equality. Failure creates no reservation and performs no partial decrement.

Confirm locks a held, unexpired reservation and does not decrement again. Release and expiry lock reservation then availability, restore both dimensions exactly once, and enforce totals as an upper bound. Availability edits lock the same row before deriving used capacity, so release/update races cannot lose accounting. Cancellation serializes with holds and rejects held/confirmed usage. Confirmed, released, and expired states are terminal. Expiry processes at most 100 ordered candidates per explicit invocation and isolates categorical per-row invariant failures so one corrupt row does not block later candidates; M7C1 adds no scheduler.

Every external service mutation binds idempotency to actor, operation, target scope, and normalized payload. The table stores only a SHA-256 fingerprint plus bounded request ID; raw keys and request bodies are absent. Audit metadata is limited to safe IDs, route version, categorical transition/reason, counts, schema marker, and request ID.
