# Masari functional recovery — plan and issue ledger

**Goal:** Fix confirmed document sections 1–6 on `fix/functional-recovery`, preserving team work and architecture. This file is the single recovery ledger.

**Architecture:** Restore the existing authenticated API boundaries and use current persistence/idempotency contracts. Test failures before fixes; use only disposable databases and synthetic fixtures. No new schema without owner approval.

**Spec:** User recovery request and `C:/Users/basha/Downloads/Pasted markdown.md`. The document's redesign, Figma, Voice/AI UI and module implementation prompts are excluded by the user's explicit scope. Modules 01–09 are assessment only.

**Baseline:** Fetched `origin/production-readiness` = `b372cc3cdc916ef03f1a64da3800786312cb76c4` on 2026-10-16. No commits since the supplied checkpoint. Recent work to trace: #40 matching monitoring, #42 authentication, #44 checkpoints, #46 trip lifecycle, #47 app/booking updates, #48 CI/legacy timestamp migration, #49 maps. Worktree: `.staging-data/functional-recovery`, created with the app then relocated into the authorized writable workspace. Git isolation confirmed; app reattachment is unavailable after relocation.

## Constraints and verification

- DESIGN CHANGES = NONE. No real masari access, production deployment, merge, rebase, force push, or old feature branch work.
- Provider credential must never be tested or reused. Rotation: awaiting owner confirmation. A multiline literal escaped the initial output filter; no further raw credential source output is permitted.
- Preserve approved migration checksums. Review missing migration before adding its checksum.
- Keep one branch and focused commits; push and open one draft PR to production-readiness.
- Require API/Admin/Mobile/tooling checks, migrations, builds, artifact/secret scans, full/production audits, real MySQL integration, and four exact-head hosted checks.
- Stop for new schema, unresolved product policy, destructive operations, or external access requiring authorization.

## Execution and review focus

For each task: trace callers and root cause; write regression; observe RED; implement minimal fix; observe GREEN and package checks; ledger evidence and commit. Execute inline as authorized without per-task approval.

Race/failure cases: post-commit audit/response failure, lost successful responses, same actor-scoped identity on retry, changed payload/key conflict, concurrent duplicate submissions, trip-switching asynchronous results.

## 0. Security and CI blockers

- [ ] Restore mobile checkpoint calls through the authenticated existing API and prevent embedded credential regressions.
- [ ] Review missing `20261012165000_allow_legacy_offer_lifecycle_timestamps`; reconcile only that inventory entry.
- [ ] Diagnose Backend/MySQL monitoring setup failure, Mobile formatting, Security migration inventory failure.
- [ ] Record local baseline commands/results; hosted baseline: Admin success (38790113687), Backend failure (38790113696), Mobile failure (38790113737), Security failure (38790113769).
- Docker daemon unavailable locally. MySQL 8 installed; use a new isolated datadir/port with generated credentials, never the existing database.

## 1. Maps and Traffic Alerts

- [ ] Trace checkpoint API/model/marker contracts and independent base-map loading. Canonical API currently emits coordinates/status while mobile expects partner fields and substitutes `(0,0)` for unknown IDs.
- [ ] Regress invalid/missing coordinates, status aliases/severity, missing rows, canonical parsing, optional layer failure.
- [ ] Restore compatible parsing/shared marker function and verify both screens.

Evidence: mobile boundary and synthetic secret detection tests failed before fixes and now pass (3/3 including artifact rejection, without printing values). API malformed-coordinate regression failed (booleans/arrays/whitespace were coerced to coordinates), now 7/7 checkpoint API tests pass. Qualified closure phrases remain recognized; negated `not open` is unknown. Mobile canonical parsing/marker tests failed, then 20 focused tests passed including base-map rendering while optional APIs remain pending. The initial repository fixture needed an explicit UTF-8 response header before it exercised Arabic data. Invalid snapshot rows are omitted individually; malformed envelopes still fail. Removed local `(0,0)` fallback and use authenticated canonical coordinates/names/status/fetched_at/stale. Passenger map now draws the shared markers; optional route loading no longer blocks its base map. Fresh independent security review found no remaining direct-session bypass; canonical-only congestion counts and driver details required follow-up. Passenger metric regression reproduced as expected (zero instead of one); driver caller corrections are included with section 2.

Provider boundary: retain existing server PostgREST service/config; partner API authentication/payload/grants are unverified and no external calls were made. Restoring the canonical contract does not establish a usable production feed. Credential rotation: **awaiting owner confirmation**.

## 2. Driver Trip Map and Route Tracking

- [ ] Trace selected trip endpoints/API payload and async routing lifecycle.
- [ ] Regress actual endpoints and trip-switch races, clear stale geometry, verify client/API path.

## 3A. Location names and coordinates

- [ ] Trace location selection and payload; regress name/coordinate association through selection and request.

## 3B. New trip/request persistence

- [ ] Trace form → API validation → transaction → audit → response.
- [ ] Regress actual persistence errors and concurrent double submission; confirm success only after committed outcome.

## 4. Traditional booking validation

- [ ] Trace date/departure/expiry semantics and regress server/client rejection plus upcoming control.

## 5. Uncertain booking recovery

