# Masari functional recovery — plan and issue ledger

**Goal:** Fix confirmed document sections 1–6 on `fix/functional-recovery`, preserving team work and architecture. This file is the single recovery ledger.

**Architecture:** Restore the existing authenticated API boundaries and use current persistence/idempotency contracts. Test failures before fixes; use only disposable databases and synthetic fixtures. No new schema without owner approval.

**Spec:** User recovery request and `C:/Users/basha/Downloads/Pasted markdown.md`. The document's redesign, Figma, Voice/AI UI and module implementation prompts are excluded by the user's explicit scope. Modules 01–09 are assessment only.

**Baseline:** Fetched `origin/production-readiness` = `b372cc3cdc916ef03f1a64da3800786312cb76c4` on 2026-10-16. No commits since the supplied checkpoint. Recent work to trace: #40 matching monitoring, #42 authentication, #44 checkpoints, #46 trip lifecycle, #47 app/booking updates, #48 CI/legacy timestamp migration, #49 maps. Worktree: `.staging-data/functional-recovery`, created with the app then relocated into the authorized writable workspace. Git isolation confirmed; app reattachment is unavailable after relocation.

## Constraints and verification

- DESIGN CHANGES = NONE. No real masari access, production deployment, merge, rebase, force push, or old feature branch work.
- Provider credential must never be tested or reused. Rotation: awaiting owner confirmation. Inspection incident: the pre-existing literal appeared in tool output when a multiline value escaped the initial filter and again in a historical diff. It was not tested, reused, or copied into new files. No further raw historical credential source/diff output is permitted; rotation remains necessary.
- Preserve approved migration checksums. Review missing migration before adding its checksum.
- Keep one branch and focused commits; push and open one draft PR to production-readiness.
- Require API/Admin/Mobile/tooling checks, migrations, builds, artifact/secret scans, full/production audits, real MySQL integration, and four exact-head hosted checks.
- Stop for new schema, unresolved product policy, destructive operations, or external access requiring authorization.

## Execution and review focus

For each task: trace callers and root cause; write regression; observe RED; implement minimal fix; observe GREEN and package checks; ledger evidence and commit. Execute inline as authorized without per-task approval.

Race/failure cases: post-commit audit/response failure, lost successful responses, same actor-scoped identity on retry, changed payload/key conflict, concurrent duplicate submissions, trip-switching asynchronous results.

## 0. Security and CI blockers

- [x] Restore mobile checkpoint calls through the authenticated existing API and prevent embedded credential regressions.
- [x] Review missing `20261012165000_allow_legacy_offer_lifecycle_timestamps`; reconcile only that inventory entry.
- [x] Diagnose Backend/MySQL monitoring setup failure, Mobile formatting, Security migration inventory failure.
- [x] Record local baseline commands/results; hosted baseline: Admin success (38790113687), Backend failure (38790113696), Mobile failure (38790113737), Security failure (38790113769).
- Docker daemon unavailable locally. MySQL 8 installed; use a new isolated datadir/port with generated credentials, never the existing database.

## 1. Maps and Traffic Alerts

- [x] Trace checkpoint API/model/marker contracts and independent base-map loading. Canonical API currently emits coordinates/status while mobile expects partner fields and substitutes `(0,0)` for unknown IDs.
- [x] Regress invalid/missing coordinates, status aliases/severity, missing rows, canonical parsing, optional layer failure.
- [x] Restore compatible parsing/shared marker function and verify both screens.

