# Capacity reservation invariants

`CapacityReservation` is internal-only in M7C1. It records passenger, parcel, or combined held capacity against one canonical `DriverRoute` and immutable route version. A nullable unique match reference is reserved for M7C3.

A hold locks availability and conditionally decrements both remaining counters in the same MySQL transaction. The update requires active canonical availability, future departure, route equality, and sufficient capacity. Failure creates no reservation and performs no partial decrement.

Confirm locks a held, unexpired reservation and does not decrement again. Release and expiry lock reservation then availability, restore both dimensions exactly once, and enforce totals as an upper bound. Confirmed, released, and expired states are terminal. Expiry processes at most 100 ordered candidates per explicit invocation; M7C1 adds no scheduler.

Every external service mutation binds idempotency to actor, operation, target scope, and normalized payload. The table stores only a SHA-256 fingerprint plus bounded request ID; raw keys and request bodies are absent. Audit metadata is limited to safe IDs, route version, categorical transition/reason, counts, schema marker, and request ID.
