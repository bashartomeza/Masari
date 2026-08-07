# M7D1B provider storage-rights matrix

Evidence date: 2026-08-07. This is a conservative engineering reading of current public official sources, not legal advice. No provider-derived result is persisted by M7D1B.

| Proposed canonical field | Mapbox | Google | HERE | Stadia |
|---|---|---|---|---|
| normalized latitude | CONDITIONAL | RESTRICTED | RESTRICTED | CONDITIONAL |
| normalized longitude | CONDITIONAL | RESTRICTED | RESTRICTED | CONDITIONAL |
| normalized display label | CONDITIONAL | RESTRICTED | RESTRICTED | CONDITIONAL |
| encoded route geometry/polyline | UNRESOLVED | RESTRICTED | RESTRICTED | UNRESOLVED |
| route distance | UNRESOLVED | RESTRICTED | RESTRICTED | UNRESOLVED |
| route duration | UNRESOLVED | RESTRICTED | RESTRICTED | UNRESOLVED |
| provider route/reference ID | UNRESOLVED | UNRESOLVED | RESTRICTED | UNRESOLVED |
| provider geocode/reference ID | CONDITIONAL | ALLOWED only when it is a place ID | RESTRICTED | CONDITIONAL |
| attribution/provenance metadata | CONDITIONAL | CONDITIONAL | CONDITIONAL | CONDITIONAL |

## Provider findings

### Mapbox

[Geocoding API v6](https://docs.mapbox.com/api/search/geocoding/) prohibits caching Temporary results and permits Permanent results to be stored indefinitely when `permanent=true`; Permanent use requires a valid credit card or enterprise contract. Accordingly, coordinates, labels, and geocode IDs are conditional on Masari deliberately using and paying for Permanent Geocoding. [Directions API v5](https://docs.mapbox.com/api/navigation/directions/) documents returned geometry, distance, duration, and operational limits, but the reviewed public documentation does not expressly approve indefinite storage of those route fields or route references. Those cells remain unresolved rather than inferred.

The geocoding response carries Mapbox attribution. A future renderer must also implement the applicable Mapbox and underlying map-data attribution; [Static Images documentation](https://docs.mapbox.com/api/maps/static-images/) confirms that OpenStreetMap attribution remains the customer's responsibility when OSM-derived maps are used.

### Google Maps Platform

Current [service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) allow Geocoding and Routes content without a corresponding Google map but prohibit using it with a non-Google map. They permit only 30-day latitude/longitude caching by default. The Geocoding exception for indefinite latitude, longitude, formatted address, and structured address storage applies solely to direct end-user-facing functionality, logically isolated to the initiating end user, and not as a substitute for calls. Masari's proposed shared immutable canonical route record does not fit that published exception, so the related cells are restricted for this design.

[Geocoding policies](https://developers.google.com/maps/documentation/geocoding/policies) and [Routes policies](https://developers.google.com/maps/documentation/routes/policies) generally restrict content caching while permitting place IDs to be stored indefinitely. A geocode reference is allowed only if it is such a place ID; a general route token is not assumed equivalent. Published terms do not grant indefinite shared storage of route polyline, distance, or duration.

### HERE

The [HERE Platform Terms](https://legal.here.com/us-en/terms/here-platform/terms-november-2021) prohibit storing Location Services Results outside the platform for more than 30 days, absent a subscription-plan or separately agreed exception, and additionally prohibit prefetch/cache/storage except as allowed by returned caching headers. That does not support Masari's proposed multi-year immutable canonical record. Every provider-result field is therefore restricted under the public standard terms; attribution metadata is conditional because applicable HERE and supplier notices still require implementation. Separate written rights could change this classification but are not presently evidence.

### Stadia Maps

[Stadia terms](https://stadiamaps.com/terms-of-service/) prohibit server-side caching and permanent Geocoding API storage without an active Standard, Professional, or Enterprise subscription with appropriate permissions. [Current pricing](https://stadiamaps.com/pricing) marks geocoding persistence as available on Standard and Professional plans. Coordinates, labels, and geocode IDs are therefore conditional on an eligible active plan and its permissions.

The same public terms do not expressly approve long-term database persistence of routing geometry, distance, duration, or route references. They remain unresolved. [Stadia attribution guidance](https://docs.stadiamaps.com/attribution/) requires credit to Stadia Maps and applicable original sources for geocoding/routing, and additional Stadia/OpenMapTiles/OpenStreetMap attribution for its usual map styles.

## Decision

No provider has `ALLOWED` or compatible conditional status for every required field. Storage gate G6 is not satisfied. Formal approval requires provider/account-specific written confirmation, legal review, and a later independently reviewed persistence design. M7D1B creates no schema change, migration, cache, or canonical provider record.
