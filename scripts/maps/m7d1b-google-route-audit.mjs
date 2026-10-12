import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const fixturePath = fileURLToPath(new URL("../../docs/maps/fixtures/palestine-expanded-public-evidence.json", import.meta.url));
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const outputPath = process.argv.find((value) => value.startsWith("--output="))?.slice(9);
const mode = process.argv.find((value) => value.startsWith("--mode="))?.slice(7);
const placesPath = process.argv.find((value) => value.startsWith("--places="))?.slice(9);
const apiKey = process.env.GOOGLE_MAPS_DEMO_KEY;
const timeoutMs = Number(process.env.M7D1B_REQUEST_TIMEOUT_MS ?? 15_000);

if (!apiKey) throw new Error("GOOGLE_MAPS_DEMO_KEY is unavailable");
if (!outputPath) throw new Error("--output is required");
if (!["minimal-control", "prior-mask-control", "coordinate-matrix", "place-id-control", "place-id-matrix"].includes(mode)) throw new Error("unsupported --mode");
if (["place-id-control", "place-id-matrix"].includes(mode) && !placesPath) throw new Error("--places is required for Place-ID modes");

const endpoint = "https://routes.googleapis.com/directions/v2:computeRoutes";
const geometryFieldMask = "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline";
const priorFieldMask = "routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters";
const definitions = [
  { id: "hebron-bethlehem", ordered_location_ids: ["hebron-center", "bethlehem-center"] },
  { id: "ppu-bethlehem", ordered_location_ids: ["ppu-main", "bethlehem-center"] },
  { id: "bab-al-zawiya-bethlehem", ordered_location_ids: ["bab-al-zawiya", "bethlehem-center"] },
  { id: "ppu-bab-al-zawiya-bethlehem", ordered_location_ids: ["ppu-main", "bab-al-zawiya", "bethlehem-center"] }
];

function coordinateWaypoint(locationId) {
  const [latitude, longitude] = fixture.route_locations[locationId];
  return { location: { latLng: { latitude, longitude } } };
}

function decodePolyline5(encoded) {
  const points = [];
  let latitude = 0;
  let longitude = 0;
  let index = 0;
  while (index < encoded.length) {
    const deltas = [];
    for (let coordinate = 0; coordinate < 2; coordinate++) {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        if (index >= encoded.length) throw new Error("truncated polyline");
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      deltas.push(result & 1 ? ~(result >> 1) : result >> 1);
    }
    latitude += deltas[0];
    longitude += deltas[1];
    points.push([latitude / 1e5, longitude / 1e5]);
  }
  return points;
}

function haversineMeters(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b[0] - a[0]);
  const dLon = radians(b[1] - a[1]);
  const lat1 = radians(a[0]);
  const lat2 = radians(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function geometryReview(encoded, orderedLocationIds) {
  if (!encoded) return { valid: false, decoded_point_count: 0, waypoint_order_preserved: false, endpoint_snap_meters: null };
  try {
    const points = decodePolyline5(encoded);
    const fixturePoints = orderedLocationIds.map((id) => fixture.route_locations[id]);
    const nearest = fixturePoints.map((target) => {
      let bestIndex = -1;
      let bestDistance = Infinity;
      for (let index = 0; index < points.length; index++) {
        const distance = haversineMeters(target, points[index]);
        if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
      }
      return { index: bestIndex, distance: bestDistance };
    });
    return {
      valid: points.length >= 2 && points.every(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude)),
      decoded_point_count: points.length,
      waypoint_order_preserved: nearest.every((item, index) => index === 0 || item.index >= nearest[index - 1].index),
      endpoint_snap_meters: [nearest[0]?.distance ?? null, nearest.at(-1)?.distance ?? null],
      intermediate_snap_meters: nearest.slice(1, -1).map((item) => item.distance)
    };
  } catch {
    return { valid: false, decoded_point_count: 0, waypoint_order_preserved: false, endpoint_snap_meters: null };
  }
}

function seconds(value) {
  const match = /^(\d+(?:\.\d+)?)s$/.exec(value ?? "");
  return match ? Number(match[1]) : null;
}