Evidence: mobile boundary and synthetic secret detection tests failed before fixes and now pass (3/3 including artifact rejection, without printing values). API malformed-coordinate regression failed (booleans/arrays/whitespace were coerced to coordinates), now 7/7 checkpoint API tests pass. Qualified closure phrases remain recognized; negated `not open` is unknown. Mobile canonical parsing/marker tests failed, then 20 focused tests passed including base-map rendering while optional APIs remain pending. The initial repository fixture needed an explicit UTF-8 response header before it exercised Arabic data. Invalid snapshot rows are omitted individually; malformed envelopes still fail. Removed local `(0,0)` fallback and use authenticated canonical coordinates/names/status/fetched_at/stale. Passenger map now draws the shared markers; optional route loading no longer blocks its base map. Fresh independent security review found no remaining direct-session bypass; canonical-only congestion counts and driver details required follow-up. Passenger metric regression reproduced as expected (zero instead of one); driver caller corrections are included with section 2.

Provider boundary: retain existing server PostgREST service/config; partner API authentication/payload/grants are unverified and no external calls were made. Restoring the canonical contract does not establish a usable production feed. Credential rotation: **awaiting owner confirmation**.

## 2. Driver Trip Map and Route Tracking

- [x] Trace selected trip endpoints/API payload and async routing lifecycle.
- [x] Regress actual endpoints and trip-switch races, clear stale geometry, verify client/API path.

Implemented: GET `/trips/:id` already includes full request coordinates/parcel destinations; mobile summaries discarded them. Driver maps/ETA now consume selected request endpoints/labels. Removed unrelated locked-coordinate and straight-line fallbacks. Trip identity and endpoints key the routing futures, so late old results cannot repaint a newly selected trip. Route transport is injectable and bounded to 10 seconds; invalid geometry/metadata or missing positions yield an explicit unavailable state. Arbitrary Arabic origin names are preserved. A merchant trip with several distinct destinations cannot truthfully be reduced to one endpoint and is shown without an invented single route. The current source has no separate “Request Destinations” action; selected tripId is the existing entry path.

RED→GREEN evidence: wrong selected origin, invented road fallback, trip-switch/late-response races, missing supply/request coordinates, malformed routing metadata, Arabic label overwrite, scalar checkpoint badge/detail mismatch, and baseline 6px overflow. Final new+existing driver group: **43/43 passed**; changed-file analyzer clean. Minimum-height overflow correction and formatter/deprecation corrections preserve the existing visual design.

## 3A. Location names and coordinates

- [x] Trace location selection and payload; regress name/coordinate association through selection and request.

Not reproduced at this baseline: named locations are already stored/displayed independently from coordinates. Characterization through the actual picker and authenticated repository payload passes **5/5** tests, with distinct origin/destination labels and geographic pairs. No speculative reverse-geocoding or automatic relabeling was introduced. Section 2 independently fixes driver Arabic labels being replaced by an unrelated predefined origin.

## 3B. New trip/request persistence

- [x] Trace form → API validation → transaction → audit → response.
- [x] Regress actual persistence errors and concurrent double submission; confirm success only after committed outcome.

Confirmed: legacy request/driver-route creation committed a row before awaiting audit, so audit failure returned an error after saving. Passenger create now performs resource, audit and actor-scoped idempotency completion in one transaction. Exact key/payload retries replay only the authenticated actor's resource; conflicts do not mutate it. Completed booking identity survives claim TTL. Headerless existing clients keep compatibility with transactional creation. Driver create locks its existing profile row, reuses an exact active-route retry, and rejects conflicting operational routes; route+audit are atomic. Mobile submit now has a synchronous busy guard (two rapid events previously sent two requests) and save failures use their actual error category.

Verification: passenger 6 RED→GREEN; driver 3 RED→GREEN plus existing passenger/driver API group 14 passed; typecheck passed. Mobile actual-picker/form/client rapid-submit regression RED (`2` requests) → GREEN (`1`). Final disposable MySQL probe passed 55 assertions covering concurrency, audit rollback, response-loss replay and row-lock expiry; uncertain-outcome client retention is section 5.

## 4. Traditional booking validation

- [x] Trace date/departure/expiry semantics and regress server/client rejection plus upcoming control.

