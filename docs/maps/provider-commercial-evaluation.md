# M7D1B provider commercial evaluation

Evidence date: 2026-08-07. Prices are public list prices in USD before tax, negotiated discounts, support, currency conversion, or account-specific terms. They are estimates, not an approved production budget. One canonical geocode and one route calculation are modeled per operation; canonical calculation is route-authoring work, never per Trip.

| Scenario | Geocodes/month | Routes/month |
|---|---:|---:|
| LOW | 1,000 | 1,000 |
| MEDIUM | 10,000 | 10,000 |
| HIGH | 100,000 | 100,000 |

Renderer/map loads are excluded and must be budgeted separately after a renderer decision.

## Scenario estimate

| Provider/design assumption | LOW | MEDIUM | HIGH | Status |
|---|---:|---:|---:|---|
| Mapbox Permanent Geocoding + Directions | $5 | $50 | $500 | CONDITIONAL |
| Google Geocoding + Compute Routes Essentials | $0 | $0 | $900 | CONDITIONAL, storage-incompatible |
| HERE Geocoding + Routing | UNRESOLVED | UNRESOLVED | UNRESOLVED | UNRESOLVED |
| Stadia Standard plan, 20 credits per geocode and route | $80 | $80 | $80 | CONDITIONAL, routing rights unresolved |
| OSM self-hosted Valhalla + Nominatim | no per-call vendor fee measured | no per-call vendor fee measured | no per-call vendor fee measured | UNPRICED infrastructure/SRE burden |

### Mapbox

[Mapbox pricing](https://www.mapbox.com/pricing) lists Permanent Geocoding at $5 per 1,000 requests through 500,000 with no free tier, and Directions free through 100,000 monthly requests. The estimate therefore models permanent rather than temporary geocoding because canonical geocode storage is intended. Temporary Geocoding would be free through 100,000 but cannot be cached. Directions becomes $2/1,000 from 100,001–500,000, then $1.60 and $1.20 at higher tiers. A future renderer has separate map/MAU/tile/static-image pricing.

### Google

The [Google Maps Platform pricing list](https://developers.google.com/maps/billing-and-pricing/pricing) gives both Geocoding and Compute Routes Essentials a 10,000-event monthly free cap, then $5/1,000 through 100,000. Thus LOW and MEDIUM are $0; HIGH pays for 90,000 geocodes ($450) plus 90,000 routes ($450). This price does not cure the storage and non-Google-map incompatibilities. Dynamic Maps is separately $7/1,000 after its 10,000 free cap; Maps SDK events are currently listed with an unlimited free cap.

### HERE

[HERE pricing](https://www.here.com/get-started/pricing) publishes Limited/Base/enterprise paths, but the current machine-readable public evidence did not expose a reliable numeric pay-as-you-grow table for these exact scenarios. The Limited plan publishes 1,000 requests/day and RPS limits but excludes some transport/asset-management cases. Numeric scenario totals, commercial-use classification, persistence license, and support tier therefore require account-specific confirmation and remain unresolved; older price pages are not used as current evidence.

### Stadia Maps

[Stadia pricing](https://stadiamaps.com/pricing) lists Free $0/200,000 credits (non-commercial), Starter $20/1,000,000, Standard $80/7,500,000, and Professional $250/25,000,000; additional credits are opt-in by plan. Forward geocoding and standard routing each cost 20 credits/request. The scenarios consume 40,000, 400,000, and 4,000,000 credits. Standard is modeled because it is the lowest listed tier granting persistent geocoding; all three fit its included 7.5 million credits. Routing-result persistence still needs written confirmation, so this is not production approval. Tiles and static maps consume separate credits.

## Quota and support evidence

- Mapbox: Geocoding v6 defaults to 1,000 requests/minute and Directions to 300 requests/minute; both direct higher-limit requests to account/support review.
- Google: Geocoding and Compute Routes publish 3,000 queries/minute. Quotas are monitored and adjustable in Google Cloud Console, with billing impact review.
- HERE: the Limited plan publishes 1,000 daily requests, 5 RPS for geocoding, and 10 RPS for car/bicycle/pedestrian routing. General HERE quota documentation reports 429/503 throttling and plan/account-specific limits; production terms and support remain unresolved.
- Stadia: fixed plan credit pools prevent unapproved overage; plan-specific request-rate and higher-limit details require dashboard/account confirmation. Standard/Professional/Enterprise implications remain conditional.

Operational gate G10 and commercial gate G9 remain unapproved for every provider pending credentialed measurements, account validation, volume distribution, support/SLA review, and an approved budget.

The self-hosted run demonstrated modest developer-machine footprint but did not price production compute, storage, bandwidth, observability, blue/green graph builds, backups, on-call work or upgrades. Avoiding per-request vendor fees is not a zero-cost conclusion; G10 remains `CONDITIONAL`.
