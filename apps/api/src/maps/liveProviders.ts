import type { AppConfig, RouteProviderId } from "../config.js";
import { FakeRouteProvider } from "./fakeProvider.js";
import { array, finite, object, providerJson, string, type ProviderHttpOptions } from "./http.js";
import {
  geometryChecksum,
  routeInputChecksum,
  RouteProviderError,
  validateCoordinates,
  validateRouteInput,
  type ActiveRouteProviderId,
  type GeocodeInput,
  type GeocodeResult,
  type GeometryEncoding,
  type NormalizedRouteResult,
  type ProviderAttribution,
  type RouteCalculationInput,
  type RouteProvider
} from "./contracts.js";
import { validateNormalizedRouteResult } from "./contracts.js";

type AdapterOptions = ProviderHttpOptions & Readonly<{ secret: string; now?: () => Date }>;

abstract class HttpRouteProvider implements RouteProvider {
  abstract readonly id: ActiveRouteProviderId;
  protected readonly now: () => Date;
  constructor(protected readonly options: AdapterOptions) { this.now = options.now ?? (() => new Date()); }
  abstract geocodeStop(input: GeocodeInput): Promise<GeocodeResult>;
  abstract calculateRoute(input: RouteCalculationInput): Promise<NormalizedRouteResult>;

  protected routeResult(input: RouteCalculationInput, data: {
    apiVersion: string;
    encodedGeometry: string;
    geometryEncoding: GeometryEncoding;
    geometryPrecision: 5 | 6;
    distanceMeters: number;
    durationSeconds: number;
    providerReferenceId?: string;
    providerReferenceStoragePermitted?: boolean;
    attribution: readonly ProviderAttribution[];
  }): NormalizedRouteResult {
    validateRouteInput(input);
    if (!data.encodedGeometry || !Number.isFinite(data.distanceMeters) || !Number.isFinite(data.durationSeconds)) {
      throw new RouteProviderError("malformed_provider_response");
    }
    const distanceMeters = Math.round(data.distanceMeters);
    const durationSeconds = Math.round(data.durationSeconds);
    if (distanceMeters <= 0 || durationSeconds <= 0) throw new RouteProviderError("malformed_provider_response");
    const inputChecksum = routeInputChecksum(input, this.id);
    const geometryHash = geometryChecksum({
      routeVersionId: input.routeVersionId,
      orderedStopInputChecksum: inputChecksum,
      provider: this.id,
      profile: input.profile,
      apiVersion: data.apiVersion,
      geometryEncoding: data.geometryEncoding,
      geometryPrecision: data.geometryPrecision,
      encodedGeometry: data.encodedGeometry,
      distanceMeters,
      durationSeconds
    });
    return validateNormalizedRouteResult({
      encodedGeometry: data.encodedGeometry,
      geometryEncoding: data.geometryEncoding,
      geometryPrecision: data.geometryPrecision,
      distanceMeters,
      durationSeconds,
      calculatedAt: this.now().toISOString(),
      provenance: {
        provider: this.id,
        apiVersion: data.apiVersion,
        profile: input.profile,
        providerReferenceId: data.providerReferenceId,
        providerReferenceStoragePermitted: data.providerReferenceStoragePermitted ?? false
      },
      attribution: data.attribution,
      inputChecksum,
      geometryChecksum: geometryHash
    });
  }
}

