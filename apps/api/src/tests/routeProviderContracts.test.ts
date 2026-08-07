import { describe, expect, it } from "vitest";
import { RoutePreviewCache } from "../maps/cache.js";
import { FakeRouteProvider, type FakeProviderScenario } from "../maps/fakeProvider.js";
import { geometryChecksum, routeInputChecksum, RouteProviderError, type RouteCalculationInput } from "../maps/contracts.js";

const input: RouteCalculationInput = {
  routeVersionId: "version_1",
  orderedStops: [
    { stopId: "hebron", coordinates: { latitude: 31.5326, longitude: 35.0998 } },
    { stopId: "bethlehem", coordinates: { latitude: 31.7054, longitude: 35.2024 } }
  ],
  profile: "driving",
  locale: "ar",
  options: { avoidTolls: false, avoidFerries: false }
};

describe("M7D1 provider-neutral route contract", () => {
  it("returns deterministic Arabic and English fake geocodes", async () => {
    const provider = new FakeRouteProvider();
    expect((await provider.geocodeStop({ query: "الخليل", locale: "ar" })).coordinates.latitude).toBe(31.5326);
    expect((await provider.geocodeStop({ query: "Palestine Polytechnic University", locale: "en" })).category).toBe("university");
  });

  it("returns deterministic route geometry, distance, duration, and checksums", async () => {
    const provider = new FakeRouteProvider();
    expect(await provider.calculateRoute(input)).toEqual(await provider.calculateRoute(input));
  });

  it.each<[FakeProviderScenario, string]>([
    ["timeout", "provider_timeout"], ["rate_limit", "provider_rate_limited"], ["quota", "provider_quota_exhausted"],
    ["unauthorized", "provider_unauthorized"], ["unavailable", "provider_unavailable"], ["malformed", "malformed_provider_response"]
  ])("normalizes fake scenario %s", async (scenario, category) => {
    await expect(new FakeRouteProvider(scenario).calculateRoute(input)).rejects.toMatchObject({ category });
  });

  it("rejects duplicate stops, non-finite values, and out-of-range coordinates", async () => {
    const provider = new FakeRouteProvider();
    for (const invalid of [
      { ...input, orderedStops: [input.orderedStops[0], input.orderedStops[0]] },
      { ...input, orderedStops: [{ ...input.orderedStops[0], coordinates: { latitude: Number.NaN, longitude: 35 } }, input.orderedStops[1]] },
      { ...input, orderedStops: [{ ...input.orderedStops[0], coordinates: { latitude: 91, longitude: 35 } }, input.orderedStops[1]] },
      { ...input, orderedStops: [{ ...input.orderedStops[0], coordinates: { latitude: 31, longitude: 181 } }, input.orderedStops[1]] }
    ]) await expect(provider.calculateRoute(invalid)).rejects.toBeInstanceOf(RouteProviderError);
  });

  it("changes the input checksum for provider, stop order, profile-relevant options, or coordinates", () => {
    const original = routeInputChecksum(input, "fake");
    expect(routeInputChecksum(input, "mapbox")).not.toBe(original);
    expect(routeInputChecksum({ ...input, orderedStops: [...input.orderedStops].reverse() }, "fake")).not.toBe(original);
    expect(routeInputChecksum({ ...input, options: { ...input.options, avoidTolls: true } }, "fake")).not.toBe(original);
    expect(routeInputChecksum({ ...input, orderedStops: [{ ...input.orderedStops[0], coordinates: { latitude: 31.6, longitude: 35.1 } }, input.orderedStops[1]] }, "fake")).not.toBe(original);
  });

  it("keeps canonical geometry checksum stable and changes material fields", () => {
    const record = { routeVersionId: "v1", orderedStopInputChecksum: "a".repeat(64), provider: "mapbox" as const, profile: "driving" as const, apiVersion: "v5", geometryEncoding: "polyline6" as const, geometryPrecision: 6 as const, encodedGeometry: "abc", distanceMeters: 10, durationSeconds: 20 };
    expect(geometryChecksum(record)).toBe(geometryChecksum({ ...record }));
    for (const changed of [{ ...record, encodedGeometry: "abd" }, { ...record, provider: "google" as const }, { ...record, distanceMeters: 11 }, { ...record, durationSeconds: 21 }]) expect(geometryChecksum(changed)).not.toBe(geometryChecksum(record));
  });

  it("handles cache miss, hit, provider/input changes, expiry, and corruption", async () => {
    let now = 1_000;
    const cache = new RoutePreviewCache(500, () => now);
    const result = await new FakeRouteProvider().calculateRoute(input);
    const key = cache.key("fake", input);
    expect(cache.get(key)).toBeUndefined(); cache.set(key, result); expect(cache.get(key)).toEqual(result);
    expect(cache.get(cache.key("mapbox", input))).toBeUndefined();
    expect(cache.get(cache.key("fake", { ...input, orderedStops: [...input.orderedStops].reverse() }))).toBeUndefined();
    now = 1_501; expect(cache.get(key)).toBeUndefined();
    expect(() => cache.set(key, { ...result, geometryChecksum: "broken" })).toThrowError(RouteProviderError);
    expect(cache.get(key)).toBeUndefined();
  });
});
