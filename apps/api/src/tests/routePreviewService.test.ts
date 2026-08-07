import { describe, expect, it } from "vitest";
import { FakeRouteProvider } from "../maps/fakeProvider.js";
import { createRoutePreviewService } from "../maps/previewService.js";

const draft = (overrides: Record<string, unknown> = {}) => ({
  id: "v1",
  draft_revision: 1,
  status: "draft",
  service_route: { status: "active" },
  stops: [
    { stop_id: "a", sequence: 1, stop: { id: "a", status: "active", name_ar: "الخليل", name_en: "Hebron", latitude: { toString: () => "31.532600" }, longitude: { toString: () => "35.099800" } } },
    { stop_id: "b", sequence: 2, stop: { id: "b", status: "active", name_ar: "بيت لحم", name_en: "Bethlehem", latitude: { toString: () => "31.705400" }, longitude: { toString: () => "35.202400" } } }
  ],
  ...overrides
});
const request = { expectedRevision: 1, locale: "ar" as const, profile: "driving" as const, avoidTolls: false, avoidFerries: false };

describe("M7D1 route preview service boundary", () => {
  it("calculates once and serves a normalized draft preview from cache", async () => {
    const provider = new FakeRouteProvider();
    const service = createRoutePreviewService({ provider, cacheTtlMs: 60_000, repository: { getVersion: async () => draft() as never } });
    expect((await service.calculate("v1", request)).cacheStatus).toBe("miss");
    expect((await service.calculate("v1", request)).cacheStatus).toBe("hit");
  });

  it.each([
    ["published version", draft({ status: "published" })], ["paused version", draft({ status: "paused" })],
    ["retired route", draft({ service_route: { status: "retired" } })], ["stale revision", draft({ draft_revision: 2 })],
    ["duplicate stop", draft({ stops: [draft().stops[0], { ...draft().stops[0], sequence: 2 }] })],
    ["excessive stop count", draft({ stops: Array.from({ length: 101 }, (_, index) => ({ ...draft().stops[0], stop_id: `s${index}`, sequence: index + 1, stop: { ...draft().stops[0].stop, id: `s${index}` } })) })]
  ])("rejects %s without provider calculation", async (_label, version) => {
    const service = createRoutePreviewService({ provider: new FakeRouteProvider(), cacheTtlMs: 0, repository: { getVersion: async () => version as never } });
    await expect(service.calculate("v1", request)).rejects.toMatchObject({ category: "invalid_input" });
  });

  it("fails closed with the kill switch and performs no hidden fallback", async () => {
    const service = createRoutePreviewService({ provider: undefined, cacheTtlMs: 0, repository: { getVersion: async () => draft() as never } });
    await expect(service.calculate("v1", request)).rejects.toMatchObject({ category: "provider_disabled" });
    await expect(service.geocode("v1", "a", { expectedRevision: 1, locale: "ar" })).rejects.toMatchObject({ category: "provider_disabled" });
  });

  it("uses the stored original Arabic or English canonical stop name", async () => {
    const provider = new FakeRouteProvider(); const service = createRoutePreviewService({ provider, cacheTtlMs: 0, repository: { getVersion: async () => draft() as never } });
    expect((await service.geocode("v1", "a", { expectedRevision: 1, locale: "ar" })).displayLabel).toContain("الخليل");
    expect((await service.geocode("v1", "b", { expectedRevision: 1, locale: "en" })).displayLabel).toContain("Bethlehem");
    await expect(service.geocode("v1", "outside", { expectedRevision: 1, locale: "ar" })).rejects.toMatchObject({ category: "invalid_input" });
  });
});
