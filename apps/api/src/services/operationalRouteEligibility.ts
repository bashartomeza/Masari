import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { HttpError } from "../middleware/error.js";

type Database = PrismaClient | Prisma.TransactionClient;

export type EligibleRouteMembership = {
  stopId: string;
  sequence: number;
  passengerPickup: boolean;
  passengerDropoff: boolean;
  parcelPickup: boolean;
  parcelDropoff: boolean;
  stop: {
    id: string;
    stopKey: string;
    nameAr: string;
    nameEn: string;
    latitude: Prisma.Decimal;
    longitude: Prisma.Decimal;
  };
};

export type EligibleOperationalRoute = {
  id: string;
  versionNumber: number;
  nameAr: string;
  nameEn: string;
  direction: "outbound" | "inbound" | "loop";
  route: { id: string; routeKey: string };
  stops: EligibleRouteMembership[];
};

export async function requireEligibleOperationalRoute(
  db: Database,
  routeVersionId: string,
  options: { now?: Date; requiredStopIds?: string[]; lockForUpdate?: boolean } = {}
): Promise<EligibleOperationalRoute> {
  const now = options.now ?? new Date();
  if (options.lockForUpdate) {
    const lookup = await db.serviceRouteVersion.findUnique({
      where: { id: routeVersionId },
      select: { service_route_id: true }
    });
    if (!lookup) throw new HttpError(409, "route_version_not_available");
    const routes = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM service_routes WHERE id = ${lookup.service_route_id} FOR UPDATE
    `;
    const versions = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM service_route_versions WHERE id = ${routeVersionId} FOR UPDATE
    `;
    if (routes.length !== 1 || versions.length !== 1) throw new HttpError(409, "route_version_not_available");
    const memberships = await db.$queryRaw<Array<{ id: string; stop_id: string }>>`
      SELECT id, stop_id FROM route_version_stops
      WHERE service_route_version_id = ${routeVersionId}
      ORDER BY sequence, id FOR UPDATE
    `;
    const stopIds = [...new Set(memberships.map((membership) => membership.stop_id))].sort();
    if (stopIds.length > 0) {
      const stops = await db.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM stops WHERE id IN (${Prisma.join(stopIds)}) ORDER BY id FOR UPDATE`
      );
      if (stops.length !== stopIds.length) throw new HttpError(409, "route_version_not_available");
    }
  }
  const version = await db.serviceRouteVersion.findUnique({
    where: { id: routeVersionId },
    include: {
      service_route: true,
      stops: { include: { stop: true }, orderBy: { sequence: "asc" } }
    }
  });

  if (
    !version ||
    version.service_route.status !== "active" ||
    version.service_route.current_version_id !== version.id ||
    version.status !== "published" ||
    (version.active_from !== null && version.active_from > now) ||
    (version.active_until !== null && version.active_until <= now)
  ) {
    throw new HttpError(409, "route_version_not_available");
  }

  const stops = version.stops;
  const ordered =
    stops.length >= 2 &&
    stops.every((membership, index) => membership.sequence === index + 1 && membership.stop.status === "active") &&
    version.origin_stop_id === stops[0]?.stop_id &&
    version.destination_stop_id === stops.at(-1)?.stop_id;
  if (!ordered) throw new HttpError(409, "route_version_not_available");

  const byId = new Map(stops.map((membership) => [membership.stop_id, membership]));
  if ((options.requiredStopIds ?? []).some((stopId) => !byId.has(stopId))) {
    throw new HttpError(400, "invalid_route_stop");
  }

  return {
    id: version.id,
    versionNumber: version.version_number,
    nameAr: version.name_ar,
    nameEn: version.name_en,
    direction: version.service_route.direction,
    route: { id: version.service_route.id, routeKey: version.service_route.route_key },
    stops: stops.map((membership) => ({
      stopId: membership.stop_id,
      sequence: membership.sequence,
      passengerPickup: membership.passenger_pickup,
      passengerDropoff: membership.passenger_dropoff,
      parcelPickup: membership.parcel_pickup,
      parcelDropoff: membership.parcel_dropoff,
      stop: {
        id: membership.stop.id,
        stopKey: membership.stop.stop_key,
        nameAr: membership.stop.name_ar,
        nameEn: membership.stop.name_en,
        latitude: membership.stop.latitude,
        longitude: membership.stop.longitude
      }
    }))
  };
}

export function requirePassengerStopPair(
  route: EligibleOperationalRoute,
  pickupStopId: string,
  dropoffStopId: string
) {
  const pickup = route.stops.find((membership) => membership.stopId === pickupStopId);
  const dropoff = route.stops.find((membership) => membership.stopId === dropoffStopId);
  if (!pickup || !dropoff) throw new HttpError(400, "invalid_route_stop");
  if (!pickup.passengerPickup || !dropoff.passengerDropoff) {
    throw new HttpError(400, "stop_permission_denied");
  }
  if (pickup.sequence >= dropoff.sequence) throw new HttpError(400, "invalid_stop_order");
  return { pickup, dropoff };
}

export function requireMerchantStops(
  route: EligibleOperationalRoute,
  pickupStopId: string,
  destinationStopIds: string[]
) {
  const pickup = route.stops.find((membership) => membership.stopId === pickupStopId);
  if (!pickup) throw new HttpError(400, "invalid_route_stop");
  if (!pickup.parcelPickup) throw new HttpError(400, "stop_permission_denied");
  const destinations = destinationStopIds.map((stopId) => {
    const destination = route.stops.find((membership) => membership.stopId === stopId);
    if (!destination) throw new HttpError(400, "invalid_route_stop");
    if (!destination.parcelDropoff) throw new HttpError(400, "stop_permission_denied");
    if (destination.sequence <= pickup.sequence) throw new HttpError(400, "invalid_stop_order");
    return destination;
  });
  return { pickup, destinations };
}
