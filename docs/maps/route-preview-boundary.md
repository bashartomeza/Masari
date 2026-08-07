# Protected route preview boundary

`POST /api/v1/admin/route-versions/:versionId/preview` accepts `expected_revision`, `ar|en`, `driving`, and two boolean avoidance options. It loads the current server-owned ordered stop memberships. Arbitrary coordinates, route labels, provider identifiers, URLs, callbacks, and extra fields are rejected.

`POST /api/v1/admin/route-versions/:versionId/stops/:stopId/geocode` accepts only the revision and locale. The stop must belong to the referenced editable draft. The original stored Arabic or English name is sent without silent translation.

Responses expose normalized geometry, encoding/precision, safe distance/duration, timestamp, provider label, attribution, checksum, and cache status to authorized route managers. They exclude secrets, raw provider traffic, internal cache keys, headers, trace/billing identifiers, and environment configuration.

Calculation is allowed only for draft preview and later publish validation/publication. It must never run per request, order, offer, reservation, Trip, map-open event, tracking event, or deterministic matching run. M7D1 does not persist preview geometry or render a map.
