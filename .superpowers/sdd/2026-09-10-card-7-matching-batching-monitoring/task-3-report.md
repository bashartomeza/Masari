# Task 3 report — Admin HTTP boundary

## Outcome

Implemented the six read-only Admin monitoring GET endpoints at `/api/v1/admin/matching-batching`, with the monitoring service injected through the second `createApp` argument. The router uses session-backed authentication and Admin authorization for every endpoint in both production and demo configurations.

## RED evidence

Command:

`npm run test -w @masari/api -- src/tests/adminMatchingMonitoringApi.test.ts`

Initial result: 1 test file failed; 24 tests failed and 15 passed. Expected endpoint cases returned 404 because the monitoring router was not implemented. The 15 authorization/mutation cases passed through existing catch-all behavior and were retained to verify the mounted router still short-circuits service reads.

After the first production implementation, 33 tests passed and 6 failed. Those six failures identified a test-fixture bug: underscore splitting misread `session_admin_1_revoked` and `session_admin_1_expired`. The fixture was corrected to match the complete user ID and suffix. No production auth logic changed.

## GREEN evidence

- Focused HTTP suite: 1 file passed, 39 tests passed.
- Existing `environmentRoutes` and `httpSecurity` suites: 2 files passed, 20 tests passed.
- Full API suite: 38 files passed, 435 tests passed.
- API typecheck: `tsc -p tsconfig.json --noEmit`, exit 0.

All commands used the pinned Node 22.17.1 runtime and specified npm CLI.

## Self-review

- Exactly six routes are exposed and every handler is GET-only.
- Router-level `requireAuth` and `requireRole("admin")` protect directories, details, and parcel members.
- Directory and overview parsers reject unknown keys, including `source` and `cursor`; parcel paging rejects cursor through the strict page parser.
- Both detail routes require a strict empty query before reading the service, including array-valued and canonical-source keys.
- IDs and queries are parsed before delegation; normalized defaults and exact trimmed searches reach the service unchanged.
- Service `HttpError` responses retain existing 404 equivalence and sanitized 503 envelopes.
- POST, PATCH, and DELETE remain 404 and cause no monitoring service call.
- The same injected legacy-only service is mounted whether demo features are enabled or disabled.
- No database access, schema, algorithm, Trip lifecycle, mobile, or domain write code was added.

No concerns remain within Task 3 scope.
