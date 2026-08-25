# Task 7 CodeRabbit Fix Report

**Status:** `DONE_WITH_CONCERNS`

**Pinned starting point:** `972184c8cc6d348bb115e6029652c561565920ad`

**Fix commit:** `c12a0e1` (`fix(admin): address route management review feedback`)

The supplied CodeRabbit issues were checked against the pinned Card 6 worktree before any production change. All still-valid behavior defects were fixed through focused RED -> GREEN cycles. The concern is limited to the final CodeRabbit re-review: the authenticated CLI connected to the review service but exited with `Connection failed: WebSocket closed`, so there is no fresh post-fix CodeRabbit result.

## Finding disposition

### 1. Existing PR instruction

**Disposition:** Valid; fixed.

The human plan still instructed an executor to run `gh pr create`. It now verifies PR #30 with `gh pr view 30`, pushes `admin/route-management` normally, and explicitly says that the push updates existing PR #30 and that `gh pr create` must never be run.

This is human documentation, so no automated source-text test was added.

### 2 and 6. UTC datetime-local round trip

**Disposition:** Valid; issue 6 is the same root cause and was intentionally covered once.

`routeVersionDraftFrom` sliced a UTC ISO string without converting the instant to local wall-clock fields. `normalizeRouteVersionDraft` then parsed those fields as local time, shifting the saved instant outside UTC.

The model now offsets the instant by the timezone offset before creating the `datetime-local` value. Empty/null behavior remains unchanged, and normalization converts the local value back to UTC as before.

RED evidence:

```text
npm run test -w @masari/admin -- --run src/features/routes/routeManagementModel.test.ts
Test Files  1 failed (1)
Tests       2 failed | 15 passed (17)
Received 2026-08-25T03:00:00.000Z instead of 2026-08-25T06:00:00.000Z in Asia/Hebron;
forced Asia/Hebron input remained 06:00 instead of local 09:00.
```

GREEN evidence:

```text
Test Files  1 passed (1)
Tests       17 passed (17)
```

The regression loops through `UTC`, `Asia/Hebron`, and `America/New_York` with hand-derived local values and asserts that both activation fields normalize back to the original UTC instants.

### 3. StopEditor coordinate clearing and validation

**Disposition:** Valid; fixed.

The editor stored coordinates as numbers during input. `Number("")` changed a cleared coordinate to zero before submit. The editor now keeps raw coordinate strings while editing, parses only at submit, and rejects empty, non-finite, latitude outside `[-90, 90]`, and longitude outside `[-180, 180]` before `onSave`. Valid numeric zero remains valid and is submitted as `0`.

RED evidence:

```text
npm run test -w @masari/admin -- --run src/features/routes/StopEditor.test.tsx
Test Files  1 failed (1)
Tests       4 failed | 5 passed (9)
Cleared latitude rendered as "0"; non-finite and out-of-range cases reached onSave.
```

GREEN evidence:

```text
Test Files  1 passed (1)
Tests       9 passed (9)
```

### 4. Immutable stop key assertion

**Disposition:** Review premise not reproduced; test hardened without a production change.

React 19.2.7 in this repository serializes the property as `readOnly=""`, not lowercase `readonly`. The existing case-sensitive regex therefore passed in the current environment. To make the assertion semantic and independent of serialization casing, the test now parses the generated HTML and asserts both `stopKey.readOnly === true` and presence of the normalized `readonly` attribute. It also asserts that `service_region_key` has neither the read-only property nor attribute and is not disabled.

### 5. Scoped authoritative reload failures

**Disposition:** Valid; fixed.

The `saveStops` conflict reload and the success/conflict reload paths in `cloneVersion` and `versionAction` called `loadRoute` with page-wide error surfacing enabled. Conflict paths produced a duplicate global and scoped error; successful mutations followed by a failed reload produced only a global error and lost lifecycle-scoped feedback.

All nested reload calls now pass the existing third argument `false`. Successful clone/version lifecycle mutations explicitly dispatch `reloadFailed` to the lifecycle scope when their authoritative reload fails. Mutation methods, payloads, expected revisions/current pointers, and idempotency keys are unchanged.

RED evidence:

```text
npm run test -w @masari/admin -- --run src/features/routes/RouteManagement.test.tsx
Test Files  1 failed (1)
Tests       5 failed | 92 passed (97)
Stop-order and conflict paths rendered two notices; successful clone/publish reload failures had no scoped notice.
```

GREEN evidence:

```text
Test Files  1 passed (1)
Tests       97 passed (97)
```

Coverage includes stop-order conflict reload failure plus both successful-mutation and conflict reload failures for clone and publish flows. Tests also assert the unchanged clone/publish/stop-order mutation payloads.

## Documentation and QA

- Updated the existing-PR plan instruction; no new PR command remains.
- Updated `docs/qa/card-6-route-management.md` because behavior changed: UTC/local activation stability, coordinate rejection/zero preservation, and scoped reload-failure checks are now explicit.
- No UI copy or translation changes were required.

## Verification

Environment matched the repository contract: Node `v22.17.1`, npm `10.9.2`.

```text
npm run test -w @masari/admin -- --run src/features/routes
10 test files passed; 170 tests passed.

npm run validate:admin
Admin typecheck passed.
23 test files passed; 273 tests passed.
Admin production build passed (Vite 8.1.3, 66 modules transformed).

npm audit
found 0 vulnerabilities

npm run security:audit
Dependency audit policy passed: no moderate, high, or critical findings.

npm run security:scan
Tracked-file and high-confidence secret scan passed.

git diff --check
passed (line-ending conversion warnings only).
```

Dependency manifests and lockfiles are unchanged by this fix wave. Prisma schema/migrations are unchanged, and the repository still has exactly 21 migration directories. No backend, schema, migration, provider, map, mobile, real-data, or payload/mutation changes were made.

## CodeRabbit re-review concern

Native Windows installation is unsupported by CodeRabbit CLI 0.7.5, so the official installer was run in Ubuntu/WSL. Authentication succeeded in agent mode. The Windows linked-worktree Git pointer was supplied through explicit `GIT_DIR` and `GIT_WORK_TREE`; the CLI verified the exact starting HEAD and recognized branch `admin/route-management` against `production-readiness`.

The final review then failed with this exact recoverable error:

```json
{"type":"error","errorType":"connection","message":"Connection failed: WebSocket closed","recoverable":true,"details":{"cause":{"name":"TRPCWebSocketClosedError"},"name":"TRPCClientError"}}
```

Per the CodeRabbit review workflow, no manual review is represented as a CodeRabbit result. Retry the same authenticated review when the review service/WebSocket connection is available.

## Skipped or invalid items

- Issue 4's lowercase-serialization claim was invalid for the pinned React version, but the intended semantic assertion was still strengthened.
- Issue 6 was a duplicate of issue 2 and received no duplicate implementation; the multi-timezone test covers the root once.
- No other supplied finding was skipped.
