import { createHash } from "node:crypto";
import type { RouteProviderId } from "../config.js";

export type LiveRouteProviderId = Exclude<RouteProviderId, "disabled" | "fake">;
export type ActiveRouteProviderId = Exclude<RouteProviderId, "disabled">;
export type TravelProfile = "driving";
export type GeometryEncoding = "polyline5" | "polyline6" | "polyline6_segments" | "flexible_polyline" | "flexible_polyline_segments";

export type Coordinates = Readonly<{ latitude: number; longitude: number }>;
export type RouteRegionBounds = Readonly<{ southwest: Coordinates; northeast: Coordinates }>;

export type GeocodeInput = Readonly<{
  query: string;
  locale: "ar" | "en";
  bounds?: RouteRegionBounds;
}>;

export type ProviderAttribution = Readonly<{
  text: string;
  displayRequired: boolean;
  url?: string;
}>;

export type ProviderProvenance = Readonly<{
  provider: ActiveRouteProviderId;
  apiVersion: string;
  profile?: string;
  providerReferenceId?: string;
  providerReferenceStoragePermitted: boolean;
}>;

export type GeocodeResult = Readonly<{
  displayLabel: string;
  coordinates: Coordinates;
  confidence?: number;
  category?: string;
  provenance: ProviderProvenance;
  attribution: readonly ProviderAttribution[];
}>;

export type CanonicalRouteStop = Readonly<{
  stopId: string;
  coordinates: Coordinates;
}>;

export type RouteCalculationInput = Readonly<{
  routeVersionId: string;
  orderedStops: readonly CanonicalRouteStop[];
  profile: TravelProfile;
  locale: "ar" | "en";
  options: Readonly<{ avoidTolls: boolean; avoidFerries: boolean }>;
}>;

export type NormalizedRouteResult = Readonly<{
  encodedGeometry: string;
  geometryEncoding: GeometryEncoding;
  geometryPrecision: 5 | 6;
  distanceMeters: number;
  durationSeconds: number;
  calculatedAt: string;
  provenance: ProviderProvenance;
  attribution: readonly ProviderAttribution[];
  inputChecksum: string;
  geometryChecksum: string;
}>;

export type RouteProvider = Readonly<{
  id: ActiveRouteProviderId;
  geocodeStop(input: GeocodeInput): Promise<GeocodeResult>;
  calculateRoute(input: RouteCalculationInput): Promise<NormalizedRouteResult>;
}>;

export const ROUTE_PROVIDER_ERROR_CATEGORIES = [
  "provider_disabled",
  "invalid_input",
  "provider_timeout",
  "provider_rate_limited",
  "provider_quota_exhausted",
  "provider_unauthorized",
  "provider_unavailable",
  "malformed_provider_response"
] as const;
export type RouteProviderErrorCategory = (typeof ROUTE_PROVIDER_ERROR_CATEGORIES)[number];

export class RouteProviderError extends Error {
  constructor(public readonly category: RouteProviderErrorCategory) {
    super(category);
    this.name = "RouteProviderError";
  }
}

export function validateCoordinates(value: Coordinates) {
  if (!Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90) {
    throw new RouteProviderError("invalid_input");
  }
  if (!Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) {
    throw new RouteProviderError("invalid_input");
  }
}

export function validateRouteInput(input: RouteCalculationInput) {
  if (!input.routeVersionId || input.routeVersionId.length > 191) throw new RouteProviderError("invalid_input");
  if (input.profile !== "driving" || input.orderedStops.length < 2 || input.orderedStops.length > 100) {
    throw new RouteProviderError("invalid_input");
  }
  const ids = new Set<string>();
  for (const stop of input.orderedStops) {
    if (!stop.stopId || stop.stopId.length > 191 || ids.has(stop.stopId)) {
      throw new RouteProviderError("invalid_input");
    }
    ids.add(stop.stopId);
    validateCoordinates(stop.coordinates);
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }
  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

export function sha256(value: unknown) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function routeInputChecksum(input: RouteCalculationInput, provider: ActiveRouteProviderId) {
  validateRouteInput(input);
  return sha256({
    provider,
    routeVersionId: input.routeVersionId,
    orderedStops: input.orderedStops.map((stop) => ({
      stopId: stop.stopId,
      latitude: Number(stop.coordinates.latitude.toFixed(6)),
      longitude: Number(stop.coordinates.longitude.toFixed(6))
    })),
    profile: input.profile,
    locale: input.locale,
    options: input.options
  });
}

export function geometryChecksum(input: {
  routeVersionId: string;
  orderedStopInputChecksum: string;
  provider: ActiveRouteProviderId;
  profile: TravelProfile;
  apiVersion: string;
  geometryEncoding: GeometryEncoding;
  geometryPrecision: 5 | 6;
  encodedGeometry: string;
  distanceMeters: number;
  durationSeconds: number;
}) {
  return sha256(input);
}

export function validateNormalizedRouteResult(result: NormalizedRouteResult) {
  if (!result.encodedGeometry || result.encodedGeometry.length > 2_000_000) {
    throw new RouteProviderError("malformed_provider_response");
  }
  if (!Number.isSafeInteger(result.distanceMeters) || result.distanceMeters <= 0 || result.distanceMeters > 5_000_000) {
    throw new RouteProviderError("malformed_provider_response");
  }
  if (!Number.isSafeInteger(result.durationSeconds) || result.durationSeconds <= 0 || result.durationSeconds > 604_800) {
    throw new RouteProviderError("malformed_provider_response");
  }
  if (!/^[a-f0-9]{64}$/.test(result.inputChecksum) || !/^[a-f0-9]{64}$/.test(result.geometryChecksum)) {
    throw new RouteProviderError("malformed_provider_response");
  }
  if (!Number.isFinite(Date.parse(result.calculatedAt))) throw new RouteProviderError("malformed_provider_response");
  const standardPolyline = /^[?-~]+$/;
  if ((result.geometryEncoding === "polyline5" || result.geometryEncoding === "polyline6") && !standardPolyline.test(result.encodedGeometry)) {
    throw new RouteProviderError("malformed_provider_response");
  }
  if (result.geometryEncoding === "flexible_polyline" && !/^[A-Za-z0-9_-]+$/.test(result.encodedGeometry)) {
    throw new RouteProviderError("malformed_provider_response");
  }
  if (result.geometryEncoding === "polyline6_segments" || result.geometryEncoding === "flexible_polyline_segments") {
    try {
      const segments = JSON.parse(result.encodedGeometry) as unknown;
      const pattern = result.geometryEncoding === "polyline6_segments" ? standardPolyline : /^[A-Za-z0-9_-]+$/;
      if (!Array.isArray(segments) || segments.length === 0 || segments.some((segment) => typeof segment !== "string" || !pattern.test(segment))) throw new Error("invalid segments");
    } catch { throw new RouteProviderError("malformed_provider_response"); }
  }
  return result;
}
