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

export function validateGeocodeResult(result: GeocodeResult, provider?: ActiveRouteProviderId) {
  if (!result.displayLabel || result.displayLabel.length > 500) malformed();
  try { validateCoordinates(result.coordinates); } catch { malformed(); }
  if (result.confidence !== undefined && (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1)) malformed();
  if (result.category !== undefined && (!result.category || result.category.length > 100)) malformed();
  if (provider && result.provenance.provider !== provider) malformed();
  if (!result.provenance.apiVersion || result.provenance.apiVersion.length > 100) malformed();
  if (result.provenance.providerReferenceId && result.provenance.providerReferenceId.length > 500) malformed();
  if (result.attribution.length > 20 || result.attribution.some((item) => !item.text || item.text.length > 500 || (item.url && item.url.length > 2_000))) malformed();
  return result;
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
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
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

const MAX_GEOMETRY_POINTS = 100_000;

function malformed(): never {
  throw new RouteProviderError("malformed_provider_response");
}

function requireMeaningfulGeometry(points: readonly Coordinates[]) {
  if (points.length < 2 || points.length > MAX_GEOMETRY_POINTS) malformed();
  const first = points[0];
  if (!points.some((point) => point.latitude !== first.latitude || point.longitude !== first.longitude)) malformed();
  return points;
}

export function decodeStandardPolyline(encoded: string, precision: 5 | 6) {
  if (!encoded || encoded.length > 2_000_000) malformed();
  const factor = 10 ** precision;
  const points: Coordinates[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const unsigned = () => {
    let value = 0;
    let multiplier = 1;
    for (let groups = 0; groups < 11; groups += 1) {
      if (index >= encoded.length) malformed();
      const chunk = encoded.charCodeAt(index++) - 63;
      if (chunk < 0 || chunk > 63) malformed();
      value += (chunk & 31) * multiplier;
      if (!Number.isSafeInteger(value)) malformed();
      if (chunk < 32) return value;
      multiplier *= 32;
      if (!Number.isSafeInteger(multiplier)) malformed();
    }
    return malformed();
  };
  const signed = () => {
    const value = unsigned();
    return value % 2 === 1 ? -(Math.floor(value / 2) + 1) : Math.floor(value / 2);
  };
  while (index < encoded.length) {
    latitude += signed();
    longitude += signed();
    if (!Number.isSafeInteger(latitude) || !Number.isSafeInteger(longitude)) malformed();
    const point = { latitude: latitude / factor, longitude: longitude / factor };
    try { validateCoordinates(point); } catch { malformed(); }
    points.push(point);
    if (points.length > MAX_GEOMETRY_POINTS) malformed();
  }
  return requireMeaningfulGeometry(points);
}

const flexibleAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function decodeFlexiblePolyline(encoded: string) {
  if (!encoded || encoded.length > 2_000_000) malformed();
  let index = 0;
  const unsigned = () => {
    let value = 0;
    let multiplier = 1;
    for (let groups = 0; groups < 11; groups += 1) {
      if (index >= encoded.length) malformed();
      const chunk = flexibleAlphabet.indexOf(encoded[index++]);
      if (chunk < 0) malformed();
      value += (chunk & 31) * multiplier;
      if (!Number.isSafeInteger(value)) malformed();
      if (chunk < 32) return value;
      multiplier *= 32;
      if (!Number.isSafeInteger(multiplier)) malformed();
    }
    return malformed();
  };
  const signed = () => {
    const value = unsigned();
    return value % 2 === 1 ? -(Math.floor(value / 2) + 1) : Math.floor(value / 2);
  };
  if (unsigned() !== 1) malformed();
  const header = unsigned();
  if (header > 2_047) malformed();
  const precision = header & 15;
  const thirdDimension = (header >> 4) & 7;
  const thirdDimensionPrecision = (header >> 7) & 15;
  if ((precision !== 5 && precision !== 6) || thirdDimension !== 0 || thirdDimensionPrecision !== 0) malformed();
  const factor = 10 ** precision;
  const points: Coordinates[] = [];
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    latitude += signed();
    longitude += signed();
    if (!Number.isSafeInteger(latitude) || !Number.isSafeInteger(longitude)) malformed();
    const point = { latitude: latitude / factor, longitude: longitude / factor };
    try { validateCoordinates(point); } catch { malformed(); }
    points.push(point);
    if (points.length > MAX_GEOMETRY_POINTS) malformed();
  }
  return { precision: precision as 5 | 6, points: requireMeaningfulGeometry(points) };
}

function geometrySegments(encoded: string) {
  try {
    const segments = JSON.parse(encoded) as unknown;
    if (!Array.isArray(segments) || segments.length === 0 || segments.length > 100) malformed();
    return segments.map((segment) => typeof segment === "string" ? segment : malformed());
  } catch (error) {
    if (error instanceof RouteProviderError) throw error;
    return malformed();
  }
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
  if (!result.provenance.apiVersion || result.provenance.apiVersion.length > 100) malformed();
  if (result.provenance.providerReferenceId && result.provenance.providerReferenceId.length > 500) malformed();
  if (result.attribution.length > 20 || result.attribution.some((item) => !item.text || item.text.length > 500 || (item.url && item.url.length > 2_000))) malformed();
  if (result.geometryEncoding === "polyline5") {
    if (result.geometryPrecision !== 5) malformed();
    decodeStandardPolyline(result.encodedGeometry, 5);
  } else if (result.geometryEncoding === "polyline6") {
    if (result.geometryPrecision !== 6) malformed();
    decodeStandardPolyline(result.encodedGeometry, 6);
  } else if (result.geometryEncoding === "polyline6_segments") {
    if (result.geometryPrecision !== 6) malformed();
    let total = 0;
    for (const segment of geometrySegments(result.encodedGeometry)) {
      total += decodeStandardPolyline(segment, 6).length;
      if (total > MAX_GEOMETRY_POINTS) malformed();
    }
  } else if (result.geometryEncoding === "flexible_polyline") {
    const decoded = decodeFlexiblePolyline(result.encodedGeometry);
    if (decoded.precision !== result.geometryPrecision) malformed();
  } else if (result.geometryEncoding === "flexible_polyline_segments") {
    let total = 0;
    for (const segment of geometrySegments(result.encodedGeometry)) {
      const decoded = decodeFlexiblePolyline(segment);
      if (decoded.precision !== result.geometryPrecision) malformed();
      total += decoded.points.length;
      if (total > MAX_GEOMETRY_POINTS) malformed();
    }
  } else malformed();
  return result;
}

export function verifyNormalizedRouteResult(
  result: NormalizedRouteResult,
  input: RouteCalculationInput,
  provider: ActiveRouteProviderId
) {
  validateNormalizedRouteResult(result);
  const inputChecksum = routeInputChecksum(input, provider);
  if (result.provenance.provider !== provider || result.provenance.profile !== input.profile || result.inputChecksum !== inputChecksum) malformed();
  const expectedGeometryChecksum = geometryChecksum({
    routeVersionId: input.routeVersionId,
    orderedStopInputChecksum: inputChecksum,
    provider,
    profile: input.profile,
    apiVersion: result.provenance.apiVersion,
    geometryEncoding: result.geometryEncoding,
    geometryPrecision: result.geometryPrecision,
    encodedGeometry: result.encodedGeometry,
    distanceMeters: result.distanceMeters,
    durationSeconds: result.durationSeconds
  });
  if (result.geometryChecksum !== expectedGeometryChecksum) malformed();
  return result;
}
