# Palestine geocoder comparison

Evidence date: 2026-08-08. All candidates used the unchanged 30-concept × Arabic/English dataset and primary top-result-only 95% language/overall gates. Google address Geocoding v4 and Google Places Text Search are intentionally separate rows because they are different products and methods.

| Candidate | Arabic | English | Overall | warm p50/p95 | serving memory | complexity | Decision |
|---|---:|---:|---:|---:|---:|---|---|
| Nominatim 5.3.2 | 26/30 | 25/30 | 51/60 (`85.0%`) | documented separately | ~1.1 GiB service; import peaked higher | HIGH | FAIL |
| Pelias open-data-only | 10/30 | 15/30 | 25/60 (`41.7%`) | 13.201/29.816 ms | ~3.85 GiB | HIGH | FAIL |
| Photon 1.3.0 | 19/30 | 26/30 | 45/60 (`75.0%`) | 8.304/13.113 ms | 606.5 MiB | MODERATE | FAIL |
| Google Geocoding API v4 | 11/30 | 10/30 | 21/60 (`35.0%`) | 111.201/128.934 ms | hosted | hosted; production/storage restricted | FAIL |
| Google Places Text Search (New) | 25/30 | 23/30 | 48/60 (`80.0%`) | 224.718/277.305 ms | hosted | hosted; Places content storage restricted | FAIL |

Nominatim is both the tested geocoding-quality and public-place-search quality leader at 85.0%, but still fails all 95% approval gates. Google address Geocoding v4 answered 60/60 API requests, yet public-place acceptance was only 21/60. Places Text Search also answered 60/60 and materially improved the named-place result to 48/60 at rank 1 (52/60 within ranks 1–5), but the primary score still failed every gate. Photon remains the strongest of the two later self-hosted operational/performance results, but also fails quality. No fixture-tuned overlay is approved.

`GEOCODING_QUALITY_LEADER=NOMINATIM`, `SEARCH_QUALITY_LEADER=NOMINATIM`, and `GEOCODING_RECOMMENDATION_CANDIDATE=NONE`. Routing remains separately `OSM_VALHALLA` as a recommendation candidate and `VALHALLA_ROUTING_CANDIDATE=CONDITIONAL`. This does not approve a provider: `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`.
