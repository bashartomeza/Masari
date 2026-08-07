import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const fixturePath = fileURLToPath(new URL("../../docs/maps/fixtures/palestine-expanded-public-evidence.json", import.meta.url));
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const outputPath = process.argv.find((value) => value.startsWith("--output="))?.slice(9);
const apiKey = process.env.GOOGLE_MAPS_DEMO_KEY;
const timeoutMs = Number(process.env.M7D1B_REQUEST_TIMEOUT_MS ?? 15_000);

if (!apiKey) throw new Error("GOOGLE_MAPS_DEMO_KEY is unavailable");
if (!outputPath) throw new Error("--output is required");

const endpoint = "https://routes.googleapis.com/directions/v2:computeRoutes";
const fieldMask = "routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters";
const definitions = [
  { id: "hebron-bethlehem", ordered_location_ids: ["hebron-center", "bethlehem-center"], valhalla_distance_meters: 28163, valhalla_duration_seconds: 2342.147 },
  { id: "ppu-bethlehem", ordered_location_ids: ["ppu-main", "bethlehem-center"], valhalla_distance_meters: 36440, valhalla_duration_seconds: 2695.820 },
  { id: "bab-al-zawiya-bethlehem", ordered_location_ids: ["bab-al-zawiya", "bethlehem-center"], valhalla_distance_meters: 28786, valhalla_duration_seconds: 2400.186 },
  { id: "ppu-bab-al-zawiya-bethlehem", ordered_location_ids: ["ppu-main", "bab-al-zawiya", "bethlehem-center"], valhalla_distance_meters: 32964, valhalla_duration_seconds: 2952.371 }
];

function waypoint(locationId) {
  const [latitude, longitude] = fixture.route_locations[locationId];
  return { location: { latLng: { latitude, longitude } } };
}

function seconds(value) {
  const match = /^(\d+(?:\.\d+)?)s$/.exec(value ?? "");
  return match ? Number(match[1]) : null;
}

async function compute(definition) {
  const locations = definition.ordered_location_ids;
  const body = {
    origin: waypoint(locations[0]),
    destination: waypoint(locations.at(-1)),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
    computeAlternativeRoutes: false
  };
  if (locations.length > 2) body.intermediates = locations.slice(1, -1).map(waypoint);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      },
      body: JSON.stringify(body)
    });
    const latencyMs = performance.now() - started;
    if (!response.ok) {
      return {
        fixture_id: definition.id,
        api_request_success: false,
        route_available: false,
        distance_meters: null,
        duration_seconds: null,
        latency_ms: latencyMs,
        waypoint_order: locations,
        structural_plausibility: "NOT_EXECUTED",
        failure_reason: `HTTP_${response.status}`
      };
    }
    const payload = await response.json();
    const route = payload.routes?.[0] ?? null;
    const durationSeconds = seconds(route?.duration);
    const legs = route?.legs ?? [];
    const plausible = Number.isFinite(route?.distanceMeters)
      && route.distanceMeters > 0
      && Number.isFinite(durationSeconds)
      && durationSeconds > 0
      && legs.length === locations.length - 1
      && legs.every((leg) => leg.distanceMeters > 0 && seconds(leg.duration) > 0);
    return {
      fixture_id: definition.id,
      api_request_success: true,
      route_available: Boolean(route),
      distance_meters: route?.distanceMeters ?? null,
      duration_seconds: durationSeconds,
      latency_ms: latencyMs,
      waypoint_order: locations,
      structural_plausibility: plausible ? "PASS" : "FAIL",
      failure_reason: plausible ? null : (route ? "STRUCTURAL_RESPONSE_MISMATCH" : "NO_ROUTE"),
      valhalla_comparison: {
        distance_meters: definition.valhalla_distance_meters,
        duration_seconds: definition.valhalla_duration_seconds,
        distance_delta_percent: Number.isFinite(route?.distanceMeters) ? 100 * (route.distanceMeters - definition.valhalla_distance_meters) / definition.valhalla_distance_meters : null,
        duration_delta_percent: Number.isFinite(durationSeconds) ? 100 * (durationSeconds - definition.valhalla_duration_seconds) / definition.valhalla_duration_seconds : null
      }
    };
  } catch (error) {
    return {
      fixture_id: definition.id,
      api_request_success: false,
      route_available: false,
      distance_meters: null,
      duration_seconds: null,
      latency_ms: performance.now() - started,
      waypoint_order: locations,
      structural_plausibility: "NOT_EXECUTED",
      failure_reason: error?.name === "AbortError" ? "TIMEOUT" : "TRANSPORT_ERROR"
    };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const definition of definitions) results.push(await compute(definition));
const evidence = {
  provider: "google-routes-v2",
  request_count: results.length,
  successful_requests: results.filter((result) => result.api_request_success).length,
  failed_requests: results.filter((result) => !result.api_request_success).length,
  available_routes: results.filter((result) => result.route_available).length,
  methodology: {
    exact_reviewed_public_coordinates: true,
    travel_mode: "DRIVE",
    routing_preference: "TRAFFIC_UNAWARE",
    field_masked: true,
    authentication: "X-Goog-Api-Key header",
    clock: "performance.now monotonic",
    raw_responses_retained: false,
    google_geometry_retained: false,
    canonical_persistence: false
  },
  results
};

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
process.stdout.write(`GOOGLE_ROUTE_REQUEST_COUNT=${evidence.request_count}\nGOOGLE_ROUTE_REQUESTS_SUCCESSFUL=${evidence.successful_requests}\nGOOGLE_ROUTE_REQUESTS_FAILED=${evidence.failed_requests}\n`);
