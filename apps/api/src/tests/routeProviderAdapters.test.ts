import { describe, expect, it, vi } from "vitest";
import { GoogleRouteProvider, HereRouteProvider, MapboxRouteProvider, StadiaRouteProvider } from "../maps/liveProviders.js";
import type { RouteCalculationInput } from "../maps/contracts.js";

const input: RouteCalculationInput = { routeVersionId: "v1", orderedStops: [{ stopId: "a", coordinates: { latitude: 31.5, longitude: 35.1 } }, { stopId: "b", coordinates: { latitude: 31.7, longitude: 35.2 } }], profile: "driving", locale: "ar", options: { avoidTolls: false, avoidFerries: false } };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const options = (body: unknown) => ({ secret: "test-secret", requestTimeoutMs: 1000, maxRetries: 0, fetchImpl: vi.fn().mockResolvedValue(response(body)), now: () => new Date("2026-08-07T00:00:00Z") });

describe("M7D1 live provider adapter normalization", () => {
  it("normalizes Mapbox without leaking raw response fields", async () => {
    const adapter = new MapboxRouteProvider(options({ routes: [{ geometry: "????", distance: 1000.4, duration: 120.2, secret_raw: "no" }] }));
    const result = await adapter.calculateRoute(input);
    expect(result).toEqual(expect.objectContaining({ geometryEncoding: "polyline6", distanceMeters: 1000, durationSeconds: 120 }));
    expect(JSON.stringify(result)).not.toContain("secret_raw");
  });

  it("normalizes Google Routes duration and polyline", async () => {
    const adapter = new GoogleRouteProvider(options({ routes: [{ distanceMeters: 900, duration: "100.5s", polyline: { encodedPolyline: "@@@@" } }] }));
    expect(await adapter.calculateRoute(input)).toEqual(expect.objectContaining({ geometryEncoding: "polyline5", distanceMeters: 900, durationSeconds: 101 }));
  });

  it("normalizes HERE flexible polyline", async () => {
    const adapter = new HereRouteProvider(options({ routes: [{ sections: [{ polyline: "BFoz5xJ67i1B1B7PzIhaxL7Y", summary: { length: 1100, duration: 130 } }] }] }));
    expect(await adapter.calculateRoute(input)).toEqual(expect.objectContaining({ geometryEncoding: "flexible_polyline_segments", distanceMeters: 1100 }));
  });

  it("models Stadia as hosted Pelias/Valhalla services, not MapLibre routing", async () => {
    const adapter = new StadiaRouteProvider(options({ trip: { summary: { length: 1.2, time: 140 }, legs: [{ shape: "????" }, { shape: "@@@@" }] } }));
    const result = await adapter.calculateRoute(input);
    expect(result).toEqual(expect.objectContaining({ geometryEncoding: "polyline6_segments", distanceMeters: 1200 }));
    expect(result.encodedGeometry).toBe('["????","@@@@"]');
  });

  it.each([[401, "provider_unauthorized"], [429, "provider_rate_limited"], [500, "provider_unavailable"]])("normalizes HTTP %s", async (status, category) => {
    const fetchImpl = vi.fn().mockResolvedValue(response({}, status as number));
    const adapter = new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 0, fetchImpl });
    await expect(adapter.calculateRoute(input)).rejects.toMatchObject({ category });
  });

  it("bounds 5xx retry and never retries authorization failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({}, 500));
    await expect(new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 2, fetchImpl, sleep: async () => undefined }).calculateRoute(input)).rejects.toMatchObject({ category: "provider_unavailable" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const authFetch = vi.fn().mockResolvedValue(response({}, 401));
    await expect(new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 2, fetchImpl: authFetch }).calculateRoute(input)).rejects.toMatchObject({ category: "provider_unauthorized" });
    expect(authFetch).toHaveBeenCalledOnce();
  });

  it("normalizes timeout and malformed JSON", async () => {
    const timeout = vi.fn().mockRejectedValue(Object.assign(new Error("timed out"), { name: "TimeoutError" }));
    await expect(new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 0, fetchImpl: timeout }).calculateRoute(input)).rejects.toMatchObject({ category: "provider_timeout" });
    const malformed = vi.fn().mockResolvedValue(new Response("not-json", { status: 200 }));
    await expect(new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 0, fetchImpl: malformed }).calculateRoute(input)).rejects.toMatchObject({ category: "malformed_provider_response" });
    await expect(new MapboxRouteProvider(options({ routes: [{ geometry: "bad polyline", distance: 100, duration: 10 }] })).calculateRoute(input)).rejects.toMatchObject({ category: "malformed_provider_response" });
  });
});
