import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const fixturePath = fileURLToPath(new URL("../../docs/maps/fixtures/palestine-expanded-public-evidence.json", import.meta.url));
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const outputPath = process.argv.find((value) => value.startsWith("--output="))?.slice(9);
const existingPath = process.argv.find((value) => value.startsWith("--existing="))?.slice(11);
const adjudicationPath = process.argv.find((value) => value.startsWith("--adjudication="))?.slice(15);
const apiKey = process.env.GOOGLE_MAPS_DEMO_KEY;
const timeoutMs = Number(process.env.M7D1B_REQUEST_TIMEOUT_MS ?? 10_000);

if (!existingPath && !apiKey) throw new Error("GOOGLE_MAPS_DEMO_KEY is unavailable");
if (!outputPath) throw new Error("--output is required");

const endpoint = "https://geocode.googleapis.com/v4/geocode/address";
const fieldMask = [
  "results.location",
  "results.formattedAddress",
  "results.types",
  "results.addressComponents.longText",
  "results.addressComponents.types"
].join(",");

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] : null;
}

function queryText(query) {
  return query.q ?? `${query.city}, ${query.country}`;
}

function requestUrl(query, language) {
  const url = new URL(`${endpoint}/${encodeURIComponent(queryText(query))}`);
  url.searchParams.set("languageCode", language);
  url.searchParams.set("regionCode", "PS");
  url.searchParams.set("locationBias.rectangle.low.latitude", "31.3");
  url.searchParams.set("locationBias.rectangle.low.longitude", "34.85");
  url.searchParams.set("locationBias.rectangle.high.latitude", "32.6");
  url.searchParams.set("locationBias.rectangle.high.longitude", "35.65");
  return url;
}

function withinFixtureArea(location, result) {
  const latitude = result?.location?.latitude;
  const longitude = result?.location?.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const [south, north, west, east] = location.bbox;
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
}

function hasSemanticType(location, result) {
  const types = new Set(result?.types ?? []);
  const byKind = {
    city: ["locality", "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3"],
    university: ["university", "school", "point_of_interest", "establishment"],
    landmark: ["tourist_attraction", "museum", "church", "mosque", "place_of_worship", "zoo", "performing_arts_theater", "point_of_interest", "establishment"],
    public_building: ["city_hall", "local_government_office", "community_center", "point_of_interest", "establishment"],
    route_stop: ["route", "point_of_interest", "establishment"]
  };
  return (byKind[location.kind] ?? []).some((type) => types.has(type));
}

function failureFor(location, areaMatch, result) {
  if (!result) return "NO_RESULT";
  if (location.kind === "city") return areaMatch ? "WRONG_CITY" : "WRONG_AREA";
  if (location.kind === "university") return areaMatch ? "WRONG_CAMPUS" : "WRONG_AREA";
  if (location.kind === "route_stop") return areaMatch ? "AMBIGUOUS_RESULT" : "WRONG_AREA";
  return areaMatch ? "WRONG_LANDMARK" : "WRONG_AREA";
}

async function geocode(location, language) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(requestUrl(location.queries[language], language), {
      signal: controller.signal,
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      }
    });
    const latencyMs = performance.now() - started;
    if (!response.ok) {
      return {
        fixture_id: location.id,
        language,
        api_request_success: false,
        returned_public_place_label: null,
        expected_city_area_match: false,
        acceptable: false,
        candidate_rank: null,
        failure_category: "NO_RESULT",
        request_failure_reason: `HTTP_${response.status}`,
        latency_ms: latencyMs
      };
    }
    const payload = await response.json();
    const top = payload.results?.[0] ?? null;
    const areaMatch = withinFixtureArea(location, top);
    const acceptable = areaMatch && hasSemanticType(location, top);
    return {
      fixture_id: location.id,
      language,
      api_request_success: true,
      returned_public_place_label: top?.formattedAddress ?? null,
      expected_city_area_match: areaMatch,
      acceptable,
      candidate_rank: top ? 1 : null,
      failure_category: acceptable ? null : failureFor(location, areaMatch, top),
      request_failure_reason: null,
      latency_ms: latencyMs
    };
  } catch (error) {
    return {
      fixture_id: location.id,
      language,
      api_request_success: false,
      returned_public_place_label: null,
      expected_city_area_match: false,
      acceptable: false,
      candidate_rank: null,
      failure_category: "NO_RESULT",
      request_failure_reason: error?.name === "AbortError" ? "TIMEOUT" : "TRANSPORT_ERROR",
      latency_ms: performance.now() - started
    };
  } finally {
    clearTimeout(timer);
  }
}

const results = existingPath
  ? JSON.parse(await readFile(existingPath, "utf8")).results
  : [];
if (!existingPath) {
  for (const location of fixture.geocode_locations) {
    for (const language of ["ar", "en"]) results.push(await geocode(location, language));
  }
}

if (adjudicationPath) {
  const adjudication = JSON.parse(await readFile(adjudicationPath, "utf8"));
  for (const result of results) {
    const decision = adjudication.overrides[`${result.fixture_id}/${result.language}`];
    if (!decision) continue;
    result.acceptable = decision.acceptable;
    result.failure_category = decision.acceptable ? null : decision.failure_category;
    result.adjudication = "documented_functional_review";
  }
}

const summarize = (items) => ({
  acceptable: items.filter((item) => item.acceptable).length,
  total: items.length,
  percentage: 100 * items.filter((item) => item.acceptable).length / items.length
});
const failed = results.filter((item) => !item.acceptable);
const failureCategories = Object.fromEntries([...new Set(failed.map((item) => item.failure_category))].sort().map((category) => [category, failed.filter((item) => item.failure_category === category).length]));
const latencies = results.map((item) => item.latency_ms);
const evidence = {
  provider: "google-geocoding-v4",
  fixture_classification: fixture.classification,
  query_count: results.length,
  methodology: {
    exact_committed_queries: true,
    top_result_only: true,
    language_code_per_fixture: true,
    region_code: "PS",
    regional_location_bias: [34.85, 31.3, 35.65, 32.6],
    field_masked: true,
    authentication: "X-Goog-Api-Key header",
    timeout_ms: timeoutMs,
    clock: "performance.now monotonic",
    raw_responses_retained: false,
    google_coordinates_retained: false,
    adjudication: adjudicationPath ? "documented functional public-place review; scoring only" : "automated bbox and provider-type review"
  },
  first_useful_request_ms: results.find((item) => item.api_request_success && item.returned_public_place_label)?.latency_ms ?? null,
  total_attempted: results.length,
  successful_requests: results.filter((item) => item.api_request_success).length,
  failed_requests: results.filter((item) => !item.api_request_success).length,
  arabic: summarize(results.filter((item) => item.language === "ar")),
  english: summarize(results.filter((item) => item.language === "en")),
  overall: summarize(results),
  failures: failureCategories,
  latency_ms: {
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95)
  },
  results
};

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
process.stdout.write(`GOOGLE_QUERY_COUNT=${evidence.query_count}\nGOOGLE_REQUESTS_SUCCESSFUL=${evidence.successful_requests}\nGOOGLE_REQUESTS_FAILED=${evidence.failed_requests}\n`);
