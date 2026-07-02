export type Point = {
  lat: number;
  lng: number;
};

export const LOCKED_ORIGIN = { lat: 31.5326, lng: 35.0998 };
export const LOCKED_DESTINATION = { lat: 31.7054, lng: 35.2024 };

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value);
}

export function haversineKm(a: Point, b: Point) {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(b.lat - a.lat);
  const dLng = degreesToRadians(b.lng - a.lng);
  const lat1 = degreesToRadians(a.lat);
  const lat2 = degreesToRadians(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function round(value: number, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function lockedCorridorDistanceKm() {
  return haversineKm(LOCKED_ORIGIN, LOCKED_DESTINATION);
}
