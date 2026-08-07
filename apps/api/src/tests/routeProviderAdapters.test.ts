import { createServer } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { FakeRouteProvider } from "../maps/fakeProvider.js";
import { providerJson } from "../maps/http.js";
import { GoogleRouteProvider, HereRouteProvider, MapboxRouteProvider, StadiaRouteProvider } from "../maps/liveProviders.js";
import type { RouteCalculationInput } from "../maps/contracts.js";

const input: RouteCalculationInput = { routeVersionId: "v1", orderedStops: [{ stopId: "a", coordinates: { latitude: 31.5, longitude: 35.1 } }, { stopId: "b", coordinates: { latitude: 31.7, longitude: 35.2 } }], profile: "driving", locale: "ar", options: { avoidTolls: false, avoidFerries: false } };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const options = (body: unknown) => ({ secret: "test-secret", requestTimeoutMs: 1000, maxRetries: 0, fetchImpl: vi.fn().mockResolvedValue(response(body)), now: () => new Date("2026-08-07T00:00:00Z") });

describe("M7D1 live provider adapter normalization", () => {
  it("normalizes Mapbox without leaking raw response fields", async () => {
    const geometry = (await new FakeRouteProvider().calculateRoute(input)).encodedGeometry;
    const adapter = new MapboxRouteProvider(options({ routes: [{ geometry, distance: 1000.4, duration: 120.2, secret_raw: "no" }] }));
    const result = await adapter.calculateRoute(input);
    expect(result).toEqual(expect.objectContaining({ geometryEncoding: "polyline6", distanceMeters: 1000, durationSeconds: 120 }));
    expect(JSON.stringify(result)).not.toContain("secret_raw");
  });

  it("normalizes Google Routes duration and polyline", async () => {
    const adapter = new GoogleRouteProvider(options({ routes: [{ distanceMeters: 900, duration: "100.5s", polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" } }] }));
    expect(await adapter.calculateRoute(input)).toEqual(expect.objectContaining({ geometryEncoding: "polyline5", distanceMeters: 900, durationSeconds: 101 }));
  });

  it("normalizes HERE flexible polyline", async () => {
    const adapter = new HereRouteProvider(options({ routes: [{ sections: [{ polyline: "BFoz5xJ67i1B1B7PzIhaxL7Y", summary: { length: 1100, duration: 130 } }] }] }));
    expect(await adapter.calculateRoute(input)).toEqual(expect.objectContaining({ geometryEncoding: "flexible_polyline_segments", distanceMeters: 1100 }));
  });

  it("models Stadia as hosted Pelias/Valhalla services, not MapLibre routing", async () => {
    const geometry = (await new FakeRouteProvider().calculateRoute(input)).encodedGeometry;
    const adapterOptions = options({ trip: { summary: { length: 1.2, time: 140 }, legs: [{ shape: geometry }, { shape: geometry }] } });
    const adapter = new StadiaRouteProvider(adapterOptions);
    const result = await adapter.calculateRoute(input);
    expect(result).toEqual(expect.objectContaining({ geometryEncoding: "polyline6_segments", distanceMeters: 1200 }));
    expect(result.encodedGeometry).toBe(JSON.stringify([geometry, geometry]));
    const request = JSON.parse(String((adapterOptions.fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][1].body));
    expect(request.costing_options.auto).toEqual({ use_tolls: 0.5, use_ferry: 0.5 });
  });

  it.each([[401, "provider_unauthorized"], [429, "provider_rate_limited"], [500, "provider_unavailable"]])("normalizes HTTP %s", async (status, category) => {
    const fetchImpl = vi.fn().mockResolvedValue(response({}, status as number));
    const adapter = new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 0, fetchImpl });
    await expect(adapter.calculateRoute(input)).rejects.toMatchObject({ category });
  });

  it("bounds 5xx retry and never retries authorization failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({}, 500));
    await expect(new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 1, fetchImpl, sleep: async () => undefined }).calculateRoute(input)).rejects.toMatchObject({ category: "provider_unavailable" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const authFetch = vi.fn().mockResolvedValue(response({}, 401));
    await expect(new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 1, fetchImpl: authFetch }).calculateRoute(input)).rejects.toMatchObject({ category: "provider_unauthorized" });
    expect(authFetch).toHaveBeenCalledOnce();
  });

  it("does not follow redirects or forward credential headers and route data", async () => {
    let destinationCalls = 0;
    const destination = createServer((_req, res) => { destinationCalls += 1; res.end("{}"); });
    await new Promise<void>((resolve) => destination.listen(0, "127.0.0.1", resolve));
    const address = destination.address();
    if (!address || typeof address === "string") throw new Error("missing test address");
    const redirect = createServer((_req, res) => { res.writeHead(307, { location: `http://127.0.0.1:${address.port}/capture` }); res.end(); });
    await new Promise<void>((resolve) => redirect.listen(0, "127.0.0.1", resolve));
    const redirectAddress = redirect.address();
    if (!redirectAddress || typeof redirectAddress === "string") throw new Error("missing redirect address");
    try {
      await expect(providerJson(new URL(`http://127.0.0.1:${redirectAddress.port}/start`), { method: "POST", headers: { "x-goog-api-key": "synthetic-review-sentinel" }, body: JSON.stringify({ latitude: 31.500001 }) }, { requestTimeoutMs: 1_000, maxRetries: 0 })).rejects.toMatchObject({ category: "provider_unavailable" });
      expect(destinationCalls).toBe(0);
    } finally {
      await new Promise<void>((resolve, reject) => redirect.close((error) => error ? reject(error) : resolve()));
      await new Promise<void>((resolve, reject) => destination.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("rejects oversized provider JSON and enforces one overall deadline", async () => {
    const oversized = vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: "x".repeat(1_000_001) }), { status: 200 }));
    await expect(providerJson(new URL("https://api.mapbox.com/test"), {}, { requestTimeoutMs: 1_000, maxRetries: 0, fetchImpl: oversized })).rejects.toMatchObject({ category: "malformed_provider_response" });
    const unavailable = vi.fn().mockResolvedValue(response({}, 500));
    await expect(providerJson(new URL("https://api.mapbox.com/test"), {}, { requestTimeoutMs: 50, maxRetries: 1, fetchImpl: unavailable, sleep: async () => undefined })).rejects.toMatchObject({ category: "provider_timeout" });
    expect(unavailable).toHaveBeenCalledOnce();
    const abortedBody = new ReadableStream({ start(controller) { controller.error(Object.assign(new Error("body deadline"), { name: "TimeoutError" })); } });
    const bodyTimeout = vi.fn().mockResolvedValue(new Response(abortedBody, { status: 200 }));
    await expect(providerJson(new URL("https://api.mapbox.com/test"), {}, { requestTimeoutMs: 1_000, maxRetries: 0, fetchImpl: bodyTimeout })).rejects.toMatchObject({ category: "provider_timeout" });
  });

  it.each([["REQUEST_DENIED", "provider_unauthorized"], ["OVER_DAILY_LIMIT", "provider_quota_exhausted"]])("normalizes Google geocode status %s", async (status, category) => {
    const adapter = new GoogleRouteProvider(options({ status }));
    await expect(adapter.geocodeStop({ query: "Hebron", locale: "en" })).rejects.toMatchObject({ category });
  });

  it("normalizes timeout and malformed JSON", async () => {
    const timeout = vi.fn().mockRejectedValue(Object.assign(new Error("timed out"), { name: "TimeoutError" }));
    await expect(new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 0, fetchImpl: timeout }).calculateRoute(input)).rejects.toMatchObject({ category: "provider_timeout" });
    const malformed = vi.fn().mockResolvedValue(new Response("not-json", { status: 200 }));
    await expect(new MapboxRouteProvider({ secret: "secret", requestTimeoutMs: 1000, maxRetries: 0, fetchImpl: malformed }).calculateRoute(input)).rejects.toMatchObject({ category: "malformed_provider_response" });
    await expect(new MapboxRouteProvider(options({ routes: [{ geometry: "bad polyline", distance: 100, duration: 10 }] })).calculateRoute(input)).rejects.toMatchObject({ category: "malformed_provider_response" });
  });
});
