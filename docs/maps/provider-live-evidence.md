# M7D1B provider live evidence

Evidence date: 2026-08-07 (Asia/Hebron). Milestone state: `ACTIVE / BLOCKED_ON_REMAINING_PROVIDER_EVIDENCE`. Provider selection: `NO_PROVIDER_APPROVED_YET`.

This report uses the corrected corridor fixture and the 30-location/60-query expanded public fixture under `docs/maps/fixtures/`. They contain public planning points and no user address, current location, passenger, merchant, phone-associated place, or driver data.

## Credential and execution result

Credential availability was checked categorically in the approved process environment, approved local non-example API environment files, and repository CI secret names. No value was printed or copied into an artifact.

| Provider | Local credential | CI credential name | Live classification | Geocodes | Arabic cases | Routes | Human review |
|---|---|---|---|---:|---:|---:|---|
| Mapbox | NOT_AVAILABLE | NOT_AVAILABLE | NOT_EXECUTED | 0 | 0 | 0 | NOT_EXECUTED |
| Google | NOT_AVAILABLE | NOT_AVAILABLE | NOT_EXECUTED | 0 | 0 | 0 | NOT_EXECUTED |
| HERE | NOT_AVAILABLE | NOT_AVAILABLE | NOT_EXECUTED | 0 | 0 | 0 | NOT_EXECUTED |
| Stadia | NOT_AVAILABLE | NOT_AVAILABLE | NOT_EXECUTED | 0 | 0 | 0 | NOT_EXECUTED |
| OSM self-hosted Valhalla + evaluated Nominatim | NOT_REQUIRED | NOT_REQUIRED | EXECUTED | 60 | 30 | 12 | 12 structural PASS; access CONDITIONAL |

The existing harness was invoked once for each unavailable hosted provider. Each returned the expected `credential_unavailable` safe category, null acceptance and latency fields, zero samples, and process exit 2. Exit 2 is the harness's deliberate `NOT_EXECUTED` outcome, not a provider failure. No credential was requested from the user. The separate keyless OSM/Valhalla run used a local digest-pinned service and current regional extract; it did not pretend that routing validates geocoding.

## Harness readiness evidence

The deterministic fake ran 10 sequential local operations: 8/8 fixture geocodes (4 Arabic and 4 English) and 2/2 fixture routes, with no failures. This establishes adapter-contract and fixture readiness only. Fake correctness and timings are not live provider quality, Palestine road validity, or service performance.

For a future credentialed run, the harness uses `performance.now()` monotonic timing; operations are sequential; warm/cold state is uncontrolled; failures remain in the sample count; retry is bounded to at most one; request timeout is 4 seconds. Geocode and routing p50/p95 are calculated separately. A small sample cannot establish credible p95 and must be reported as `INSUFFICIENT_EVIDENCE`.

Environment: local Windows 11 workstation and ordinary developer network. No controlled network shaping, cache reset, or provider-region pinning was used. No live calls occurred, so all provider geocode and route p50/p95 values are `NOT_EXECUTED / null`.

## Mandatory-gate rubric

No aggregate score can conceal a failed or missing mandatory gate.

| Gate | Requirement | Mapbox | Google | HERE | Stadia |
|---|---|---|---|---|---|
| G1 | Provider-neutral architecture compatibility | PASS | PASS | PASS | PASS |
| G2 | ≥95% acceptable Palestine geocoding | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED |
| G3 | Acceptable Arabic quality | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED |
| G4 | Human-approved Palestine route validity | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED |
| G5 | Credible routing p95 under 2 seconds | INSUFFICIENT_EVIDENCE | INSUFFICIENT_EVIDENCE | INSUFFICIENT_EVIDENCE | INSUFFICIENT_EVIDENCE |
| G6 | Compatible rights for every canonical field | UNRESOLVED | FAIL | FAIL | UNRESOLVED |
| G7 | Attribution/display compatibility | CONDITIONAL | CONDITIONAL | CONDITIONAL | CONDITIONAL |
| G8 | Privacy/DPA acceptability | CONDITIONAL | UNRESOLVED | UNRESOLVED | CONDITIONAL |
| G9 | Commercial feasibility | CONDITIONAL | CONDITIONAL | UNRESOLVED | CONDITIONAL |
| G10 | Operational quota/support suitability | CONDITIONAL | CONDITIONAL | UNRESOLVED | CONDITIONAL |