const mapboxAttribution = [{ text: "© Mapbox © OpenStreetMap", displayRequired: true, url: "https://www.mapbox.com/about/maps/" }] as const;
export class MapboxRouteProvider extends HttpRouteProvider {
  readonly id = "mapbox" as const;
  async geocodeStop(input: GeocodeInput): Promise<GeocodeResult> {
    if (!input.query.trim() || input.query.length > 200) throw new RouteProviderError("invalid_input");
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", input.query);
    url.searchParams.set("language", input.locale);
    url.searchParams.set("limit", "1");
    url.searchParams.set("access_token", this.options.secret);
    const root = object(await providerJson(url, { method: "GET" }, this.options));
    const feature = object(array(root.features)[0]);
    const properties = object(feature.properties);
    const coordinates = array(object(feature.geometry).coordinates);
    const result = {
      displayLabel: string(properties.full_address ?? properties.name),
      coordinates: { latitude: finite(coordinates[1]), longitude: finite(coordinates[0]) },
      provenance: { provider: this.id, apiVersion: "geocoding-v6", providerReferenceId: typeof feature.id === "string" ? feature.id : undefined, providerReferenceStoragePermitted: false },
      attribution: mapboxAttribution
    } as const;
    validateCoordinates(result.coordinates);
    return result;
  }
  async calculateRoute(input: RouteCalculationInput) {
    validateRouteInput(input);
    if (input.orderedStops.length > 25) throw new RouteProviderError("invalid_input");
    const coordinates = input.orderedStops.map((stop) => `${stop.coordinates.longitude},${stop.coordinates.latitude}`).join(";");
    const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`);
    url.searchParams.set("geometries", "polyline6");
    url.searchParams.set("overview", "full");
    const exclusions = [input.options.avoidTolls ? "toll" : undefined, input.options.avoidFerries ? "ferry" : undefined].filter(Boolean).join(",");
    if (exclusions) url.searchParams.set("exclude", exclusions);
    url.searchParams.set("access_token", this.options.secret);
    const root = object(await providerJson(url, { method: "GET" }, this.options));
    const route = object(array(root.routes)[0]);
    return this.routeResult(input, { apiVersion: "directions-v5", encodedGeometry: string(route.geometry), geometryEncoding: "polyline6", geometryPrecision: 6, distanceMeters: finite(route.distance), durationSeconds: finite(route.duration), providerReferenceId: typeof root.uuid === "string" ? root.uuid : undefined, attribution: mapboxAttribution });
  }
}

const googleAttribution = [{ text: "Google Maps", displayRequired: true, url: "https://maps.google.com/help/terms_maps/" }] as const;
export class GoogleRouteProvider extends HttpRouteProvider {
  readonly id = "google" as const;
  async geocodeStop(input: GeocodeInput): Promise<GeocodeResult> {
    if (!input.query.trim() || input.query.length > 200) throw new RouteProviderError("invalid_input");
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", input.query);
    url.searchParams.set("language", input.locale);
    url.searchParams.set("key", this.options.secret);
    const root = object(await providerJson(url, { method: "GET" }, this.options));
    if (root.status === "OVER_QUERY_LIMIT") throw new RouteProviderError("provider_quota_exhausted");
    if (root.status !== "OK") throw new RouteProviderError(root.status === "ZERO_RESULTS" ? "provider_unavailable" : "malformed_provider_response");
    const item = object(array(root.results)[0]);
    const location = object(object(item.geometry).location);
    const result = {
      displayLabel: string(item.formatted_address),
      coordinates: { latitude: finite(location.lat), longitude: finite(location.lng) },
      provenance: { provider: this.id, apiVersion: "geocoding-v3", providerReferenceId: typeof item.place_id === "string" ? item.place_id : undefined, providerReferenceStoragePermitted: false },
      attribution: googleAttribution
    } as const;
    validateCoordinates(result.coordinates);
    return result;
  }
  async calculateRoute(input: RouteCalculationInput) {
    validateRouteInput(input);
    if (input.orderedStops.length > 27) throw new RouteProviderError("invalid_input");
    const waypoints = input.orderedStops.map((stop) => ({ location: { latLng: { latitude: stop.coordinates.latitude, longitude: stop.coordinates.longitude } } }));
    const root = object(await providerJson(new URL("https://routes.googleapis.com/directions/v2:computeRoutes"), {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": this.options.secret, "x-goog-fieldmask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline" },
      body: JSON.stringify({ origin: waypoints[0], destination: waypoints[waypoints.length - 1], intermediates: waypoints.slice(1, -1), travelMode: "DRIVE", languageCode: input.locale, routeModifiers: { avoidTolls: input.options.avoidTolls, avoidFerries: input.options.avoidFerries } })
    }, this.options));
    const route = object(array(root.routes)[0]);
    const duration = string(route.duration);
    if (!/^\d+(?:\.\d+)?s$/.test(duration)) throw new RouteProviderError("malformed_provider_response");
    return this.routeResult(input, { apiVersion: "routes-v2", encodedGeometry: string(object(route.polyline).encodedPolyline), geometryEncoding: "polyline5", geometryPrecision: 5, distanceMeters: finite(route.distanceMeters), durationSeconds: Number(duration.slice(0, -1)), attribution: googleAttribution });
  }
}

const hereAttribution = [{ text: "© HERE", displayRequired: true, url: "https://legal.here.com/" }] as const;
const flexibleAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function flexiblePrecision(value: string): 5 | 6 {
  const header = flexibleAlphabet.indexOf(value[1] ?? "");
  const precision = header < 0 ? -1 : header & 15;
  if (precision !== 5 && precision !== 6) throw new RouteProviderError("malformed_provider_response");
  return precision;
}
export class HereRouteProvider extends HttpRouteProvider {
  readonly id = "here" as const;
  async geocodeStop(input: GeocodeInput): Promise<GeocodeResult> {
    if (!input.query.trim() || input.query.length > 200) throw new RouteProviderError("invalid_input");
    const url = new URL("https://geocode.search.hereapi.com/v1/geocode");
    url.searchParams.set("q", input.query); url.searchParams.set("lang", input.locale); url.searchParams.set("apiKey", this.options.secret);
    const item = object(array(object(await providerJson(url, { method: "GET" }, this.options)).items)[0]);
    const position = object(item.position);
    const result = { displayLabel: string(object(item.address).label), coordinates: { latitude: finite(position.lat), longitude: finite(position.lng) }, provenance: { provider: this.id, apiVersion: "geocoding-v1", providerReferenceId: typeof item.id === "string" ? item.id : undefined, providerReferenceStoragePermitted: false }, attribution: hereAttribution } as const;
    validateCoordinates(result.coordinates); return result;
  }
  async calculateRoute(input: RouteCalculationInput) {
    validateRouteInput(input);
    if (input.orderedStops.length > 50) throw new RouteProviderError("invalid_input");
    const url = new URL("https://router.hereapi.com/v8/routes");
    url.searchParams.set("transportMode", "car"); url.searchParams.set("origin", `${input.orderedStops[0].coordinates.latitude},${input.orderedStops[0].coordinates.longitude}`); url.searchParams.set("destination", `${input.orderedStops.at(-1)!.coordinates.latitude},${input.orderedStops.at(-1)!.coordinates.longitude}`); url.searchParams.set("return", "polyline,summary"); url.searchParams.set("apiKey", this.options.secret);
    const avoid = [input.options.avoidTolls ? "tollRoad" : undefined, input.options.avoidFerries ? "ferry" : undefined].filter(Boolean).join(",");
    if (avoid) url.searchParams.set("avoid[features]", avoid);
    for (const stop of input.orderedStops.slice(1, -1)) url.searchParams.append("via", `${stop.coordinates.latitude},${stop.coordinates.longitude}`);
    const sections = array(object(array(object(await providerJson(url, { method: "GET" }, this.options)).routes)[0]).sections).map(object);
    const polylines = sections.map((section) => string(section.polyline));
    const precision = flexiblePrecision(polylines[0]);
    if (polylines.some((polyline) => flexiblePrecision(polyline) !== precision)) throw new RouteProviderError("malformed_provider_response");
    const summaries = sections.map((section) => object(section.summary));
    return this.routeResult(input, { apiVersion: "routing-v8", encodedGeometry: JSON.stringify(polylines), geometryEncoding: "flexible_polyline_segments", geometryPrecision: precision, distanceMeters: summaries.reduce((total, summary) => total + finite(summary.length), 0), durationSeconds: summaries.reduce((total, summary) => total + finite(summary.duration), 0), attribution: hereAttribution });
  }
}

const stadiaAttribution = [{ text: "© Stadia Maps © OpenMapTiles © OpenStreetMap", displayRequired: true, url: "https://stadiamaps.com/attribution/" }] as const;
export class StadiaRouteProvider extends HttpRouteProvider {
  readonly id = "stadia" as const;
  async geocodeStop(input: GeocodeInput): Promise<GeocodeResult> {
    if (!input.query.trim() || input.query.length > 200) throw new RouteProviderError("invalid_input");
    const url = new URL("https://api.stadiamaps.com/geocoding/v1/search");
    url.searchParams.set("text", input.query); url.searchParams.set("lang", input.locale); url.searchParams.set("api_key", this.options.secret); url.searchParams.set("size", "1");
    const feature = object(array(object(await providerJson(url, { method: "GET" }, this.options)).features)[0]);
    const properties = object(feature.properties); const coordinates = array(object(feature.geometry).coordinates);
    const result = { displayLabel: string(properties.label ?? properties.name), coordinates: { latitude: finite(coordinates[1]), longitude: finite(coordinates[0]) }, provenance: { provider: this.id, apiVersion: "pelias-v1", providerReferenceId: typeof properties.gid === "string" ? properties.gid : undefined, providerReferenceStoragePermitted: false }, attribution: stadiaAttribution } as const;
    validateCoordinates(result.coordinates); return result;
  }
  async calculateRoute(input: RouteCalculationInput) {
    validateRouteInput(input);
    if (input.orderedStops.length > 50) throw new RouteProviderError("invalid_input");
    const url = new URL("https://api.stadiamaps.com/route/v1"); url.searchParams.set("api_key", this.options.secret);
    const root = object(await providerJson(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locations: input.orderedStops.map((stop) => ({ lat: stop.coordinates.latitude, lon: stop.coordinates.longitude })), costing: "auto", costing_options: { auto: { exclude_tolls: input.options.avoidTolls, exclude_ferries: input.options.avoidFerries } }, units: "kilometers", language: input.locale, directions_options: { units: "kilometers" } }) }, this.options));
    const trip = object(root.trip); const summary = object(trip.summary);
    const legs = array(trip.legs); const shape = JSON.stringify(legs.map((leg) => string(object(leg).shape)));
    return this.routeResult(input, { apiVersion: "valhalla-v1", encodedGeometry: shape, geometryEncoding: "polyline6_segments", geometryPrecision: 6, distanceMeters: finite(summary.length) * 1000, durationSeconds: finite(summary.time), attribution: stadiaAttribution });
  }
}

export function createRouteProvider(appConfig: AppConfig, http: Omit<ProviderHttpOptions, "requestTimeoutMs" | "maxRetries"> = {}): RouteProvider | undefined {
  const provider = appConfig.routeMaps.provider as RouteProviderId;
  if (!appConfig.routeMaps.enabled || provider === "disabled") return undefined;
  if (provider === "fake") return new FakeRouteProvider();
  const options = { secret: appConfig.routeMaps.secret!, requestTimeoutMs: appConfig.routeMaps.requestTimeoutMs, maxRetries: appConfig.routeMaps.maxRetries, ...http };
  if (provider === "mapbox") return new MapboxRouteProvider(options);
  if (provider === "google") return new GoogleRouteProvider(options);
  if (provider === "here") return new HereRouteProvider(options);
  if (provider === "stadia") return new StadiaRouteProvider(options);
  throw new RouteProviderError("provider_disabled");
}
