# M7D1B OSM self-hosted operational evaluation

Evidence date: 2026-08-07. Candidate: `OSM_SELF_HOSTED_VALHALLA`. This is a disposable developer-machine evaluation, not production architecture or capacity approval.

## Observed footprint and deployment boundary

The current 119.35 MB Geofabrik extract built into a 196.25 MB Valhalla tile directory in 262 seconds. The localhost service used about 257 MiB when warm; peak sampled build memory was about 730 MiB. A bounded 20-way request batch completed without error. These results make the stack operationally credible for further Palestine-corridor evaluation, but do not establish HA, recovery objectives, multi-region behavior or sustained throughput.

The evidence service used a digest-pinned container, fixed public fixture inputs, POST requests and a localhost-only port. It had no credential, public ingress, Masari database connection, arbitrary base URL or path into staging/production. Production must not depend on `tile.openstreetmap.org` or `nominatim.openstreetmap.org`; those community services are not a Masari SLA.

## Production work still required

A later independently approved design would need:

- a licensed extract/update source and documented ODbL compliance;
- daily-diff or fresh-extract automation with checksum verification, reproducible tile builds, validation and atomic blue/green promotion;
- rollback to a known graph, health/readiness checks, request deadlines, bounded queues and resource limits;
- monitoring for graph age, build failures, route error classes, latency, saturation and disk growth;
- backups only where they are more efficient than deterministic rebuilds, plus tested disaster recovery;
- network isolation, authentication from Masari services, TLS between hosts, patching and container provenance controls;
- production packaging that never shell-traces database credentials (the disposable community Nominatim wrapper did so and was removed with its logs);
- broader route/vehicle/access testing and human review before production use;
- an explicit renderer/tile choice and visible OpenStreetMap attribution.

Geofabrik publishes daily regional extracts, while Nominatim and Valhalla each require their own update/rebuild lifecycle. A safe first production model would build and validate away from the serving instance, then switch immutable artifacts. In-place graph mutation is not approved here.

## Privacy, cost and vendor characteristics

Self-hosting can keep canonical stop coordinates and route requests inside Masari-controlled infrastructure and avoids third-party request telemetry. That is a privacy advantage, not automatic compliance: infrastructure logs, access control, retention, backups and regional hosting still need review. There is no per-request vendor fee in this evidence run, but compute, storage, bandwidth, observability, on-call work, upgrades and ODbL compliance are real costs. Operational gate G10 is therefore `CONDITIONAL`.

| Dimension | OSM/Valhalla observed or known | Google current state |
|---|---|---|
| Palestine route quality | Four corridor fixtures passed human continuity/plausibility review | NOT_EXECUTED |
| Arabic geocoding | Separate Nominatim initial set is 4/8 strict overall and 2/4 Arabic | NOT_EXECUTED |
| Canonical geometry rights | ODbL; route-output/storage classification needs legal review | Published standard Routes persistence is restricted for the proposed record |
| Calculation latency | Warm p95 11.291 ms locally; cold-request p95 121.952 ms | NOT_EXECUTED |
| Vendor lock-in | Open data and open-source engine; graph/config behavior still engine-specific | UNRESOLVED pending live/account evaluation |
| Infrastructure cost | Self-funded compute/storage/operations; no per-call fee measured | Published list-price estimate only; no credentialed usage |
| Attribution | OpenStreetMap attribution and license access required | Google attribution/display rules apply |
| Maintenance | Masari owns imports, graph builds, updates, monitoring and incidents | Managed service, account/SLA still unreviewed |
| Offline/self-host | Supported and demonstrated locally | Not established for this design |

Routing, geocoding, tiles and rendering remain separable. A future stack could combine MapLibre, properly sourced OSM-derived tiles, Valhalla and Nominatim/Pelias, but none is integrated or enabled by M7D1B.

## Gate summary

| Gate | Result | Basis |
|---|---|---|
| G1 provider-neutral compatibility | PASS | Valhalla output normalized into the existing route concepts without production coupling |
| G2 Palestine road coverage | PASS | Required corridor only; no all-Palestine claim |
| G3 route validity | PASS | 4/4 human-reviewed fixture routes |
| G4 route latency | PASS | cold and warm p95 below 2 seconds |
| G5 Arabic geocoding | FAIL | strict 2/4 initial Nominatim results; sample remains too small to generalize |
| G6 geocoding quality | FAIL | strict 4/8, below 95%; `SAMPLE_SIZE_INSUFFICIENT` for broad quality claims |
| G7 canonical-storage compatibility | CONDITIONAL | ODbL/route-output classification requires legal review |
| G8 attribution compatibility | CONDITIONAL | requirement is understood; final renderer is intentionally absent |
| G9 privacy | PASS | local evidence sent no fixture/user data to a routing/geocoding provider |
| G10 operational complexity/cost | CONDITIONAL | feasible footprint, but production SRE/TCO evidence is incomplete |

`OSM_VALHALLA_CANDIDATE=CONDITIONAL`. Failed geocoding gates do not invalidate Valhalla routing, because Masari may select separate routing and geocoding systems. Final provider selection remains `NO_PROVIDER_APPROVED_YET`.
