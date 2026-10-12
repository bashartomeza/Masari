# ADR-019: Explicit idempotent legacy driver online state

Status: accepted for M7H1

## Decision

Expose a versioned authenticated legacy-driver command whose body states the desired online boolean and, when going offline, the expected current legacy route. Require an `Idempotency-Key`. Bind its digest to the actor, operation, normalized desired state, and legacy resource scope, and execute the idempotency claim, legacy-row lock, mutation, audit, and completion in one transaction.

The command is restricted to active driver accounts and legacy `DriverRoute` rows. Canonical/shared availability, capacity, reservations, offers, manifests, and Trips are outside its query and mutation predicates. Exact replay returns the committed logical result; the same key with a changed target conflicts. Concurrent exact replays converge on one transition and one audit event.

Flutter uses the existing actor-bound global secure-operation slot with operation `legacy_driver_online_state_v1`, write-before-send, stable-key authentication retry, ambiguous-result retention, authoritative reconciliation, and delete-after-confirmation.

## Consequences

Response loss cannot cause a second create or deactivate transition. A stale client cannot blindly invert server state. Assigned or on-Trip legacy routes fail safely instead of being deactivated. No Prisma schema, migration, dependency, canonical matching, shared matching, map, GPS, realtime, pricing, payment, or dispatch change is introduced.
