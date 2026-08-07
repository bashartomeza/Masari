# M7D1B Palestine route review

Evidence date: 2026-08-07. Classification: `TEST FIXTURE DATA — NOT USER LOCATION DATA`.

No hosted-provider credential was securely available. Mapbox, Google, HERE, and Stadia are each `NOT_EXECUTED`; their route sample count remains zero. The separate keyless `OSM_SELF_HOSTED_VALHALLA` candidate was executed locally against the current Geofabrik Israel/Palestine extract.

## OSM/Valhalla human review

| Public fixture | Distance / duration | Geometry | Human classification |
|---|---|---|---|
| Hebron → Bethlehem / `الخليل → بيت لحم` | 28.163 km / 39.0 min | 679 points, continuous | PASS |
| PPU → Bethlehem / `جامعة بوليتكنك فلسطين → بيت لحم` | 23.271 km / 35.4 min | 599 points, continuous | PASS |
| Bab Al-Zawiya → Bethlehem / `باب الزاوية → بيت لحم` | 29.013 km / 40.5 min | 738 points, continuous | PASS |
| PPU → Bab Al-Zawiya → Bethlehem / `جامعة بوليتكنك فلسطين → باب الزاوية → بيت لحم` | 37.728 km / 59.6 min | 1,002 points, two ordered legs, continuous | PASS |

The attributed [local review plot](evidence/osm-valhalla-palestine-routes.png) visibly states `TEST FIXTURE DATA — NOT USER LOCATION DATA`. Origin, waypoint and destination order are sane; no disconnected segment, impossible jump, obvious terrain crossing or absurd unexplained detour is visible. The required PPU-to-Bab-to-Bethlehem backtrack is correctly longer. This plot has no basemap and cannot establish every one-way, access or turn-restriction detail; broader road review remains required. Full measurements and checksums are in [osm-valhalla-palestine-evidence.md](osm-valhalla-palestine-evidence.md).

## Approved future review set

The committed public fixture defines two canonical ordered routes and the public stops needed to review Hebron, Palestine Polytechnic University, Bab Al-Zawiya, and Bethlehem. A credentialed rerun may add other public corridor points, but never private residential or user locations.

For each successful provider route the evidence record must include provider, driving profile, ordered public fixture stop IDs, distance, duration, encoding, decoded point count, monotonic call latency, safe error category, normalized checksum, and returned attribution metadata. Provider responses must not be copied wholesale.

## Human checklist

The reviewer must independently confirm all of the following from normalized geometry:

- origin and destination are sane;
- every intermediate stop is sane and stop order is preserved;
- geometry follows a plausible road network without impossible jumps or inaccessible terrain;
- there is no absurd detour;
- distance and duration are plausible for the provider's stated conditions;
- observable behavior is recorded without geopolitical assumptions based on labels.

Shortest does not mean safest or correct. Each route receives `PASS`, `CONDITIONAL`, or `FAIL`; any provider with a failed mandatory route is ineligible. A local visual artifact may be produced only from approved public fixture geometry and must retain the fixture-data disclaimer above.

Current human Palestine review: hosted providers `NOT_EXECUTED`; OSM/Valhalla tested corridor `4/4 PASS`. Current recommendation: `OSM_VALHALLA_CANDIDATE=CONDITIONAL`; `NO_PROVIDER_APPROVED_YET`.
