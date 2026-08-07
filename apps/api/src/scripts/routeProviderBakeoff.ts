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
  process.stdout.write(JSON.stringify({ provider: requested, classification: "NOT_EXECUTED", reason: "credential_unavailable" }, null, 2) + "\n");
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
const latencies: number[] = [];
const geocodes: Array<Record<string, unknown>> = [];
const routes: Array<Record<string, unknown>> = [];
async function timed<T>(operation: () => Promise<T>) { const start = performance.now(); try { return await operation(); } finally { latencies.push(performance.now() - start); } }
for (const stop of fixture.stops) for (const locale of ["ar", "en"] as const) {
  try {
    const result = await timed(() => provider.geocodeStop({ query: locale === "ar" ? stop.name_ar : stop.name_en, locale }));
    geocodes.push({ stop_id: stop.id, locale, status: "success", provider: result.provenance.provider, label_present: result.displayLabel.length > 0 });
  } catch (error) { geocodes.push({ stop_id: stop.id, locale, status: "failure", category: error instanceof RouteProviderError ? error.category : "unknown" }); }
}
for (const route of fixture.routes) {
  try {
    const result = await timed(() => provider.calculateRoute({ routeVersionId: `bakeoff:${route.id}`, orderedStops: route.ordered_stop_ids.map((id) => { const stop = stopById.get(id)!; return { stopId: stop.id, coordinates: { latitude: stop.latitude, longitude: stop.longitude } }; }), profile: "driving", locale: "ar", options: { avoidTolls: false, avoidFerries: false } }));
    routes.push({ route_id: route.id, status: "success", geometry_encoding: result.geometryEncoding, encoded_geometry: result.encodedGeometry, distance_meters: result.distanceMeters, duration_seconds: result.durationSeconds, geometry_checksum: result.geometryChecksum, attribution: result.attribution });
  } catch (error) { routes.push({ route_id: route.id, status: "failure", category: error instanceof RouteProviderError ? error.category : "unknown" }); }
}
const successfulGeocodes = geocodes.filter((item) => item.status === "success").length;
const sorted = [...latencies].sort((a, b) => a - b); const p95 = sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
process.stdout.write(JSON.stringify({ provider: provider.id, fixture_classification: fixture.classification, service_region: fixture.service_region, methodology: { execution: "sequential-cold-and-warm-uncontrolled", samples: latencies.length, failures: geocodes.filter((item) => item.status === "failure").length + routes.filter((item) => item.status === "failure").length }, geocode_success_rate: geocodes.length ? successfulGeocodes / geocodes.length : 0, p95_milliseconds: Number(p95.toFixed(2)), geocodes, routes }, null, 2) + "\n");