G1 is based on the already-approved M7D1 adapters and deterministic tests, not live evidence. Google fails G6 for the proposed shared canonical record because the published indefinite geocode exception is end-user-specific and logically isolated, while Routes content storage is restricted. HERE fails G6 under standard public terms because results cannot form Masari's multi-year canonical record without separate rights. Mapbox and Stadia remain unresolved because their geocode paths can be made conditional, but published route-result persistence rights do not approve every proposed field.

## OSM self-hosted candidate gates

| Gate | Result | Evidence |
|---|---|---|
| G1 provider-neutral compatibility | PASS | Local Valhalla responses normalized without production integration |
| G2 Palestine road coverage | CONDITIONAL | 12 expanded public routes passed structurally; real-world access/full coverage remain unproved |
| G3 route validity | PASS | corrected 4/4 required routes and 12/12 expanded structural routes |
| G4 route latency | PASS | process-cold p95 66.984 ms; warm p95 14.627 ms; mixed 20-way p95 25.110 ms |
| G5 Arabic geocoding | FAIL | 26/30 (`86.7%`) expanded strict result |
| G6 geocoding quality | FAIL | 51/60 (`85.0%`) overall, below 95% |
| G7 canonical-storage compatibility | UNRESOLVED | systematic canonical route geometry requires legal review |
| G8 attribution compatibility | CONDITIONAL | requirement documented; final renderer absent |
| G9 privacy | PASS | local-only fixture processing; no third-party provider |
| G10 operational complexity/cost | CONDITIONAL | feasible footprint; production SRE/TCO not approved |

`OSM_VALHALLA_CANDIDATE=CONDITIONAL`. Routing and geocoding remain separable; the weak Nominatim initial set does not invalidate the Valhalla route result.

## Missing evidence matrix

Each hosted provider still needs a securely supplied server credential through an approved local or CI mechanism, a repeated live run, human review of every returned geocode and route, Arabic assessment, credible cold/warm latency sampling, and a leak scan. The OSM routing candidate now has broader structural samples but still needs real-world access review, an alternative geocoder comparison, ODbL legal approval, renderer attribution design and production operational/TCO review. Separately, account-specific terms must resolve every conditional or unresolved storage, display, DPA, regional-processing, quota, support, and billing item.

Failure behavior remains covered by deterministic adapter tests for authorization, timeout, rate limit/quota, 5xx, no result, malformed response, bounded retry, circuit breaker, redirect rejection, and credential non-disclosure. Live quota exhaustion or abusive rate testing is prohibited.

The hosted providers produced no live geometry. The self-hosted candidate produced a safe attributed [expanded road-context plot](evidence/osm-valhalla-palestine-routes.png) from public fixture geometry and roads in the exact PBF; it is real local routing evidence, not fake-provider or production-renderer evidence.

## Regression and production-boundary evidence

The independently corrected branch passed local API 271, Admin 54, Flutter 241, and tooling 12, plus typecheck, builds, analysis, workflow validation, dependency policy, and security validation. The original evidence head's exact-head Linux CI applied all 18 migrations from empty, repeated deployment as a no-op, and passed M7C3C1 145, M7C3A 98, M7C1 79, M7H1 reset 45, M7H1 legacy online 21, M7H1 passenger association 12, and public onboarding 76, together with trusted sessions, onboarding foundation, and route lifecycle. The corrected head requires the same exact-head Linux CI gates before closure.

Demo preflight passed 22/22. Deterministic smoke remained score 0.9317, sequence 2, trips 1 versus 6, distance 21.53 versus 129.19, cost 43.06 versus 258.38, winner `masari`. Maps remained disabled during the demo and provider calls were zero.

The final repository and focused-content scans found no credential value or credential-bearing provider URL: `SECRET_LEAK_HITS=0`. Staging and production examples remain `ROUTE_MAPS_ENABLED="false"` and `ROUTE_PROVIDER="disabled"`. The Prisma schema and all 18 migrations are unchanged; there is no migration 19, provider persistence/cache, renderer, SDK, GPS/location permission, background location, realtime work, M7D2 work, or M7E work.
