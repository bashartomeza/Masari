# M7D1B OSM + Valhalla Palestine routing evidence

Evidence date: 2026-08-07 (Asia/Hebron). Candidate: `OSM_SELF_HOSTED_VALHALLA`. Classification: `TEST FIXTURE DATA — NOT USER LOCATION DATA`. This is engineering evidence, not legal advice or a production-provider approval.

## Reproducible input and runtime

- Source: [Geofabrik Israel and Palestine extract](https://download.geofabrik.de/asia/israel-and-palestine.html), downloaded through the `latest` URL at `2026-08-07T18:41:45.5487477Z`.
- Resolved extract: `israel-and-palestine-260806.osm.pbf`; HTTP `Last-Modified: 2026-08-06T22:41:11Z`; size `119,354,376` bytes.
- Published MD5 matched: `a70807a665791211288db4ddc467aac2`. Independently calculated SHA-256: `36e45cb73d7fa584fbdf58836b615174122c32f22bf1871ec691161826af79aa`.
- Valhalla `3.8.3`, scripted container `ghcr.io/valhalla/valhalla-scripted@sha256:24ef7955899dececb94e26c6dfb89d64fabfae875f980432694b0261eb6c251b`, image creation timestamp `2026-07-25T00:47:50.705864672Z`. The release is the current upstream release reviewed for this run; the scripted wrapper supplies the reproducible build entrypoint.
- Configuration: automobile costing, eight build/service threads, admins and time zones enabled, tar extract enabled, elevation/transit/live traffic disabled, default OSM speed configuration enabled. HTTP was bound only to `127.0.0.1:18002`.

The graph build ran from `2026-08-07T18:42:05.155Z` to service readiness at `2026-08-07T18:46:27.123Z`: 262 seconds. It produced 82 tile files, 812,218 nodes and 2,185,488 directed edges. The tile directory was `196,254,720` bytes and its tar was `196,403,200` bytes. Peak sampled build memory was about 730 MiB; peak sampled CPU was about 79% of the Docker-reported host allocation. These samples are observations, not capacity sizing.

Safe warning categories were: 15 incomplete boundary members and 15 corresponding degenerate out-of-extract admin areas; 33 expected `admin_access` rows absent from this non-planet extract; five malformed OSM time ranges summarized by one warning; 44 possible duplicate level-1 edges; and expected absence of elevation, transit and live-traffic inputs. The builder completed successfully, validation completed, the tile extract loaded, and route requests succeeded. No warning was silently treated as route correctness proof.

## Route results

All calls used POST/JSON, automobile costing, public coordinates from `fixtures/palestine-route-bakeoff.json`, and Valhalla polyline6 geometry. The checksum is SHA-256 of the returned encoded leg shape(s). Arabic-equivalent descriptions are: `الخليل → بيت لحم`, `جامعة بوليتكنك فلسطين → بيت لحم`, `باب الزاوية → بيت لحم`, and `جامعة بوليتكنك فلسطين → باب الزاوية → بيت لحم`.

| Fixture | Result | Distance | Duration | Legs / maneuvers | Points | Max decoded segment | Endpoint snap offsets | Geometry SHA-256 | Review |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| `hebron-bethlehem` | success | 28.163 km | 2,342.147 s | 1 / 22 | 679 | 369.4 m | 51.0 m / 31.9 m | `8c10f4b1a3cd3d68b6540dc44a0cb1b6ae16a100dae7cc37c65e0c2d56c66684` | PASS |
| `ppu-bethlehem` | success | 23.271 km | 2,123.114 s | 1 / 25 | 599 | 369.4 m | 6.1 m / 31.9 m | `6b40a5571c89ceca2b91ca1277c06e346ffc0c5d256b00747ce6f40281fc4096` | PASS |
| `bab-al-zawiya-bethlehem` | success | 29.013 km | 2,430.487 s | 1 / 30 | 738 | 369.4 m | 9.6 m / 31.9 m | `96d69b990de801ce6edd556d745d2332d6066a20bd912db2525bd853491ebb1b` | PASS |
| `ppu-bab-al-zawiya-bethlehem` | success | 37.728 km | 3,576.072 s | 2 / 46 | 1,002 | 369.4 m | 6.1 m / 31.9 m | `5af3aa9457c9f68d571967bdb4bab996dab59d7d1a97c7fb02b03bc263435303` | PASS |

The combined [local geometry plot](evidence/osm-valhalla-palestine-routes.png) (SHA-256 `b4250f544429a65f39a06c74d5c2b70839597a3e3705adfc710e1548f34bf9af`) was reviewed at original resolution. Origins, waypoint, destination and deliberate waypoint order are visible. Geometry is continuous; it has no straight-line teleport, disconnected leg, terrain-crossing appearance or extreme unexplained detour. The two-leg PPU → Bab Al-Zawiya → Bethlehem route visibly travels south to the required waypoint before returning north, explaining its longer distance. Returned maneuvers reference plausible corridor roads in Arabic and numbered road references, including شارع القدس-الخليل and roads 35/60. The plot has no basemap, so it is supporting continuity evidence rather than an exhaustive lane, access, one-way or turn-restriction audit.

The tested central Hebron, PPU access, Bab Al-Zawiya access and Bethlehem central cases produced automobile routes without disconnected geometry, pedestrian-only shortcuts, pathological U-turns or obvious missing links. Classification: `OSM_PALESTINE_ROUTE_DATA=PASS_FOR_TESTED_CORRIDOR_ONLY`. This must not be generalized to every road or all of Palestine.

## Calculation latency and bounded concurrency

All timings use `performance.now()` and measure the local Valhalla calculation round trip, not Internet/provider-network latency. Cold sampling is 20 independent container restarts retaining the prebuilt graph, followed by one route request each: request p50 `96.305 ms`, p95 `121.952 ms`; restart-to-ready p50 `1,029.001 ms`, p95 `1,033.318 ms`. Warm sequential sampling is 100 calls (25 per fixture): p50 `8.440 ms`, p95 `11.291 ms`, maximum `14.583 ms`, zero errors.

At concurrency 20, identical Hebron → Bethlehem calls had p50/p95 `27.006/31.079 ms`; identical PPU → Bethlehem calls had `19.486/29.500 ms`. Twenty mixed approved-fixture calls had p50/p95 `21.961/28.062 ms`. All 60 concurrent calls succeeded. Service memory after the run was about 257 MiB. This bounded developer-machine result passes the `<2 s` calculation target but is not production capacity planning.

## Rights and attribution boundary

OpenStreetMap raw data is licensed under the ODbL. The local Valhalla graph is an OSM-derived database and must be operated under applicable ODbL attribution/share-alike obligations when publicly used. Individual route geometry is plausibly a Produced Work, but OSMF discussion of routing geometry shows that the classification is not sufficiently settled for Masari to infer unrestricted proprietary ownership. Therefore canonical route-geometry storage is `CONDITIONAL / LEGAL_REVIEW_REQUIRED`, not unrestricted.

Every evidence or future user-facing OSM-derived display must visibly credit `© OpenStreetMap contributors` and provide access to the ODbL/license information. See [OSM copyright](https://www.openstreetmap.org/copyright), the [OSMF Produced Work guideline](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline), and the recorded [OSMF routing discussion](https://osmfoundation.org/wiki/Licensing_Working_Group/Minutes/2024-06-10). The committed plot contains attribution. No final Flutter renderer is added.

## Result

Routing quality, local calculation latency, keyless operation and provider-neutral normalization are credible for this narrow corridor. Storage classification, production update/SRE design, renderer attribution, broader route coverage and independent approval remain open. `OSM_VALHALLA_CANDIDATE=CONDITIONAL`; `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`.
