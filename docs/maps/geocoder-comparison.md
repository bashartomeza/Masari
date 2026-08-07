# Palestine geocoder comparison

Evidence date: 2026-08-08. All candidates used the unchanged 30-concept × Arabic/English dataset and top-result-only 95% language/overall gates.

| Candidate | Arabic | English | Overall | warm p50/p95 | serving memory | complexity | Decision |
|---|---:|---:|---:|---:|---:|---|---|
| Nominatim 5.3.2 | 26/30 | 25/30 | 51/60 (`85.0%`) | documented separately | ~1.1 GiB service; import peaked higher | HIGH | FAIL |
| Pelias open-data-only | 10/30 | 15/30 | 25/60 (`41.7%`) | 13.201/29.816 ms | ~3.85 GiB | HIGH | FAIL |
| Photon 1.3.0 | 19/30 | 26/30 | 45/60 (`75.0%`) | 8.304/13.113 ms | 606.5 MiB | MODERATE | FAIL |
| Google Geocoding API v4 | 11/30 | 10/30 | 21/60 (`35.0%`) | 111.201/128.934 ms | hosted | hosted; production/storage restricted | FAIL |

Nominatim is the tested quality leader at 85.0%, but still fails all 95% approval gates. Google answered 60/60 API requests, yet conservative functional review rejected generic city, street, plus-code, numeric, blank, wrong-area and wrong-campus results; transport success did not overcome 21/60 public-place acceptance. Photon remains the strongest of the two later self-hosted operational/performance results, but also fails quality. No fixture-tuned overlay is approved.

`GEOCODING_RECOMMENDATION_CANDIDATE=NONE`. Routing remains separately `OSM_VALHALLA` as a recommendation candidate and `VALHALLA_ROUTING_CANDIDATE=CONDITIONAL`. This does not approve a provider: `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`.