Confirmed: legacy create/search/run and accept did not consistently enforce preferred time, departure, offer expiry and route-window boundaries. Server guards now run on new creation/claims; completed idempotent replay precedes dynamic validation. Deliberately preserve undated active legacy driver supply. Actual mobile picker/past-time and expired-offer click/card regressions were RED, then GREEN (17 focused tests including existing assistant transport). Independent review identified time advancing during acceptance; final locking-current-read regressions and the real MySQL lock-wait probe now pass.

## 5. Uncertain booking recovery

- [x] Trace operation identity, actor scoping, payload conflicts and durable recovery.
- [x] Regress commit followed by audit/response loss and concurrent retries without duplicate records. Stop if a new schema is required.

Server completed canonical create claims retain identity beyond TTL and replay before dynamic time checks. Scope remains actor+operation for demand, and the established actor+routeVersion for canonical driver availability. Changed payloads under the same scope/key conflict; different actors cannot replay one another. Mobile legacy request and driver-route identity is securely stored before HTTP; lost-success-response/reopen tests recover with the original key/payload and one logical resource even after driver capacity/status changes. The three retained canonical create paths also replay their exact two-day-old operation after departure; other operations keep their existing expiry quarantine. No schema changes.

Compatibility limits: headerless older clients retain transactional creation but cannot obtain durable response-loss recovery without an operation key; the updated mobile clients supply one. Canonical driver key uniqueness remains actor+routeVersion, so changing route version changes the established server scope. Pending mobile retries cannot change their payload or route. A global per-actor key policy across distinct canonical route versions would require an explicit owner decision and compatibility plan; none was introduced during recovery.

Review-driven regressions/fixes: each completed call carries its own receipt; acknowledgement requires its exact actor/operation/key and serializes storage access by namespace. A delayed K1 completion or K1 validation cleanup cannot delete newer unresolved K2. Assistant booking context is stored atomically with the operation, stripped from HTTP, and restored into the existing verification card after restart. An unresolved booking blocks a new query from hiding recovery. Actor/generation guards prevent late search/selection/message results and queued history saves from publishing another account's captured data. Genuine RED evidence exists for those three account-switch cases, actual widget restart (after correcting an off-screen test tap), pending-query behavior, expired availability-window click, and three acknowledgement/cleanup races. Focused receipt group **89 passed**; final review group **29 passed**. Final independent read-only review found no further actionable issue. Full package validation remains the delivery gate.

## 6. Login errors

- [x] Trace initial/restored/attempt error state; regress stale errors, edits, genuine invalid credentials and network outcomes.

Confirmed: LoginScreen displayed any shared auth error immediately, including another screen's stale error, and kept the failed attempt visible after edits. Two new widget regressions reproduced both failures. Error display now belongs to the current login attempt; credential edits/new attempts clear it. Controller ownership survives router page recreation, so genuine invalid credentials/Google failures still display. Editing during an in-flight attempt suppresses its later obsolete error without cancelling a successful authentication. Session-ended messages remain separate. New and existing actual router/auth widget group: **35/35 passed**, including genuine invalid credentials, network errors, edit-during-response race, successful role navigation and session revocation.

## Modules 01–09 assessment

- [x] Map each requested function to existing code, missing behavior, and required product/security decisions. Do not implement algorithms, pricing, trust policies, autonomous dispatch, key pooling, or cryptographic claims. Simulation is not measured evidence.

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

## Verification and review evidence

