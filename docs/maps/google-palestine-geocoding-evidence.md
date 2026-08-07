# Google Palestine geocoding evidence

Evidence date: 2026-08-08. Classification: `TEST FIXTURE DATA — NOT USER LOCATION DATA`. This evidence used the no-cost Maps Demo Key for bounded prototype evaluation only; it is not a production credential or production approval.

## Method and safety boundary

The official Google Geocoding API v4 address endpoint was called server-side with `X-Goog-Api-Key` and an explicit `X-Goog-FieldMask`. The key was never placed in a URL. Each unchanged committed fixture used its Arabic or English query, matching `languageCode`, `regionCode=PS`, the same Palestine rectangular location bias, normal provider ranking, and top-result-only scoring. The 60 sequential calls were the only geocoding calls. Google documents v4 as server-to-server, supports header authentication and field masks, and describes the rectangular bias as preferential rather than restrictive ([v4 address geocoding](https://developers.google.com/maps/documentation/geocoding/geocoding)).

Only normalized evidence was retained: fixture ID, language, request success, returned label, expected area match, acceptance, candidate rank, failure category, and monotonic latency. No raw response, request header, credential-bearing URL, place ID, Google coordinate, or unrelated metadata was retained. The complete safe result set is [google-palestine-geocoding-results.json](evidence/google-palestine-geocoding-results.json), with the scoring-only review overrides in [google-palestine-geocoding-adjudication.json](evidence/google-palestine-geocoding-adjudication.json).

## Quality result

All 60 requests succeeded at the API layer. Functional review did not treat transport success, an in-area coordinate, or a generic provider type as sufficient. A top result had to resolve the intended public fixture rather than only a city, street, plus code, numeric label, blank label, or wrong campus.

| Gate | Accepted | Rate | Target | Result |
|---|---:|---:|---:|---|
| Arabic | 11/30 | 36.7% | ≥95% | FAIL |
| English | 10/30 | 33.3% | ≥95% | FAIL |
| Overall | 21/60 | 35.0% | ≥95% | FAIL |

The nine bilingual city concepts were reviewed explicitly. Hebron, Bethlehem, Ramallah, Al-Bireh, Nablus, Jericho, Jenin, and Qalqilya resolved acceptably in both languages; Tulkarm returned the requested city label but its result location did not match the reviewed fixture area in either language. Among the highlighted public places, the Arabic PPU result and both Hebron University results resolved the intended campus, and both Al-Manara labels resolved the intended square. The An-Najah queries resolved `Old Campus Street 7` rather than the fixture's new-campus identity. Bab Al-Zawiya returned only Hebron/city-level labels. Other failed public-place rows are recorded individually without political interpretation in the normalized result file.

Failure totals are `AMBIGUOUS_RESULT=4`, `WRONG_AREA=4`, `WRONG_CAMPUS=10`, and `WRONG_LANDMARK=21`. There were no `NO_RESULT`, request, Arabic-script, English-alias, or transliteration transport failures; the quality failure was predominantly entity resolution.

## Latency

The first useful response took `698.709 ms`. Across 60 attempts and 60 successful API responses, monotonic latency was `111.201 ms` p50 and `128.934 ms` p95. This is a bounded developer-network observation, not a load test, SLA, production-region benchmark, or direct comparison with localhost Valhalla.

## Optional route evidence

After geocoding completed, four official Routes API v2 `ComputeRoutes` calls used the corrected independently reviewed public coordinates, `DRIVE`, `TRAFFIC_UNAWARE`, `X-Goog-Api-Key`, and the minimal distance/duration/leg field mask. All four HTTP requests succeeded, but all four responses contained no route object: Hebron → Bethlehem, PPU → Bethlehem, Bab Al-Zawiya → Bethlehem, and PPU → Bab Al-Zawiya → Bethlehem. Route availability is therefore `0/4`; distance, duration, and structural plausibility are unavailable/failed. No polyline or Google route geometry was requested or retained. Safe details are in [google-palestine-route-results.json](evidence/google-palestine-route-results.json). The official method requires origin, destination, travel mode, and a field mask ([Compute Routes](https://developers.google.com/maps/documentation/routes/compute-route-over)).

Valhalla remains materially stronger for these four fixtures: it returned `4/4` structurally reviewed routes at 28.163 km/2,342.147 s, 36.440 km/2,695.820 s, 28.786 km/2,400.186 s, and 32.964 km/2,952.371 s. Google network latency is not compared directly with local Valhalla latency. `VALHALLA_ROUTING_CANDIDATE=CONDITIONAL` and `ROUTING_RECOMMENDATION_CANDIDATE=OSM_VALHALLA` remain unchanged.

## Decision matrix and storage boundary

| Gate | Result | Evidence |
|---|---|---|
| GEO1 Arabic quality | FAIL | 11/30, below 95% |
| GEO2 English quality | FAIL | 10/30, below 95% |
| GEO3 overall correctness | FAIL | 21/60, below 95% |
| GEO4 latency | PASS | 60/60 API responses; 111.201/128.934 ms p50/p95 |
| GEO5 tested Palestine public-place coverage | FAIL | generic/wrong-entity labels dominate non-city fixtures |
| GEO6 storage compatibility | FAIL | canonical coordinates/labels/results are not approved for persistence |
| GEO7 attribution/display compatibility | CONDITIONAL | required attribution is documented; renderer is unselected |
| GEO8 privacy/DPA | UNRESOLVED | public-fixture evidence sent no user data; production controller/privacy design is not reviewed |
| GEO9 commercial feasibility | UNRESOLVED | Demo Key is prototype-only; paid production cost/billing was not approved |
| GEO10 quota/operations | UNRESOLVED | bounded demo quota worked; production quotas, support, monitoring, and regional operations are unapproved |

Google's current geocoding policy generally restricts prefetching, caching, and storage except place IDs, and requires attribution/display treatment plus public Terms of Use and a Privacy Policy ([policies and attribution](https://developers.google.com/maps/documentation/geocoding/policies)). The Maps Demo Key is explicitly for testing/prototyping and not production ([Demo Key](https://developers.google.com/maps/demo-key)). Google Maps Platform terms also state that Google receives search terms, IP addresses, and coordinates and describe controller-controller/privacy obligations ([terms](https://cloud.google.com/maps-platform/terms)). Therefore `GOOGLE_GEOCODING_QUALITY=FAIL` and, independently, `GOOGLE_PRODUCTION_STORAGE=RESTRICTED`.

No Google-derived coordinate, label, geometry, polyline, distance, duration, content cache, or reference content was added to canonical MySQL. Production remains disabled. This evidence does not add a Google SDK, renderer, GPS/location permission, realtime function, migration, or schema change.
