# Photon Palestine geocoding evidence

Evidence date: 2026-08-08. Photon 1.3.0 (`4c28c7c132694d72673a2475ddab854bd32dac71`) was downloaded from the official [1.3.0 release](https://github.com/komoot/photon/releases/tag/1.3.0). The JAR was `98,219,380` bytes with SHA-256 `a89707c0045e4807b2a1180e132e68e108d998709f48b6c94b98a6e281f571a5`. It ran under `eclipse-temurin:21-jre@sha256:8cef5fc7bebe421363ab543a2f4db5caf7d119d8db67d56b0f56c485d2de4d55`, bound only to `127.0.0.1:19222`.

Photon is Apache-2.0 software but its indexed data is OSM-derived ([Photon project](https://github.com/komoot/photon)); OSM data remains ODbL with attribution/share-alike obligations ([OSM copyright](https://www.openstreetmap.org/copyright)). Software and data licenses must not be conflated.

## Import and runtime

The data source was the same independently built Nominatim 5.3.2 database from the exact Geofabrik PBF, with source import timestamp `2026-08-06 20:10:53`. Photon imported only country `ps`, languages `ar,en`, no synonyms, no extra tags, no full geometry, and produced `48,695` documents. Processing took `9 s`; end-to-end JVM/OpenSearch start, import and shutdown was about `18.2 s`. The embedded index used `40,451,965` bytes.

Serving memory was `606.5 MiB`. A fresh start plus first successful useful request took `9,989.467 ms`. After warm-up, 200 requests had p50/p95 `8.304/13.113 ms`, maximum `20.396 ms`, zero errors. A bounded 20-way batch had p50/p95 `66.289/74.750 ms`, maximum `75.199 ms`, zero errors. Timing used `performance.now`, a five-second timeout and nearest-rank percentiles.

## Quality

The unchanged 60-query fixture used normal query ranking, `lang`, a fixed Palestine rectangle and a regional location bias, with at most three returned candidates and top-result-only scoring. No custom lookup, synonym, alias record, or private data was added. Per-query returned candidates, coordinates, safe failure and latency are in [the result file](evidence/photon-palestine-geocoding-results.json).

| Language | Accepted | Target | Result |
|---|---:|---:|---|
| Arabic | 19/30 (`63.3%`) | >=95% | FAIL |
| English | 26/30 (`86.7%`) | >=95% | FAIL |
| Overall | 45/60 (`75.0%`) | >=95% | FAIL |

The 15 failures aggregate to nine ranking/type problems, five incorrect-area results and one missing source result. Examples include Arabic queries ranking a university museum, a road, a park, or the wrong institution/city; English Qalqilya Zoo ranked a cemetery and Bethlehem Peace Center ranked its restaurant.

## Operations and decision

Photon is operationally simpler than Pelias for this regional index, but production still needs the Nominatim import/update dependency, atomic dump or blue/green promotion, backups and restore tests, OpenSearch/JVM patching, disk and heap alerts, API controls, metrics, update-lag monitoring, and capacity testing. Complexity is `MODERATE`; update strategy is `CONDITIONAL`; TCO and ODbL storage treatment remain unresolved.

`H1=FAIL`, `H2=FAIL`, `H3=FAIL`, `H4=PASS`, `H5=FAIL`, `H6=UNRESOLVED`, `H7=PASS`, `H8=CONDITIONAL`, `H9=CONDITIONAL`, `H10=UNRESOLVED`.

`PHOTON_GEOCODING_CANDIDATE=FAIL`.