- Missing migration reviewed before inventory reconciliation: `20261012165000_allow_legacy_offer_lifecycle_timestamps` changes legacy offer timestamp constraints only. Added its normalized SHA-256 `0a349a0bf2367407e41f89642ae8c407e266fbc17d67d0cf83159e97acedb0be`; every earlier inventory entry and migration SQL file is unchanged. The existing test verifies canonical lifecycle branches remain intact.
- Monitoring fixture roots: overlong generated phone; incomplete/unverified synthetic identity rejected by existing auth; nine batch states versus a six-state fixture; yesterday's preferred time let the actual expiry worker mutate asserted rows. Fixes update synthetic fixtures and independent expected counts only. Real fast-worker (100ms interval) RED→GREEN covers six HTTP endpoints, role/expired/revoked authorization, all nine states, pagination/exclusions, read-only snapshots, concurrency and 10,000 matches. Performance remained within the existing thresholds.
- Full real MySQL 8.0.46 rehearsal: 18 checks passed; fresh 27-migration deploy/repeat/status; previous 26 then upgrade to 27/repeat/status; existing CI workflow; reset matrix 49 assertions; online-state recovery 21; passenger-trip association 12; canonical single 98; shared 145; pre-final-lock-barrier booking probe 48. Redacted logs and evidence: `C:/Users/basha/AppData/Local/Temp/masari-functional-P8VhCp/`. Subsequent final-source runs below pass the added real row-lock deadline barrier.
- Final API production changes: 53 files / **670 tests passed**, typecheck and build passed. Three additional RED→GREEN tests force time to advance while request, match, or route claims wait; acceptance now performs a locking current read after all claims, samples the clock afterward, and rolls back expired request/offer/route claims before creating a trip.
- Admin: typecheck, all 28 files / **368 tests passed**, production-like build and artifact scan passed.
- Tooling: **59 tests passed, zero skipped** with `MASARI_TEST_ANDROID_TOOLS=true`; installed Android tools executed the compiled manifest fixtures. Separate compiled location/artifact policy group: **35 passed**.
- Full and production npm audits: zero findings at every severity; dependency policy passed. No lockfile changes or security-check suppression.
- Final mobile validation: generated localizations consistent; all 198 Dart files formatted with zero further changes; full analyzer reports no issues; **353 tests passed**. Final production-like test APK built (61.1MB, 89.8s) and artifact scan passed. SDK XML-version/Java source-target warnings and an unused Cupertino font warning were informational; no build failure was suppressed.
- Verification environment failures are retained separately from application regressions: sandboxed Admin attempts failed on temporary-cache `EPERM` renames (28 files, no tests), then the bounded two-worker run outside those restrictions passed all 368. A sandboxed unbounded API invocation produced loopback `EACCES` (401 failed/266 passed, three errors); the final bounded two-worker run outside the restriction passed all 670. Direct pinned-node invocation preserves worker arguments on this Windows shell.
- Independent local review resolved mutable driver capacity/status retry identity and both pre-query and database-lock expiry races. Final mobile review identified assistant restart reachability, acknowledgement key races, and late results after actor switching; regression fixes were re-reviewed with no additional actionable findings. CodeRabbit is excluded by the user.
- QA startup attempt `GRXQOV` failed monitoring performance at **10,032ms** against the unchanged 10,000ms limit (seven queries, major SELECTs 4,799.47ms and 5,185.10ms) while full mobile tests/APK compilation were concurrent. Fixture cleanup and isolated MySQL shutdown were verified. No assertion, threshold, integrity constraint or schema was weakened; isolated reruns below pass after builds finish.
- Isolated rerun `laYGRd` passed monitoring with the original limits (HTTP matches maximum 1,669ms), then failed the new barrier's setup observation. The probe started its short deadline before HTTP setup and relied on prepared-query text in `INNODB_TRX`. Corrected fixture: create the demand safely in the future, set its final 2.5-second deadline immediately before locking, and observe actual `performance_schema.data_lock_waits`/`data_locks` rows. Production transaction timeouts and rejection assertions are unchanged.
- Final isolated runtime **`xNGGUP`**: migrations/build/monitoring passed; real booking probe **55 assertions passed**. Observed passenger row lock wait before expiry; release after expiry; HTTP **409**; no trip; request/match/route claims rolled back. Barrier elapsed 2,646ms. Evidence: `C:/Users/basha/AppData/Local/Temp/masari-functional-xNGGUP/evidence.json` and redacted `legacy_booking_probe.log`. All test setup failures above remain recorded; none were waived.

