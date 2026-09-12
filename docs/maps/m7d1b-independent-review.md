# M7D1B independent review record

Review date: 2026-08-07. Reviewed base: `a7f1a2c643d449a59ab6c61f68f093182cc6b11e`. Original reviewed head: `89e275d97e07b5d38c2fd3f3d3c59fc3ea53c7f1`. Scope: architecture, routing/geocoding quality, security, privacy, ODbL boundaries, performance methodology and operations. This record is not legal advice.

## Findings before correction

Critical findings: none.

High findings:

1. PPU was about 7.9 km from the official Dahiat Al-Baladiyah campus and Bab Al-Zawiya was about 0.77 km west of the named square. Three of four committed route measurements were invalid, the 4/4 aggregate was invalid, and the correct English PPU geocode was falsely rejected.
2. Exact Docker commands, executable live harness, timeout/percentile/concurrency implementation, expanded datasets and plot source were not committed. The evidence was not independently reproducible from the branch.

Medium findings:

- The original coordinate-only plot established continuity and waypoint order but could not establish road-following or restriction behavior.
- Local latency passed, but it is process-cold localhost evidence. The earlier `~1.03 s` restart-to-ready result was not reproduced; independent p50/p95 was `8.140/10.039 s`.
- Corrected initial Nominatim quality was 5/8, not 4/8. Fair contextual formulation reached 7/8, still below 95%.
- Systematic canonical route geometry remains `UNRESOLVED / LEGAL_REVIEW_REQUIRED` under the conservative ODbL boundary.

Low/operational findings:

- The disposable Nominatim wrapper's original local trace was an operational hygiene incident. The value appeared in no Git history, tracked file, PR diff, Actions log, PR comment, committed document, screenshot or retained shared artifact. The corrected xtrace-redirection run had zero secret-bearing trace patterns.
- Nominatim's approximately 1.19 GB database used about 3.2 GB on disk with roughly 2.1 GB retained WAL, which is the more useful capacity observation.

## Independent execution

- PBF SHA-256 matched `36e45cb73d7fa584fbdf58836b615174122c32f22bf1871ec691161826af79aa`.
- Valhalla `3.8.3` digest matched `sha256:24ef7955899dececb94e26c6dfb89d64fabfae875f980432694b0261eb6c251b`.
- Graph: 82 tiles, 812,218 nodes, 2,185,488 directed edges, 196,254,720 tile bytes, about 261 seconds to service readiness.
- Corrected required route results: Hebron–Bethlehem `28.163 km / 2342.147 s`; PPU–Bethlehem `36.440 km / 2695.820 s`; Bab–Bethlehem `28.786 km / 2400.186 s`; PPU–Bab–Bethlehem `32.964 km / 2952.371 s`.
- Expanded routing: 12/12 finite continuous structural routes. Selected OSM controls demonstrated one-way, no-left-turn and pedestrian/barrier avoidance. Real-world access remains conditional.
- Performance: process-cold p50/p95 `61.728/66.984 ms`; warm `8.298/14.627 ms`; mixed 20-way `17.969/25.110 ms`; zero errors; explicit 5,000 ms timeout.
- Nominatim `5.3.2-0` digest matched `sha256:7923a8e67197fc6d4f4ecb7c0e8bbedffeddcfdf4519596fe946e46a28f5a9f8`; import/database checks passed in about 332 seconds.
- Expanded geocoding: Arabic 26/30 (`86.7%`), English 25/30 (`83.3%`), overall 51/60 (`85.0%`), all below 95%. Warm p50/p95 `14.858/18.885 ms`, zero errors.

## Separate component decisions

| Decision | Result | Basis |
|---|---|---|
| `ROUTING_ENGINE_CANDIDATE` | `OSM_VALHALLA_RECOMMENDATION_CANDIDATE` | corrected/expanded structural routes and local latency pass; access, legal and operations gates remain open |
| `GEOCODING_CANDIDATE` | `NO_GEOCODER_APPROVED_YET` | Nominatim quality fails both languages and overall |
| `MAP_RENDERER` | `UNSELECTED` | no renderer was added or approved |
| `CANONICAL_STORAGE_RIGHTS` | `UNRESOLVED / LEGAL_REVIEW_REQUIRED` | systematic route geometry accumulation is not approved |

## Routing gates

| Gate | Result |
|---|---|
| R1 provider-neutral compatibility | PASS |
| R2 tested Palestine road coverage | CONDITIONAL |
| R3 route validity | PASS |
| R4 route latency | PASS for local evidence |
| R5 route geometry integrity | PASS for tested fixtures |
| R6 operational feasibility | CONDITIONAL |
| R7 canonical-storage rights | UNRESOLVED |
| R8 attribution compatibility | CONDITIONAL |
| R9 privacy | PASS for localhost public fixtures; production CONDITIONAL |
| R10 production TCO/operations | INSUFFICIENT_EVIDENCE |

## Nominatim gates

| Gate | Result |
|---|---|
| N1 Arabic quality | FAIL |
| N2 English quality | FAIL |
| N3 overall correctness | FAIL |
| N4 latency | PASS for local evidence |
| N5 operational feasibility | CONDITIONAL / HIGH complexity |
| N6 storage rights | CONDITIONAL |
| N7 attribution | CONDITIONAL |
| N8 update/maintenance complexity | HIGH |
| N9 privacy | PASS for localhost public fixtures; production CONDITIONAL |
| N10 production TCO | INSUFFICIENT_EVIDENCE |

## Decision

- `M7D1B_OSM_EVIDENCE_QUALITY=BLOCKED` until this correction is exact-head CI green and the remaining legal/operational blockers are resolved.
- `VALHALLA_ROUTING_CANDIDATE=CONDITIONAL`.
- `NOMINATIM_GEOCODING_CANDIDATE=FAIL`.
- `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`.
- `PRODUCTION_ENABLEMENT=DISABLED`.
- Schema and 18 migrations remain unchanged; no migration 19 or persistence exists.
- M7D2 and M7E remain absent/not started. PR #18 must remain draft and unmerged.

The next evidence step is a separate geocoder comparison using the same committed 60-query acceptance set, plus legal review of canonical OSM-derived route storage and production access/SRE/TCO design. Routing, geocoding, rendering and storage decisions remain independent.
