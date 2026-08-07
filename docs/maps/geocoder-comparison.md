# Palestine geocoder comparison

Evidence date: 2026-08-08. All candidates used the unchanged 30-concept × Arabic/English dataset and top-result-only 95% language/overall gates.

| Candidate | Arabic | English | Overall | warm p50/p95 | serving memory | complexity | Decision |
|---|---:|---:|---:|---:|---:|---|---|
| Nominatim 5.3.2 | 26/30 | 25/30 | 51/60 (`85.0%`) | documented separately | ~1.1 GiB service; import peaked higher | HIGH | FAIL |
| Pelias open-data-only | 10/30 | 15/30 | 25/60 (`41.7%`) | 13.201/29.816 ms | ~3.85 GiB | HIGH | FAIL |
| Photon 1.3.0 | 19/30 | 26/30 | 45/60 (`75.0%`) | 8.304/13.113 ms | 606.5 MiB | MODERATE | FAIL |

Photon is the best operational/performance result of the two new candidates, but it is still ten overall samples and ten Arabic samples short of the 95% gates. Pelias combining OSM, WOF and GeoNames did not improve this corpus. Neither warrants a production adapter or fixture-tuned overlay.

`GEOCODING_RECOMMENDATION_CANDIDATE=NONE`. Routing remains separately `OSM_VALHALLA` as a recommendation candidate and `VALHALLA_ROUTING_CANDIDATE=CONDITIONAL`. This does not approve a provider: `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`.
