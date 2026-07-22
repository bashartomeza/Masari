import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware/error.js";

export const ROUTE_SNAPSHOT_VERSION = "canonical_trip_route_v1";

export function createCanonicalRouteSnapshotService(db: PrismaClient = prisma) {
  return {
    async build(input: { routeVersionId: string; pickupStopId: string; destinationStopId: string }) {
      const version = await db.serviceRouteVersion.findUnique({
        where: { id: input.routeVersionId },
        include: {
          service_route: true,
          stops: { include: { stop: true }, orderBy: { sequence: "asc" } }
        }
      });
      if (!version || version.status === "draft") throw new HttpError(404, "route_version_not_found");
      const pickup = version.stops.find((membership) => membership.stop_id === input.pickupStopId);
      const destination = version.stops.find((membership) => membership.stop_id === input.destinationStopId);
      if (!pickup || !destination || pickup.sequence >= destination.sequence) throw new HttpError(400, "invalid_stop_order");
      const relevantStops = version.stops
        .filter((membership) => membership.sequence >= pickup.sequence && membership.sequence <= destination.sequence)
        .map((membership) => ({
          id: membership.stop.id,
          stop_key: membership.stop.stop_key,
          name_ar: membership.stop.name_ar,
          name_en: membership.stop.name_en,
          sequence: membership.sequence
        }));
      const snapshot = {
        schema_version: ROUTE_SNAPSHOT_VERSION,
        route: {
          id: version.service_route.id,
          route_key: version.service_route.route_key,
          direction: version.service_route.direction
        },
        route_version: {
          id: version.id,
          version_number: version.version_number,
          name_ar: version.name_ar,
          name_en: version.name_en
        },
        pickup_stop_id: input.pickupStopId,
        destination_stop_id: input.destinationStopId,
        stops: relevantStops
      } satisfies Prisma.InputJsonObject;
      const encoded = JSON.stringify(snapshot);
      return { snapshot, checksum: createHash("sha256").update(encoded).digest("hex") };
    }
  };
}

export const canonicalRouteSnapshotService = createCanonicalRouteSnapshotService();
