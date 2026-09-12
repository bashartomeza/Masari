import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const fixturePath = fileURLToPath(new URL("../../docs/maps/fixtures/palestine-expanded-public-evidence.json", import.meta.url));
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const outputPath = process.argv.find((value) => value.startsWith("--output="))?.slice(9);
const existingPath = process.argv.find((value) => value.startsWith("--existing="))?.slice(11);
const adjudicationPath = process.argv.find((value) => value.startsWith("--adjudication="))?.slice(15);
const apiKey = process.env.GOOGLE_MAPS_DEMO_KEY;
const timeoutMs = Number(process.env.M7D1B_REQUEST_TIMEOUT_MS ?? 10_000);
const candidateLimit = 5;

if (!existingPath && !apiKey) throw new Error("GOOGLE_MAPS_DEMO_KEY is unavailable");
if (!outputPath) throw new Error("--output is required");

const endpoint = "https://places.googleapis.com/v1/places:searchText";
const fieldMask = "places.id,places.displayName,places.formattedAddress,places.location,places.types";

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] : null;
}

function queryText(query) {
  return query.q ?? `${query.city}, ${query.country}`;
}

function requestBody(query, language) {
  return {
    textQuery: queryText(query),
    languageCode: language,
    regionCode: "PS",
    pageSize: candidateLimit,
    locationBias: {
      rectangle: {
        low: { latitude: 31.3, longitude: 34.85 },
        high: { latitude: 32.6, longitude: 35.65 }
      }
    }
  };
}

function inFixtureArea(location, place) {
  const latitude = place?.location?.latitude;
  const longitude = place?.location?.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const [south, north, west, east] = location.bbox;
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
}

function normalizeCandidate(location, place, index) {
  return {
    candidate_rank: index + 1,
    place_id: place.id ?? null,
    display_name: place.displayName?.text ?? null,
    formatted_public_address: place.formattedAddress ?? null,
    types: place.types ?? [],
    expected_city_area_match: inFixtureArea(location, place),
    correct_public_concept: null
  };
}

async function search(location, language) {
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
      body: JSON.stringify(requestBody(location.queries[language], language))
    });
    const latencyMs = performance.now() - started;
    if (!response.ok) {
      return {
        fixture_id: location.id,
        fixture_kind: location.kind,
        language,
        text_search_http_success: false,
        candidates: [],
        correct_candidate_rank: null,
        top_1_acceptable: false,
        top_n_acceptable: false,
        failure_category: "NO_RESULT",
        request_failure_reason: `HTTP_${response.status}`,
        latency_ms: latencyMs
      };
    }
    const payload = await response.json();
    return {
      fixture_id: location.id,
      fixture_kind: location.kind,
      language,
      text_search_http_success: true,
      candidates: (payload.places ?? []).slice(0, candidateLimit).map((place, index) => normalizeCandidate(location, place, index)),
      correct_candidate_rank: null,
      top_1_acceptable: null,
      top_n_acceptable: null,
      failure_category: null,
      request_failure_reason: null,
      latency_ms: latencyMs
    };
  } catch (error) {
    return {
      fixture_id: location.id,
      fixture_kind: location.kind,
      language,
      text_search_http_success: false,
      candidates: [],
      correct_candidate_rank: null,
      top_1_acceptable: false,
      top_n_acceptable: false,
      failure_category: "NO_RESULT",
      request_failure_reason: error?.name === "AbortError" ? "TIMEOUT" : "TRANSPORT_ERROR",
      latency_ms: performance.now() - started
    };
  } finally {
    clearTimeout(timer);
  }
}

const results = existingPath ? JSON.parse(await readFile(existingPath, "utf8")).results : [];
if (!existingPath) {
  for (const location of fixture.geocode_locations) {
    for (const language of ["ar", "en"]) results.push(await search(location, language));
  }
}

if (adjudicationPath) {
  const adjudication = JSON.parse(await readFile(adjudicationPath, "utf8"));
  for (const result of results) {
    const key = `${result.fixture_id}/${result.language}`;
    const decision = adjudication.decisions[key];
    if (!decision) throw new Error(`missing Places adjudication for ${key}`);
    result.correct_candidate_rank = decision.correct_candidate_rank;
    result.top_1_acceptable = decision.correct_candidate_rank === 1;
    result.top_n_acceptable = Number.isInteger(decision.correct_candidate_rank) && decision.correct_candidate_rank <= candidateLimit;
    result.failure_category = result.top_1_acceptable ? null : (result.top_n_acceptable ? "RANKING_ISSUE" : decision.failure_category);
    result.adjudication = "documented_independent_public_concept_review";
    for (const candidate of result.candidates) candidate.correct_public_concept = candidate.candidate_rank === decision.correct_candidate_rank;
  }
}

const summarize = (items, field) => ({
  acceptable: items.filter((item) => item[field] === true).length,
  total: items.length,
  percentage: 100 * items.filter((item) => item[field] === true).length / items.length
});
const failed = results.filter((item) => item.top_1_acceptable === false);
const failureCategories = Object.fromEntries([...new Set(failed.map((item) => item.failure_category))].filter(Boolean).sort().map((category) => [category, failed.filter((item) => item.failure_category === category).length]));
const latencies = results.map((item) => item.latency_ms);
const evidence = {
  provider: "google-places-text-search-new",
  evidence_classification: "GOOGLE_PLACES_TEXT_SEARCH_EVIDENCE",
  fixture_classification: fixture.classification,
  query_count: results.length,
  methodology: {
    exact_committed_queries: true,
    primary_acceptance_rule: "correct intended public concept at rank 1",
    secondary_top_n_rule: `correct intended public concept within ranks 1-${candidateLimit}`,
    candidate_limit: candidateLimit,
    pagination: false,
    normal_relevance_ranking: true,
    language_code_per_fixture: true,
    region_code: "PS",
    regional_location_bias: [34.85, 31.3, 35.65, 32.6],
    field_masked: true,
    requested_fields: ["places.id", "places.displayName", "places.formattedAddress", "places.location", "places.types"],
    excluded_content: ["reviews", "ratings", "phone_numbers", "photos", "opening_hours", "user_generated_content"],
    authentication: "X-Goog-Api-Key header",
    clock: "performance.now monotonic",
    raw_responses_retained: false,
    google_coordinates_retained: false,
    canonical_persistence: false,
    adjudication: adjudicationPath ? "complete independent review" : "pending"
  },
  first_useful_request_ms: results.find((item) => item.text_search_http_success && item.candidates.length)?.latency_ms ?? null,
  total_attempted: results.length,
  successful_requests: results.filter((item) => item.text_search_http_success).length,
  failed_requests: results.filter((item) => !item.text_search_http_success).length,
  top_1: {
    arabic: summarize(results.filter((item) => item.language === "ar"), "top_1_acceptable"),
    english: summarize(results.filter((item) => item.language === "en"), "top_1_acceptable"),
    overall: summarize(results, "top_1_acceptable")
  },
  top_n: {
    arabic: summarize(results.filter((item) => item.language === "ar"), "top_n_acceptable"),
    english: summarize(results.filter((item) => item.language === "en"), "top_n_acceptable"),
    overall: summarize(results, "top_n_acceptable")
  },
  failures: failureCategories,
  latency_ms: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) },
  results
};

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
process.stdout.write(`GOOGLE_PLACES_QUERY_COUNT=${evidence.query_count}\nGOOGLE_PLACES_REQUESTS_SUCCESSFUL=${evidence.successful_requests}\nGOOGLE_PLACES_REQUESTS_FAILED=${evidence.failed_requests}\n`);
