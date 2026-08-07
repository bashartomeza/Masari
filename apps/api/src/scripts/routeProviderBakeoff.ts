import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FakeRouteProvider } from "../maps/fakeProvider.js";
import { GoogleRouteProvider, HereRouteProvider, MapboxRouteProvider, StadiaRouteProvider } from "../maps/liveProviders.js";
import { RouteProviderError, type RouteProvider } from "../maps/contracts.js";

type Fixture = { classification: string; service_region: string; stops: Array<{ id: string; name_ar: string; name_en: string; latitude: number; longitude: number }>; routes: Array<{ id: string; ordered_stop_ids: string[] }> };
const requested = process.argv.find((argument) => argument.startsWith("--provider="))?.slice("--provider=".length) ?? process.env.ROUTE_BAKEOFF_PROVIDER ?? "fake";
if (!["fake", "mapbox", "google", "here", "stadia"].includes(requested)) throw new Error("provider must be fake, mapbox, google, here, or stadia");
const secret = process.env.ROUTE_PROVIDER_SECRET;
if (requested !== "fake" && !secret) {
  process.stdout.write(JSON.stringify({
    provider: requested,
    classification: "NOT_EXECUTED",
    credential_available: false,
    reason: "credential_unavailable",
    sample_count: 0,
    successful_geocodes: 0,
    acceptable_geocodes: null,
    arabic_cases: 0,
    route_calls: 0,
    route_latency_p50_milliseconds: null,
    route_latency_p95_milliseconds: null,
    failures_by_category: {},
    human_route_review: "NOT_EXECUTED",
    storage_rights: "UNAPPROVED",
    attribution_review: "UNRESOLVED",
    privacy_telemetry_review: "UNRESOLVED",
    commercial_review: "UNRESOLVED"
  }, null, 2) + "\n");
  process.exit(2);
}
const httpOptions = { secret: secret ?? "unused-fake-secret", requestTimeoutMs: 4_000, maxRetries: 1 };
const provider: RouteProvider = requested === "fake" ? new FakeRouteProvider()
  : requested === "mapbox" ? new MapboxRouteProvider(httpOptions)
  : requested === "google" ? new GoogleRouteProvider(httpOptions)
  : requested === "here" ? new HereRouteProvider(httpOptions)
  : new StadiaRouteProvider(httpOptions);
const fixturePath = fileURLToPath(new URL("../../../../docs/maps/fixtures/palestine-route-bakeoff.json", import.meta.url));
const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
const stopById = new Map(fixture.stops.map((stop) => [stop.id, stop]));
const geocodeLatencies: number[] = [];
const routeLatencies: number[] = [];
const geocodes: Array<Record<string, unknown>> = [];
const routes: Array<Record<string, unknown>> = [];
async function timed<T>(latencies: number[], operation: () => Promise<T>) { const start = performance.now(); try { return await operation(); } finally { latencies.push(performance.now() - start); } }
for (const stop of fixture.stops) for (const locale of ["ar", "en"] as const) {
  try {
    const result = await timed(geocodeLatencies, () => provider.geocodeStop({ query: locale === "ar" ? stop.name_ar : stop.name_en, locale }));
    geocodes.push({ stop_id: stop.id, locale, status: "success", provider: result.provenance.provider, label_present: result.displayLabel.length > 0 });
  } catch (error) { geocodes.push({ stop_id: stop.id, locale, status: "failure", category: error instanceof RouteProviderError ? error.category : "unknown" }); }
}
for (const route of fixture.routes) {
  try {
    const result = await timed(routeLatencies, () => provider.calculateRoute({ routeVersionId: `bakeoff:${route.id}`, orderedStops: route.ordered_stop_ids.map((id) => { const stop = stopById.get(id)!; return { stopId: stop.id, coordinates: { latitude: stop.latitude, longitude: stop.longitude } }; }), profile: "driving", locale: "ar", options: { avoidTolls: false, avoidFerries: false } }));
    routes.push({ route_id: route.id, status: "success", geometry_encoding: result.geometryEncoding, encoded_geometry: result.encodedGeometry, distance_meters: result.distanceMeters, duration_seconds: result.durationSeconds, geometry_checksum: result.geometryChecksum, attribution: result.attribution });
  } catch (error) { routes.push({ route_id: route.id, status: "failure", category: error instanceof RouteProviderError ? error.category : "unknown" }); }
}
const successfulGeocodes = geocodes.filter((item) => item.status === "success").length;
const failures = [...geocodes, ...routes].filter((item) => item.status === "failure");
const failuresByCategory = Object.fromEntries([...new Set(failures.map((item) => String(item.category)))].sort().map((category) => [category, failures.filter((item) => item.category === category).length]));
function percentile(values: number[], fraction: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.ceil(sorted.length * fraction) - 1].toFixed(2));
}
const arabic = geocodes.filter((item) => item.locale === "ar");
process.stdout.write(JSON.stringify({
  provider: provider.id,
  classification: failures.length > 0 ? "FAIL" : "CONDITIONAL",
  evaluation_scope: provider.id === "fake" ? "ARCHITECTURE_ONLY" : "LIVE_PENDING_HUMAN_AND_RIGHTS_REVIEW",
  credential_available: provider.id === "fake" ? false : true,
  fixture_classification: fixture.classification,
  service_region: fixture.service_region,
  sample_count: geocodeLatencies.length + routeLatencies.length,
  successful_geocodes: successfulGeocodes,
  acceptable_geocodes: provider.id === "fake" ? successfulGeocodes : null,
  geocode_success_rate: geocodes.length ? successfulGeocodes / geocodes.length : null,
  arabic_cases: arabic.length,
  arabic_successes: arabic.filter((item) => item.status === "success").length,
  route_calls: routes.length,
  successful_route_calls: routes.filter((item) => item.status === "success").length,
  geocode_latency_p50_milliseconds: percentile(geocodeLatencies, 0.5),
  geocode_latency_p95_milliseconds: percentile(geocodeLatencies, 0.95),
  route_latency_p50_milliseconds: percentile(routeLatencies, 0.5),
  route_latency_p95_milliseconds: percentile(routeLatencies, 0.95),
  failures_by_category: failuresByCategory,
  methodology: { execution: "sequential", warm_cold_control: "uncontrolled", clock: "monotonic_performance_now", failures_included_in_sample_count: true },
  human_route_review: provider.id === "fake" ? "NOT_APPLICABLE" : "PENDING",
  storage_rights: "UNAPPROVED",
  attribution_review: "CONDITIONAL",
  privacy_telemetry_review: "UNRESOLVED",
  commercial_review: "UNRESOLVED",
  geocodes,
  routes
}, null, 2) + "\n");
