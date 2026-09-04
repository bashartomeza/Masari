# M7D1B independent OSM + Valhalla Palestine routing evidence

Evidence date: 2026-08-07 (Asia/Hebron). Candidate: `OSM_SELF_HOSTED_VALHALLA`. Classification: `TEST FIXTURE DATA — NOT USER LOCATION DATA`. This is engineering evidence, not legal advice or production approval.

## Reproducible input and runtime

- Geofabrik `israel-and-palestine-260806.osm.pbf`, `119,354,376` bytes, SHA-256 `36e45cb73d7fa584fbdf58836b615174122c32f22bf1871ec691161826af79aa`.
- Valhalla `3.8.3`, `ghcr.io/valhalla/valhalla-scripted@sha256:24ef7955899dececb94e26c6dfb89d64fabfae875f980432694b0261eb6c251b`.
- Eight build/service threads; admins and time zones enabled; tar extract enabled; elevation, transit and live traffic disabled; localhost only.
- Independent build: about 261 seconds to readiness, 82 tile files, 812,218 nodes, 2,185,488 directed edges, `196,254,720` tile bytes and `196,403,200` tar bytes. The builder parsed 12,428 simple turn restrictions and validation completed.

Run [the service script](../../scripts/maps/m7d1b-services.ps1) with `-Action prepare`, `-Action valhalla-build`, and optionally `-Action valhalla-serve`. Run [the evidence harness](../../scripts/maps/m7d1b-live-evidence.mjs) with `--mode=route` or `--mode=performance`. The harness uses a five-second request timeout by default, monotonic timing, nearest-rank percentiles, explicit error accounting and committed public fixtures. The [renderer source](../../scripts/maps/render-m7d1b-routing.py) reads the same PBF and never calls an online tile service.

## Corrected fixture finding

The earlier evidence used two materially misplaced public fixtures:

- PPU `31.5782,35.0801` was about 7.9 km from the official Dahiat Al-Baladiyah campus. The corrected point `31.5073157,35.0908933` matches PPU Building C and the PPU-published coordinate `31°30′26.16378″ N, 35°5′27.40563″ E` within metres.
- Bab Al-Zawiya `31.5279,35.0938` was about 0.77 km west of the named square. The corrected public square is `31.5275134,35.1018593`.

Consequently the old PPU/Bab route measurements were invalid and are superseded. The corrected four-route run is:

| Route | Distance | Duration | Legs / maneuvers | Points | Max segment | Endpoint snap | Geometry SHA-256 | Geometry review |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Hebron → Bethlehem | 28.163 km | 2,342.147 s | 1 / 22 | 679 | 369.4 m | 51.0 / 31.9 m | `8c10f4b1a3cd3d68b6540dc44a0cb1b6ae16a100dae7cc37c65e0c2d56c66684` | PASS |
| corrected PPU → Bethlehem | 36.440 km | 2,695.820 s | 1 / 24 | 884 | 369.4 m | 27.8 / 31.9 m | `ae29ecebd578f1188e6bdb140e29fe477cfb7e880e8596aafe5d981cd48c866b` | PASS |
| corrected Bab Al-Zawiya → Bethlehem | 28.786 km | 2,400.186 s | 1 / 23 | 712 | 369.4 m | 7.1 / 31.9 m | `0d0013506bc4863ca9e24e9feec5ab754c1d53ddd0348741c4da7438291af151` | PASS |
| corrected PPU → Bab Al-Zawiya → Bethlehem | 32.964 km | 2,952.371 s | 2 / 34 | 874 | 369.4 m | 27.8 / 31.9 m | `7a080493f4e61b985672d0c00bafdc8d7adae413d124a57f5c697fe625eebe68` | PASS |

The multi-stop route passes within 7.1 m of the corrected Bab waypoint and preserves leg order. The direct PPU route is faster but longer than the via-Bab route because it prefers road 60 over slower central-Hebron streets; maneuvers and the road-context plot support that explanation.

## Expanded routing coverage

The committed [expanded public fixture](fixtures/palestine-expanded-public-evidence.json) covers eight local areas and three additional intercity samples. All 12 returned finite, continuous automobile routes whose decoded geometry followed roads in the exact PBF. Trace attributes showed zero pedestrian, unpaved, or destination-only edges in these samples.

