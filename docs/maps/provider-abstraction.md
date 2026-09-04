# M7D1 provider abstraction

M7D1 keeps canonical route planning behind the `RouteProvider` interface. `geocodeStop` accepts one bounded bilingual canonical-stop label and `calculateRoute` accepts an ordered server-owned stop list, a `driving` profile, locale, route-version identity, and allowlisted avoidance flags. Provider response objects never leave adapters.

The adapters use reviewed fixed HTTPS origins only: Mapbox Geocoding v6/Directions v5, Google Geocoding v3/Routes v2, HERE Geocoding v1/Routing v8, and Stadia Pelias-compatible geocoding/Valhalla routing. MapLibre is a renderer, not a routing or geocoding service; “Stadia/MapLibre” means Stadia-hosted APIs with a possible later MapLibre renderer.

`ROUTE_MAPS_ENABLED=false` and `ROUTE_PROVIDER=disabled` are defaults. Selection is explicit and has no fallback. `fake` is allowed only outside staging/production. Live providers require one server-side secret. Unknown providers and inconsistent flags fail configuration parsing.

The fake is deterministic, offline, Arabic/English capable, and supports timeout, rate-limit, quota, authorization, unavailable, and malformed-response scenarios. It is CI evidence, never production evidence.
