# M7D1B self-hosted Nominatim evidence

Evidence date: 2026-08-07. Classification: `TEST FIXTURE DATA — NOT USER LOCATION DATA`. Routing evidence and geocoding evidence are separate. The public OSM Nominatim endpoint was not used.

## Feasibility and import

The workstation had 15.8 GB physical RAM and about 142 GB free disk before the run. The [Nominatim 5.3.2 import guide](https://nominatim.org/release-docs/latest/admin/Import/) requires at least 2 GB RAM and recommends a non-flatnode osm2pgsql cache near the PBF size for a small extract; PostgreSQL/PostGIS and operational updates remain required. This 119 MB regional extract was therefore safe to evaluate with conservative settings.

Nominatim `5.3.2-0` ran in `mediagis/nominatim@sha256:7923a8e67197fc6d4f4ecb7c0e8bbedffeddcfdf4519596fe946e46a28f5a9f8` (image build metadata `2026-06-23T09:03:44.173Z`). The image is a community packaging of the current supported upstream release, not an OSMF-operated production service. It used PostgreSQL 16.14, PostGIS 3.4, osm2pgsql 1.11.0, eight import threads, full import style, no Wikipedia/TIGER/postcode extras, no replication, `FREEZE=true`, 512 MB shared buffers and 2 GB maintenance work memory. It bound only to `127.0.0.1:18080`.

The successful import started at `2026-08-07T18:54:36.263Z`; PostgreSQL was ready at `2026-08-07T19:00:04Z` and HTTP workers at `2026-08-07T19:00:08Z`, about 332 seconds end to end. The database volume was `2,275,864,484` bytes. Peak sampled import memory was about 2.95 GiB. `nominatim admin --check-database` passed connection, version, placex content, tokenizer, indexing and index-validity checks. A nonfatal Gunicorn control-socket permission message did not affect workers or health. An initial read-only-file mount attempt exited before import; it was deleted and replaced with the container's documented writable data-volume layout.

Security finding: the community container's shell tracing writes its disposable PostgreSQL password into Docker logs. PostgreSQL was never published, only the HTTP API was bound to localhost, no Masari/user credential was used, and the container/logs/volumes were deleted after evidence. This wrapper is not acceptable unchanged for production; production packaging must disable secret-bearing trace output, inject a managed secret and keep PostgreSQL isolated.

## Bilingual fixture review

Searches were restricted to the public corridor viewbox and requested Arabic or English result language. “Acceptable” is deliberately strict: the top result must identify the intended canonical concept at a plausible position. Related features and a different campus are not counted.

| Fixture | Top result | Offset from canonical coordinate | Review |
|---|---|---:|---|
| `الخليل` | الخليل administrative boundary | 0.650 km | PASS |
| `جامعة بوليتكنك فلسطين` | university node in central Hebron | 6.347 km | FAIL — different campus/location |
| `باب الزاوية` | مسجد باب الزاوية | 0.882 km | FAIL — related feature, not the requested central stop |
| `بيت لحم` | بيت لحم administrative boundary | 0.377 km | PASS |
| `Hebron` | Hebron administrative boundary | 0.650 km | PASS |
| `Palestine Polytechnic University` | Building C | 7.948 km | FAIL — different campus/location |
| `Bab Al-Zawiya` | no result | — | FAIL |
| `Bethlehem` | Bethlehem administrative boundary | 0.377 km | PASS |

Strict acceptance is 4/8 (`50%`), with Arabic 2/4 and English 2/4. That fails the 95% target. The eight-query set is also too small to characterize regional geocoding, so `SAMPLE_SIZE_INSUFFICIENT` remains explicit. Arabic script and labels were well formed for returned results, but correct Arabic text did not cure semantic/campus mismatches; Arabic quality is `FAIL_ON_INITIAL_FIXTURES`.

The first uncached Arabic Hebron request was 316.284 ms. A later 200-query sequential warm run (25 per fixture) had p50 `14.477 ms`, p95 `18.796 ms`, maximum `38.327 ms`, and zero transport/server errors. These are local calculation/database timings, not Internet latency or production capacity evidence.

## Operational assessment

Self-hosted Nominatim is technically feasible on this development machine; it is not blocked on local resources. Production would still require a separately operated PostgreSQL/PostGIS service, backups, monitoring, security patching, index/database maintenance, regional-extract boundary review, and a replication strategy. Geofabrik daily updates could feed Nominatim replication when a stable replication URL/state is configured; this frozen evidence database intentionally did not test updates.

OSMF guidance treats ordinary individual geocoding results as insubstantial extracts when they are not systematically reconstructing OSM, while requiring attribution for public use. Systematic collections and modified/derivative databases carry different obligations. See the [OSMF geocoding guideline](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Geocoding_-_Guideline). Canonical storage remains subject to legal review and attribution; this document does not grant ownership rights.

`OSM_SELF_HOSTED_GEOCODING=EXECUTED_BUT_QUALITY_FAILED_INITIAL_SET`. This does not fail Valhalla as a routing candidate and does not approve another geocoder.
