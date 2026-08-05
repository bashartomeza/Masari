# Demo reset gate matrix

M7H1 makes reset-gate behavior a real-MySQL CI contract. The matrix runs against a disposable database whose name ends in `_ci`; it never targets staging, production, or a general runtime database.

The persistent cases cover all canonical entry/matching/Trip-creation combinations, shared backend disabled and enabled, malformed booleans, staging and production fail-closed configuration, repeated reset, pre-existing canonical rows, and pre-existing shared manifests/Trips. Assertions inspect final rows and counts rather than a helper predicate or mocked call.

The expected legacy result is always two legacy `DriverRoute` fixtures. Canonical availabilities remain zero unless entry, matching, and Trip creation are all enabled; the full dispatch configuration produces four total route rows and exactly two canonical availabilities. The shared backend gate does not depend on the mobile presentation gate and does not alter those fixture counts.

Restrictive-FK cleanup remains ordered through attempts, dispatch pointers, manifests, Trips, reservations, offers, members, and demands. Repeated reset must produce the same normalized fixture rows and counts. Invalid or production-like configuration must fail before database mutation.
