# M7D1B independent Palestine route review

Evidence date: 2026-08-07. Classification: `TEST FIXTURE DATA — NOT USER LOCATION DATA`.

Hosted providers remain `NOT_EXECUTED`. The keyless Valhalla review used the checksum-pinned Geofabrik extract, corrected PPU and Bab Al-Zawiya public fixtures, 12 expanded public routes and three explicit restriction controls. Full measurements are in [the Valhalla evidence](osm-valhalla-palestine-evidence.md).

Routing and geocoding remain separate. The later unchanged-fixture geocoder comparison found Pelias open-data-only at 25/60 and Photon at 45/60, both below the 95% gate. This does not alter `VALHALLA_ROUTING_CANDIDATE=CONDITIONAL`; it leaves `GEOCODING_RECOMMENDATION_CANDIDATE=NONE` and `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`.

## Corrected required routes

| Public fixture | Distance / duration | Geometry | Review |
|---|---|---|---|
| Hebron → Bethlehem | 28.163 km / 39.0 min | 679 points, continuous | PASS |
| corrected PPU → Bethlehem | 36.440 km / 44.9 min | 884 points, continuous | PASS |
| corrected Bab Al-Zawiya → Bethlehem | 28.786 km / 40.0 min | 712 points, continuous | PASS |
| corrected PPU → Bab Al-Zawiya → Bethlehem | 32.964 km / 49.2 min | 874 points, two ordered legs | PASS |

The earlier PPU/Bab measurements are invalid because their fixture coordinates were materially misplaced. The four rows above are rerun results, not reinterpretations of the old geometry.

## Expanded human review

The attributed [road-context plot](evidence/osm-valhalla-palestine-routes.png) overlays returned shapes on roads extracted from the same PBF. The 12 expanded routes cover intra-Hebron, Hebron–Bethlehem, Bethlehem local, Ramallah/Al-Bireh local, Nablus local, Jericho local, Jenin local, Tulkarm local, Qalqilya local, Ramallah–Nablus, Nablus–Jenin and Bethlehem–Ramallah. They follow the visible road network without straight-line jumps, malformed geometry, disconnected sections, suspicious reversals or unexplained extreme detours. Trace attributes show no pedestrian, unpaved or destination-only edge in these route samples.

Selected controls confirm observed handling of a mapped `no_left_turn`, reverse travel on a mapped one-way, and a pedestrian way with a `motor_vehicle=no` barrier. This does not establish every access rule. OSM/Valhalla cannot by itself determine real-time checkpoint state, nationality-specific access, regulatory permission, safety or operational delivery feasibility. Intercity and locally sensitive corridors therefore remain operationally `CONDITIONAL` even when geometry passes.

## Human-review rule

Every future route must independently confirm endpoint snap, waypoint order, continuous road-following geometry, finite values, plausible detour, no pedestrian shortcut, and available access/restriction evidence. A computed route is not automatic operational approval.

`OSM_PALESTINE_ROUTE_DATA=PASS_FOR_TESTED_FIXTURES_ONLY`. Do not generalize this to “Valhalla works across Palestine.” `VALHALLA_ROUTING_CANDIDATE=CONDITIONAL`; `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`.