async function placeIdWaypoints() {
  const evidence = JSON.parse(await readFile(placesPath, "utf8"));
  const fixtureQuery = {
    "hebron-center": "hebron/en",
    "bethlehem-center": "bethlehem/en",
    "ppu-main": "ppu-main/en",
    "bab-al-zawiya": "bab-al-zawiya/en"
  };
  const resultByKey = Object.fromEntries(evidence.results.map((result) => [`${result.fixture_id}/${result.language}`, result]));
  return Object.fromEntries(Object.entries(fixtureQuery).map(([locationId, queryKey]) => {
    const result = resultByKey[queryKey];
    const candidate = result?.candidates.find((item) => item.correct_public_concept === true);
    if (!candidate?.place_id) throw new Error(`no adjudicated Place ID for ${queryKey}`);
    return [locationId, { placeId: candidate.place_id }];
  }));
}

const placeWaypoints = ["place-id-control", "place-id-matrix"].includes(mode) ? await placeIdWaypoints() : null;

async function compute(definition) {
  const locations = definition.ordered_location_ids;
  const waypoint = (locationId) => placeWaypoints?.[locationId] ?? coordinateWaypoint(locationId);
  const body = {
    origin: waypoint(locations[0]),
    destination: waypoint(locations.at(-1)),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE"
  };
  if (locations.length > 2) body.intermediates = locations.slice(1, -1).map(waypoint);
  const fieldMask = mode === "prior-mask-control" ? priorFieldMask : geometryFieldMask;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fieldMask },
      body: JSON.stringify(body)
    });
    const latencyMs = performance.now() - started;
    const payload = await response.json().catch(() => ({}));
    const route = payload.routes?.[0] ?? null;
    const geometry = geometryReview(route?.polyline?.encodedPolyline, locations);
    const routeCount = payload.routes?.length ?? 0;
    return {
      fixture_id: definition.id,
      waypoint_representation: placeWaypoints ? "PLACE_ID" : "COORDINATE_LOCATION_LATLNG",
      http_success: response.ok,
      http_status: response.status,
      response_top_level_fields: Object.keys(payload).sort(),
      safe_error_code: payload.error?.code ?? null,
      safe_error_status: payload.error?.status ?? null,
      routes_array_count: routeCount,
      distance_meters: route?.distanceMeters ?? null,
      duration_seconds: seconds(route?.duration),
      decoded_geometry_valid: geometry.valid,
      decoded_point_count: geometry.decoded_point_count,
      waypoint_order: locations,
      waypoint_order_preserved: geometry.waypoint_order_preserved,
      endpoint_snap_meters: geometry.endpoint_snap_meters,
      intermediate_snap_meters: geometry.intermediate_snap_meters ?? [],
      latency_ms: latencyMs,
      failure_category: !response.ok ? "API_ERROR" : routeCount === 0 ? "NO_ROUTE" : geometry.valid && geometry.waypoint_order_preserved ? null : "INVALID_GEOMETRY"
    };
  } catch (error) {
    return {
      fixture_id: definition.id,
      waypoint_representation: placeWaypoints ? "PLACE_ID" : "COORDINATE_LOCATION_LATLNG",
      http_success: false,
      http_status: null,
      response_top_level_fields: [],
      safe_error_code: null,
      safe_error_status: null,
      routes_array_count: 0,
      distance_meters: null,
      duration_seconds: null,
      decoded_geometry_valid: false,
      decoded_point_count: 0,
      waypoint_order: locations,
      waypoint_order_preserved: false,
      endpoint_snap_meters: null,
      intermediate_snap_meters: [],
      latency_ms: performance.now() - started,
      failure_category: error?.name === "AbortError" ? "TIMEOUT" : "TRANSPORT_ERROR"
    };
  } finally {
    clearTimeout(timer);
  }
}

const selected = ["minimal-control", "prior-mask-control", "place-id-control"].includes(mode) ? definitions.slice(0, 1) : definitions;
const results = [];
for (const definition of selected) results.push(await compute(definition));
const evidence = {
  provider: "google-routes-v2",
  audit_mode: mode,
  request_count: results.length,
  methodology: {
    corrected_public_fixture_coordinates: true,
    travel_mode: "DRIVE",
    routing_preference: "TRAFFIC_UNAWARE",
    normal_stopover_intermediates: true,
    waypoint_optimization: false,
    modifiers: false,
    heading: false,
    side_of_road: false,
    departure_time: false,
    field_mask: mode === "prior-mask-control" ? priorFieldMask : geometryFieldMask,
    raw_responses_retained: false,
    encoded_polylines_retained: false,
    canonical_persistence: false
  },
  results
};

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
process.stdout.write(`GOOGLE_ROUTE_AUDIT_MODE=${mode}\nGOOGLE_ROUTE_AUDIT_REQUESTS=${results.length}\nGOOGLE_ROUTE_AUDIT_ROUTES=${results.reduce((sum, result) => sum + result.routes_array_count, 0)}\n`);