| Route | Distance | Duration | Points | Structural geometry |
|---|---:|---:|---:|---|
| PPU → Bab Al-Zawiya | 4.178 km | 552.184 s | 163 | PASS |
| Hebron → Bethlehem | 28.163 km | 2,342.147 s | 679 | PASS |
| Bethlehem local | 1.725 km | 287.510 s | 81 | PASS |
| Ramallah → Al-Bireh local | 3.076 km | 502.587 s | 107 | PASS |
| Nablus local | 3.709 km | 569.032 s | 129 | PASS |
| Jericho local | 3.315 km | 504.856 s | 87 | PASS |
| Jenin local | 1.001 km | 120.521 s | 19 | PASS |
| Tulkarm local | 0.624 km | 141.680 s | 33 | PASS |
| Qalqilya local | 0.377 km | 79.364 s | 26 | PASS |
| Ramallah → Nablus | 54.287 km | 4,068.656 s | 1,277 | PASS / operational access CONDITIONAL |
| Nablus → Jenin | 42.780 km | 3,218.584 s | 1,099 | PASS / operational access CONDITIONAL |
| Bethlehem → Ramallah | 41.042 km | 3,156.125 s | 938 | PASS / operational access CONDITIONAL |

The attributed [road-context plot](evidence/osm-valhalla-palestine-routes.png), SHA-256 `db62ed20509b3f22c2cd75bacce193c8f64c93762f415e3dd3d1146c9fcee8c`, was reviewed at original resolution. It derives roads and routes from the exact PBF, shows no straight-line jump, disconnected leg, suspicious reversal or extreme unexplained detour, and visibly states the public-test-fixture and OSM attribution notices.

## Restriction controls

Three selected controls demonstrate observed tag handling, not universal regulatory correctness:

- OSM relation `13252221` (`no_left_turn`) makes a roughly 15 m prohibited direct movement route 5.585 km around the legal graph path.
- OSM way `337051667` (`oneway=yes`) makes a roughly 10 m reverse movement route 5.521 km around the permitted direction.
- OSM way `1457807736` (`highway=pedestrian`) with node `4973647884` (`motor_vehicle=no`) makes a roughly 64 m through movement route 0.879 km around it; trace attributes contain no pedestrian edge.

Valhalla cannot establish real-time checkpoint status, nationality-specific access, regulatory permission, road safety or practical delivery accessibility from basic OSM automobile costing. Every production corridor still needs local operational review.

## Local performance methodology

The independent harness used `performance.now()`, explicit 5,000 ms aborts, nearest-rank percentiles and complete error accounting. “Cold” means a restarted Valhalla process retaining graph files and OS cache; it is not machine-cold or disk-cold.

| Test | Samples | p50 | p95 | Maximum | Errors |
|---|---:|---:|---:|---:|---:|
| process-cold route | 20 | 61.728 ms | 66.984 ms | 71.843 ms | 0 |
| restart to ready | 20 | 8,139.535 ms | 10,039.013 ms | 10,263.986 ms | 0 |
| warm sequential | 100 | 8.298 ms | 14.627 ms | 16.349 ms | 0 |
| 20-way identical Hebron | 20 | 27.742 ms | 31.817 ms | 32.240 ms | 0 |
| 20-way identical corrected PPU | 20 | 19.493 ms | 25.309 ms | 25.541 ms | 0 |
| 20-way mixed | 20 | 17.969 ms | 25.110 ms | 25.305 ms | 0 |

The calculation p95 target `<2 s` passes locally. The prior ~1.03 s restart-to-ready value was not independently reproducible and is superseded. `VALHALLA_LOCAL_PERFORMANCE=CONDITIONAL` because this is bounded developer-machine evidence, not remote latency, HA, sustained load or production capacity planning.

## Decision

`ROUTING_ENGINE_CANDIDATE=OSM_VALHALLA_RECOMMENDATION_CANDIDATE`. Tested structural route quality and local latency pass; operations, real-world access, production TCO and canonical route-storage rights remain conditional or unresolved. `VALHALLA_ROUTING_CANDIDATE=CONDITIONAL`; `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`.
