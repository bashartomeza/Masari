import { prisma } from "../lib/prisma.js";
import { RoutePreviewCache } from "./cache.js";
import { RouteProviderError, validateGeocodeResult, verifyNormalizedRouteResult, type GeocodeResult, type NormalizedRouteResult, type RouteCalculationInput, type RouteProvider } from "./contracts.js";

type DecimalLike = { toString(): string };
type DraftVersion = {
  id: string;
  draft_revision: number;
  status: string;
  service_route: { status: string };
  stops: Array<{
    stop_id: string;
    sequence: number;
    stop: { id: string; status: string; name_ar: string; name_en: string; latitude: DecimalLike; longitude: DecimalLike };
  }>;
};

export type RoutePreviewRepository = Readonly<{
  getVersion(id: string): Promise<DraftVersion | null>;
}>;

const repository: RoutePreviewRepository = {
  getVersion(id) {
    return prisma.serviceRouteVersion.findUnique({
      where: { id },
      include: {
        service_route: { select: { status: true } },
        stops: { include: { stop: true }, orderBy: { sequence: "asc" } }
      }
    }) as unknown as Promise<DraftVersion | null>;
  }
};

class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  constructor(private readonly now = () => Date.now()) {}
  assertAvailable() { if (this.openUntil > this.now()) throw new RouteProviderError("provider_unavailable"); }
  success() { this.failures = 0; this.openUntil = 0; }
  failure(error: unknown) {
    if (!(error instanceof RouteProviderError) || !["provider_timeout", "provider_unavailable"].includes(error.category)) return;
    this.failures += 1;
    if (this.failures >= 3) this.openUntil = this.now() + 30_000;
  }
}

function requireEditable(version: DraftVersion | null, expectedRevision: number) {
  if (!version) throw new RouteProviderError("invalid_input");
  if (version.status !== "draft" || version.service_route.status !== "active") throw new RouteProviderError("invalid_input");
  if (version.draft_revision !== expectedRevision) throw new RouteProviderError("invalid_input");
  if (version.stops.length < 2 || version.stops.length > 100 || version.stops.some((membership, index) => membership.sequence !== index + 1 || membership.stop.status !== "active")) {
    throw new RouteProviderError("invalid_input");
  }
  return version;
}

export function createRoutePreviewService(input: {
  provider?: RouteProvider;
  cacheTtlMs: number;
  repository?: RoutePreviewRepository;
  now?: () => Date;
}) {
  const cache = new RoutePreviewCache(input.cacheTtlMs, () => (input.now?.() ?? new Date()).getTime());
  const breaker = new CircuitBreaker(() => (input.now?.() ?? new Date()).getTime());
  const routeInFlight = new Map<string, Promise<NormalizedRouteResult>>();
  const geocodeInFlight = new Map<string, Promise<GeocodeResult>>();
  const repo = input.repository ?? repository;
  const provider = () => {
    if (!input.provider) throw new RouteProviderError("provider_disabled");
    return input.provider;
  };
  return {
    async calculate(versionId: string, request: { expectedRevision: number; locale: "ar" | "en"; profile: "driving"; avoidTolls: boolean; avoidFerries: boolean }) {
      const version = requireEditable(await repo.getVersion(versionId), request.expectedRevision);
      const selected = provider();
      const routeInput: RouteCalculationInput = {
        routeVersionId: version.id,
        orderedStops: version.stops.map((membership) => ({
          stopId: membership.stop_id,
          coordinates: { latitude: Number(membership.stop.latitude.toString()), longitude: Number(membership.stop.longitude.toString()) }
        })),
        profile: request.profile,
        locale: request.locale,
        options: { avoidTolls: request.avoidTolls, avoidFerries: request.avoidFerries }
      };
      const cacheKey = cache.key(selected.id, routeInput);
      const cached = cache.get(cacheKey);
      if (cached) return { result: cached, cacheStatus: "hit" as const };
      breaker.assertAvailable();
      let pending = routeInFlight.get(cacheKey);
      if (!pending) {
        pending = selected.calculateRoute(routeInput).then((result) => verifyNormalizedRouteResult(result, routeInput, selected.id));
        routeInFlight.set(cacheKey, pending);
      }
      try {
        const result = await pending;
        breaker.success(); cache.set(cacheKey, result);
        return { result, cacheStatus: "miss" as const };
      } catch (error) { breaker.failure(error); throw error; }
      finally { if (routeInFlight.get(cacheKey) === pending) routeInFlight.delete(cacheKey); }
    },
    async geocode(versionId: string, stopId: string, request: { expectedRevision: number; locale: "ar" | "en" }) {
      const version = requireEditable(await repo.getVersion(versionId), request.expectedRevision);
      const membership = version.stops.find((item) => item.stop_id === stopId);
      if (!membership) throw new RouteProviderError("invalid_input");
      const selected = provider();
      breaker.assertAvailable();
      const geocodeKey = `${selected.id}:${version.id}:${version.draft_revision}:${membership.stop_id}:${request.locale}`;
      let pending = geocodeInFlight.get(geocodeKey);
      if (!pending) {
        pending = selected.geocodeStop({ query: request.locale === "ar" ? membership.stop.name_ar : membership.stop.name_en, locale: request.locale }).then((result) => validateGeocodeResult(result, selected.id));
        geocodeInFlight.set(geocodeKey, pending);
      }
      try {
        const result = await pending;
        breaker.success(); return result;
      } catch (error) { breaker.failure(error); throw error; }
      finally { if (geocodeInFlight.get(geocodeKey) === pending) geocodeInFlight.delete(geocodeKey); }
    }
  };
}

export type RoutePreviewService = ReturnType<typeof createRoutePreviewService>;