## Disposable QA operation

The checked-in harness `scripts/local-functional-recovery-qa.mjs` creates a fresh MySQL datadir and random loopback port, refuses existing dotenv files, strips inherited app/provider configuration, generates synthetic credentials, and guards the QA API before importing application services. It never accepts an existing database URL/datadir. Windows runtime files are restricted to the current user and SYSTEM; passwords are neither committed nor printed. All clients bind to `127.0.0.1`.

Use pinned Node 22.17.1, set `FUNCTIONAL_QA_MYSQLD` to the installed MySQL 8 executable and `FUNCTIONAL_QA_FLUTTER_ROOT` to the installed Flutter 3.44.6 root, then run `node scripts/local-functional-recovery-qa.mjs --confirm-disposable --keep-running --monitoring-only --booking-probe`. Omit `--monitoring-only` for the complete fresh/upgrade/legacy/canonical rehearsal. Successful startup prints only URLs and the path to protected `qa-private.json`; read credentials locally from that file. Create the printed `STOP` file to shut down only this harness's processes and disposable MySQL instance. No production deployment is performed.

Final runnable QA evidence: runtime `hNfY1E` passed migrations, build, monitoring and all **55** booking assertions (observed row-lock wait, 2,644ms, HTTP 409 and rollback). API `http://127.0.0.1:52489`, Admin `http://127.0.0.1:52490`, Mobile `http://127.0.0.1:52491` returned HTTP 200 from the permitted loopback context. Browser QA verified real mobile login as the synthetic passenger, authenticated navigation and the persisted request detail with its original labels. The separate Admin browser rehearsal verified synthetic Admin login and the dashboard. Read role credentials locally from `C:/Users/basha/AppData/Local/Temp/masari-functional-hNfY1E/qa-private.json`; use existing demo account buttons on mobile. Keep that file private. Create sibling `STOP` to stop this runtime. These local services require the QA process to remain running; the checked-in harness recreates everything if it stops.

QA launcher diagnosis: direct Flutter snapshot invocation initially failed without its standard `--packages` configuration; the launcher now supplies it and retains redacted per-client exit diagnostics. A later apparent process disappearance was a restricted-tool visibility error: an elevated scoped check confirmed the original root-owned process and all three HTTP surfaces remained healthy. No application crash was established. A redundant rehearsal was interrupted; no production database was involved. Admin still requires `VITE_DEMO_ADMIN_PHONE` in its build configuration even though the login form takes an email; retain that existing contract and enter the protected file's Admin email manually. A premature attempt to substitute an unsupported email environment variable was corrected before delivery.

Additional browser-to-database verification: the actual traditional picker preserved edited Arabic origin/destination labels with the selected coordinates; submitting the future request navigated to a match result. A guarded direct read of this runtime's disposable database verified exactly one request with those labels/coordinates, that match's foreign key, one completed actor-scoped create identity and one audit event. The first probe incorrectly equated the match URL ID with the request ID; the corrected probe checks their actual foreign-key relationship. This was a probe assumption, not an application failure. Screenshot and redacted probe output are local QA evidence; no provider key or real user data was used.

## Delivery

- [x] Fresh independent review, final local required checks and disposable runnable QA with protected local login material.
Draft PR: [#50](https://github.com/bashartomeza/Masari/pull/50), base `production-readiness`. The [PR checks](https://github.com/bashartomeza/Masari/pull/50/checks), PR validation table and final task report carry the exact final head and immutable hosted run links. All four are required before delivery; no merge or release is authorized. The issue ledger's source commit precedes those hosted results by necessity.

User explicitly excluded CodeRabbit after it reported unauthenticated. No CodeRabbit repository review was run or content sent. Use local independent review and required automated gates; no external review sign-in is pending.
