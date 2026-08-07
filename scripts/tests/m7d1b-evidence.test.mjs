import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decodePolyline6, percentile, validateFixture } from "../maps/m7d1b-live-evidence.mjs";

const fixturePath = fileURLToPath(new URL("../../docs/maps/fixtures/palestine-expanded-public-evidence.json", import.meta.url));
const corridorPath = fileURLToPath(new URL("../../docs/maps/fixtures/palestine-route-bakeoff.json", import.meta.url));
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const corridor = JSON.parse(await readFile(corridorPath, "utf8"));
const peliasResults = JSON.parse(await readFile(fileURLToPath(new URL("../../docs/maps/evidence/pelias-palestine-geocoding-results.json", import.meta.url)), "utf8"));
const photonResults = JSON.parse(await readFile(fileURLToPath(new URL("../../docs/maps/evidence/photon-palestine-geocoding-results.json", import.meta.url)), "utf8"));
const googleResults = JSON.parse(await readFile(fileURLToPath(new URL("../../docs/maps/evidence/google-palestine-geocoding-results.json", import.meta.url)), "utf8"));
const googleRoutes = JSON.parse(await readFile(fileURLToPath(new URL("../../docs/maps/evidence/google-palestine-route-results.json", import.meta.url)), "utf8"));
const peliasAdjudication = JSON.parse(await readFile(fileURLToPath(new URL("../../docs/maps/evidence/pelias-palestine-geocoding-adjudication.json", import.meta.url)), "utf8"));

test("M7D1B evidence fixture has 30 bilingual public locations and expanded routes", () => {
  assert.deepEqual(validateFixture(fixture), {
    pass: true,
    errors: [],
    location_count: 30,
    query_count: 60,
    route_count: 12,
    restriction_control_count: 3
  });
  assert.equal(fixture.classification.includes("user"), true);
  assert.equal(JSON.stringify(fixture).match(/phone|recipient|home address|current gps/gi), null);
});

test("Google evidence covers the unchanged corpus without retained provider coordinates", () => {
  assert.deepEqual([googleResults.query_count, googleResults.arabic.acceptable, googleResults.english.acceptable, googleResults.overall.acceptable], [60, 11, 10, 21]);
  assert.deepEqual(googleResults.failures, { AMBIGUOUS_RESULT: 4, WRONG_AREA: 4, WRONG_CAMPUS: 10, WRONG_LANDMARK: 21 });
  assert.equal(googleResults.successful_requests, 60);
  assert.equal(googleResults.failed_requests, 0);
  assert.equal(googleResults.methodology.google_coordinates_retained, false);
  assert.equal(googleResults.results.length, 60);
  for (const result of googleResults.results) {
    assert.deepEqual(Object.keys(result).filter((key) => /coordinate|latitude|longitude|place.?id/i.test(key)), []);
  }
});

test("Google optional routing records four unavailable routes without geometry", () => {
  assert.deepEqual([googleRoutes.request_count, googleRoutes.successful_requests, googleRoutes.failed_requests, googleRoutes.available_routes], [4, 4, 0, 0]);
  assert.equal(googleRoutes.methodology.google_geometry_retained, false);
  assert.equal(googleRoutes.results.every((result) => result.route_available === false && result.failure_reason === "NO_ROUTE"), true);
  assert.equal(JSON.stringify(googleRoutes).includes("encodedPolyline"), false);
});

test("corrected PPU and Bab Al-Zawiya corridor coordinates cannot regress", () => {
  const stops = Object.fromEntries(corridor.stops.map((stop) => [stop.id, stop]));
  assert.deepEqual([stops.ppu.latitude, stops.ppu.longitude], [31.5073157, 35.0908933]);
  assert.deepEqual([stops["bab-al-zawiya"].latitude, stops["bab-al-zawiya"].longitude], [31.5275134, 35.1018593]);
});

test("nearest-rank percentiles and polyline6 decoding are deterministic", () => {
  assert.equal(percentile([4, 1, 3, 2, 5], 0.5), 3);
  assert.equal(percentile([4, 1, 3, 2, 5], 0.95), 5);
  const points = decodePolyline6("_c`|t@_s~qfA_pR_pR");
  assert.equal(points.length, 2);
  assert.ok(points.every(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude)));
});

test("Pelias and Photon evidence covers the unchanged bilingual corpus", () => {
  assert.equal(Object.keys(peliasAdjudication.decisions).length, 60);
  assert.deepEqual([peliasResults.query_count, peliasResults.arabic.acceptable, peliasResults.english.acceptable, peliasResults.overall.acceptable], [60, 10, 15, 25]);
  assert.deepEqual([photonResults.query_count, photonResults.arabic.acceptable, photonResults.english.acceptable, photonResults.overall.acceptable], [60, 19, 26, 45]);
  for (const evidence of [peliasResults, photonResults]) {
    assert.equal(evidence.results.length, 60);
    assert.equal(evidence.methodology.exact_committed_queries, true);
    assert.equal(evidence.results.some((result) => result.acceptable === undefined || !result.fixture_id || !result.language), false);
  }
});
