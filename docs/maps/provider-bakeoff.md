# M7D1/M7D1B provider bakeoff evidence

Evidence date: 2026-08-07. This is an engineering review of public official material, not legal advice or completed legal/licensing approval. The committed fixture is public canonical planning data for Hebron, Palestine Polytechnic University, Bab Al-Zawiya, and Bethlehem in Arabic and English; it contains no user address or live location.

## M7D1B execution result

| Candidate | Result | Live credentials | Geocode ≥95% | Arabic | Route validity | Live route p95 <2s |
|---|---|---:|---:|---:|---:|---:|
| Mapbox | NOT_EXECUTED | NOT_AVAILABLE | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | INSUFFICIENT_EVIDENCE |
| Google | NOT_EXECUTED | NOT_AVAILABLE | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | INSUFFICIENT_EVIDENCE |
| HERE | NOT_EXECUTED | NOT_AVAILABLE | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | INSUFFICIENT_EVIDENCE |
| Stadia/MapLibre stack | NOT_EXECUTED | NOT_AVAILABLE | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | INSUFFICIENT_EVIDENCE |

Categorical checks of approved local environment mechanisms and repository CI secret names found no credential. No value was printed, documented, or committed and no user credential was requested. The harness was run for every candidate; each deliberately emitted zero samples, null latency, `credential_unavailable`, and `NOT_EXECUTED`.

The fake-provider harness ran 10 sequential local samples with zero failures: 8/8 fixture geocodes (4 Arabic, 4 English) and 2/2 fixture routes. This proves only harness determinism; it is not live-provider performance or Palestine route-quality evidence. The harness reports geocode and route p50/p95 separately using a monotonic clock, explicit sample/call/Arabic counts, safe failure categories, and unresolved human-review, storage, attribution, privacy, and commercial gates. Run with `ROUTE_BAKEOFF_PROVIDER=<candidate>` and server-side `ROUTE_PROVIDER_SECRET`; missing credentials deliberately emit null evidence and process exit 2 as `NOT_EXECUTED`.

## Storage and attribution matrix

| Candidate | Geocode storage | Published route geometry/distance/duration | Attribution | Status |
|---|---|---|---|---|
| Mapbox | Temporary results cannot be stored; Permanent Geocoding allows indefinite storage with required billing/contract. | Published Directions persistence rights remain unresolved for the immutable record. | Mapbox response and applicable underlying map-data attribution required. | conditional/unresolved |
| Google | Place IDs may be stored; the indefinite geocode exception is end-user-specific and isolated, not a shared canonical record. | Routes caching is restricted and content cannot be used with a non-Google map. | Google Maps attribution/UI rules and Google map restrictions apply. | incompatible for proposed design |
| HERE | Public standard terms limit Location Services Results outside the platform to 30 days. | Immutable multi-year geometry needs separate contractual rights. | HERE and applicable supplier attribution required. | restricted without separate rights |
| Stadia | Persistent geocoding requires an eligible Standard/Professional/Enterprise subscription and permissions. | Server-side caching is prohibited; persistent routing rights need written confirmation. | Stadia Maps plus applicable original sources such as OpenStreetMap. | conditional/unresolved |

Official evidence: [Mapbox geocoding storage](https://docs.mapbox.com/api/search/geocoding/), [Mapbox directions](https://docs.mapbox.com/api/navigation/directions/), [Mapbox pricing](https://www.mapbox.com/pricing), [Google Routes policies](https://developers.google.com/maps/documentation/routes/policies), [Google service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms), [HERE platform terms](https://legal.here.com/us-en/terms/here-platform/terms-november-2021), [Stadia terms](https://stadiamaps.com/terms-of-service/), [Stadia attribution](https://docs.stadiamaps.com/attribution/), and [Stadia pricing](https://stadiamaps.com/pricing).

## Telemetry/privacy, budget, and decision

All server APIs receive canonical stop queries/coordinates and network/account request metadata. No mobile SDK was added, so M7D1B adds no device telemetry, advertising identifier, location permission, or background service. Mapbox is privacy-conditional; Google Maps Platform's contractual role and retention need account review; HERE's standard versus Essential Data Processing path is unresolved; Stadia publishes a DPA and approximately 7–14-day API log retention but still needs account and transfer review.

At the required LOW/MEDIUM/HIGH scenarios, list-price modeling is: Mapbox Permanent Geocoding plus Directions $5/$50/$500; Google Essentials $0/$0/$900; HERE unresolved; and Stadia Standard $80/$80/$80 while included credits suffice. These are not approved budgets and do not cure storage or privacy blockers. Renderer/map-load costs remain separate.

The mandatory G1–G10 rubric is defined in [provider-live-evidence.md](provider-live-evidence.md). `PROVIDER_RECOMMENDATION_CANDIDATE=NONE` and `PROVIDER_SELECTION=NO_PROVIDER_APPROVED_YET`. M7D1B remains `ACTIVE / BLOCKED_ON_LIVE_EVIDENCE`. M7D2 requires credentials, repeated cold/warm runs, ≥95% acceptable geocoding, Arabic review, human route-map review in the actual corridor, credible p95 evidence, written storage approval for every persisted field, attribution/renderer approval, privacy/DPA review, quota/support approval, an approved budget, and independent review.

Focused evidence: [live methodology and scoring](provider-live-evidence.md), [Palestine route review](provider-palestine-route-review.md), [storage-rights matrix](provider-storage-rights-matrix.md), [commercial evaluation](provider-commercial-evaluation.md), and [privacy evaluation](provider-privacy-evaluation.md).
