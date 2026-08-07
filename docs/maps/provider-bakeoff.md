# M7D1 provider bakeoff evidence

Evidence date: 2026-08-07. This is an engineering review of public official material, not legal advice or completed legal/licensing approval. The committed fixture is public canonical planning data for Hebron, Palestine Polytechnic University, Bab Al-Zawiya, and Bethlehem in Arabic and English; it contains no user address or live location.

## Execution result

| Candidate | Result | Live credentials | Geocode ≥95% | Arabic | Route validity | Live route p95 <2s |
|---|---|---:|---:|---:|---:|---:|
| Mapbox | NOT_EXECUTED | absent | not measured | not measured | no human review | not measured |
| Google | NOT_EXECUTED | absent | not measured | not measured | no human review | not measured |
| HERE | NOT_EXECUTED | absent | not measured | not measured | no human review | not measured |
| Stadia/MapLibre stack | NOT_EXECUTED | absent | not measured | not measured | no human review | not measured |

The fake-provider harness ran 10 sequential local samples with zero failures, 100% fixture geocoding, Arabic/English acceptance, and a recorded local p95 of 8.54 ms. This proves only harness determinism; it is not live-provider performance or Palestine route-quality evidence. Run with `ROUTE_BAKEOFF_PROVIDER=<candidate>` and server-side `ROUTE_PROVIDER_SECRET`; missing credentials deliberately exit as `NOT_EXECUTED`.

## Storage and attribution matrix

| Candidate | Geocode storage | Published route geometry/distance/duration | Attribution | Status |
|---|---|---|---|---|
| Mapbox | Temporary results cannot be stored; Permanent Geocoding requires the permanent endpoint/account terms. | Directions persistence rights were not explicit enough in reviewed public docs for Masari's immutable record. | Mapbox/underlying map-data attribution required. | unresolved |
| Google | Place IDs may be stored; most geocoding content storage is restricted. | Routes terms describe limited caching and prohibit use with a non-Google map; permanent canonical polyline rights are not approved. | Google Maps attribution and UI rules required. | incompatible/unresolved without reviewed license and renderer choice |
| HERE | Standard platform terms limit most cached/stored results to 30 days. | Immutable multi-year geometry needs separate contractual rights. | HERE and applicable third-party attribution required. | unresolved |
| Stadia | Persistent geocoding requires an eligible Standard/Professional/Enterprise subscription. | Public terms prohibit server-side caching generally; plan-specific persistent routing rights need written confirmation. | Stadia Maps plus original data sources such as OpenStreetMap. | unresolved |

Official evidence: [Mapbox geocoding storage](https://docs.mapbox.com/api/search/geocoding/), [Mapbox directions](https://docs.mapbox.com/api/navigation/directions/), [Mapbox pricing](https://www.mapbox.com/pricing), [Google Routes policies](https://developers.google.com/maps/documentation/routes/policies), [Google service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms), [HERE platform terms](https://legal.here.com/us-en/terms/here-platform/terms-november-2021), [Stadia terms](https://stadiamaps.com/terms-of-service/), [Stadia attribution](https://docs.stadiamaps.com/attribution/), and [Stadia pricing](https://stadiamaps.com/pricing).

## Telemetry/privacy and budget

All server APIs necessarily receive canonical stop queries/coordinates, account/network metadata, and usage timing. No mobile SDK was added, so M7D1 adds no device telemetry, advertising identifier, location permission, or background service. Stadia's DPA explicitly lists IP, approximate IP-derived location, device identifiers, usage data, and request parameters that may contain location data; equivalent provider-specific DPA/account review remains required.

Pricing models are documented but Masari volume and billing-account terms have not been approved: Mapbox bills geocoding/navigation by request; Google bills Geocoding and Compute Routes SKUs; HERE currently advertises free/pay-as-you-grow but detailed account pricing needs review; Stadia uses plan credits (standard routing and forward geocoding currently 20 credits/request). No budget-fit claim is made.

`PREFERRED_PROVIDER_RECOMMENDATION=NO_PROVIDER_APPROVED_YET`. Mapbox remains the conditional lead only. M7D2 requires credentials, repeated cold/warm runs, ≥95% acceptable geocoding, Arabic review, human route-map review in the actual corridor, p95 evidence, written storage approval for every persisted field, attribution/renderer approval, telemetry/DPA review, and an approved budget.