- [ ] Trace operation identity, actor scoping, payload conflicts and durable recovery.
- [ ] Regress commit followed by audit/response loss and concurrent retries without duplicate records. Stop if a new schema is required.

## 6. Login errors

- [ ] Trace initial/restored/attempt error state; regress stale errors, edits, genuine invalid credentials and network outcomes.

## Modules 01–09 assessment

- [ ] Map each requested function to existing code, missing behavior, and required product/security decisions. Do not implement algorithms, pricing, trust policies, autonomous dispatch, key pooling, or cryptographic claims. Simulation is not measured evidence.

Read-only assessment: requested `apps/api/ai_services/*.py` paths are absent. Prototypes are in `apps/api/Daedalus/`, with no API/mobile invocation found. Existing Python tests import the absent `ai_services` package and can reach a live extractor when a provider key is present; they were not run with inherited credentials.

| Module | Existing code | Missing behavior / decision |
| --- | --- | --- |
| 01 | `Daedalus/pipeline.py`, `llm_extractor.py`, `schema.py`: dialect extraction, urgency/capacity/time, Pydantic validation | Requested function absent; actual schema has nine fields versus requested six. No token firewall, account/key pool, Overpass/Levenshtein correction. Current contract preserves spelling. No evidence for 98% accuracy. Correction semantics, provider ownership and quota-respecting usage need decisions. |
| 02 | `pipeline.py` threshold 0.5 and emergency review; `gateway.py` evaluate_gateway/raw structural-fault catch | Separate gateway uses 0.85 and different payload. Human queue is a returned string, not durable dispatch. Threshold/contract/queue ownership need agreement. |
| 03 | `module3_batching.py`: zone filter, 2D DP/state guard/greedy, utilization | No explicit >20-row/pending cutoff. Rounded units do not prove exact original-unit feasibility. Savings are explicitly simulation. Live TS `modules/batching.ts` is separate; DB lacks weight/volume capacities. Data-model and optimization decisions required. |
| 04 | `module4_deviation.py`: nearest-waypoint/Haversine detour, 5km threshold, empty-path approximation | No live dispatch wiring or dedicated tests; rounded threshold and malformed-coordinate handling need work. Route representation and accepted approximation need a decision. |
| 05 | `module5_simulator.py`: 12/8-minute formula, urgency decrement and floor | No concurrent dispatch or measured benchmark. 10 requests/5 drivers only in demo fixtures; ETA override bypasses scaling. Illustrative simulation cannot substantiate measured accuracy/savings. |
| 06 | `module6_agent.py`: model/tool binding, environment key iteration, keyword fallback | Returns tool names as `executed_backend_tools` without invoking them; no ReAct iteration, real services or auth/idempotent execution. LangChain dependencies absent. Bounded tools/permissions/audit/quotas require design; no autonomous implementation authorized. |
| 07 | `module7_trust.py`: weights, null defaults, clamping and tiers | No historical DB ingestion/persistence. Prototype null score 100 conflicts with DriverProfile default 70. Perfect-new-driver/suspension/ranking is product policy; provenance/windows absent. |
| 08 | `module8_fare.py`: three hardcoded fares, 0.50/minute premium, 30 cap | No authoritative tariff/telemetry/billing integration. “Official” comments are not authority; output marks fare simulation. Currency, source, dates and permitted surcharge need authoritative decisions. |
| 09 | `module9_geofence.py`: 100m Haversine, four signals, range checks, explicit mock token | Server Python is not phone-edge execution and does not block GPS transmission. No zero-knowledge proof/attestation, verified signal/replay lifecycle, or DB updates. Valid negative coordinates are not tampering. Existing trip coordinate events are simulated, not verified GPS streaming. Privacy/security architecture needs decisions. |

No module algorithms, tariffs, trust policies, quota pooling, autonomous execution, cryptographic claims, or Voice/AI UI were added.

## Baseline local results

- Locked npm install: success, 388 packages audited / zero vulnerabilities at install time; pinned Node 22.17.1 used for checks.
- Prisma generation: initial missing DATABASE_URL configuration failure; succeeded with a synthetic local placeholder (no DB connection).
- Typecheck: API/Admin success. API: 49 files, 629 tests passed before new regressions.
- Admin default workers: 9 files/37 tests passed, 19 Windows worker spawn EPERM errors; bounded-worker rerun: all 28 files/368 tests passed.
- Tooling initial inventory failure reproduced. After separately reviewed missing inventory entry: 57 passed + 1 existing compiled-APK-only skip at that point; final artifact build/scan still required.
- Mobile initial format check: 5 changed files (embedded-repository transport had already been removed), baseline hosted check listed 6. Analyzer: 6 findings (3 unused/deprecation items in passenger map and 3 in driver map); initial Flutter suite failed 4 tests from 6px quick-info RenderFlex overflow at driver_trip_screen.dart:609.
- MySQL 8.0.46: all 27 migrations deployed to a fresh isolated instance, repeated deployment and status passed. Monitoring setup reproduced failure at session user.create: synthetic phone exceeds current VARCHAR(32); no user-phone validator or schema is weakened.

## Delivery

- [ ] Fresh review, final required checks, exact-head hosted checks, disposable runnable QA with protected local login material, draft PR and report.
