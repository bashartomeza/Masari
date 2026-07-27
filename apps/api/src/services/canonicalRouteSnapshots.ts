import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware/error.js";

export const ROUTE_SNAPSHOT_VERSION = "canonical_route_snapshot_v1";
const MAXIMUM_SNAPSHOT_BYTES = 32_768;

type Database = PrismaClient | Prisma.TransactionClient;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

export function createCanonicalRouteSnapshotService(db: PrismaClient = prisma) {
  return {
    async build(
      input: {
        routeVersionId: string;
        pickupStopId: string;
        destinationStopIds: string[];
        operationalMode: "canonical_route_v1";
        demand?: {
          type: "passenger" | "merchant_order";
          passengerCount: number;
          parcelCount: number;
          destinationStopIds: string[];
        };
      },
      transaction?: Prisma.TransactionClient
    ) {
      const client: Database = transaction ?? db;
      const version = await client.serviceRouteVersion.findUnique({
        where: { id: input.routeVersionId },
        include: {
          service_route: true,
          origin_stop: true,
          destination_stop: true,
          stops: { include: { stop: true }, orderBy: { sequence: "asc" } }
        }
      });
      if (
        !version ||
        version.service_route.status !== "active" ||
        version.service_route.current_version_id !== version.id ||
        version.status !== "published"
      ) throw new HttpError(409, "route_version_not_available");
      const pickup = version.stops.find((membership) => membership.stop_id === input.pickupStopId);
      const destinations = [...new Set(input.destinationStopIds)]
        .map((id) => version.stops.find((membership) => membership.stop_id === id))
        .filter((membership): membership is NonNullable<typeof membership> => Boolean(membership))
        .sort((left, right) => left.sequence - right.sequence);
      if (
        !pickup ||
        destinations.length !== new Set(input.destinationStopIds).size ||
        destinations.length === 0 ||
        destinations.some((destination) => destination.sequence <= pickup.sequence)
      ) throw new HttpError(409, "canonical_stop_order_mismatch");
      const finalSequence = destinations.at(-1)!.sequence;
      const stopSummary = (membership: typeof pickup) => ({
        id: membership.stop.id,
        stop_key: membership.stop.stop_key,
        name_ar: membership.stop.name_ar,
        name_en: membership.stop.name_en,
        sequence: membership.sequence
      });
      const snapshot = canonicalize({
        schema_version: ROUTE_SNAPSHOT_VERSION,
        operational_mode: input.operationalMode,
        route: {
          id: version.service_route.id,
          route_key: version.service_route.route_key,
          direction: version.service_route.direction,
          name_ar: version.name_ar,
          name_en: version.name_en
        },
        route_version: {
          id: version.id,
          version_number: version.version_number,
          status: version.status,
          published_at: version.published_at?.toISOString() ?? null,
          active_from: version.active_from?.toISOString() ?? null,
          active_until: version.active_until?.toISOString() ?? null
        },
        origin_stop: version.origin_stop
          ? { id: version.origin_stop.id, name_ar: version.origin_stop.name_ar, name_en: version.origin_stop.name_en }
          : null,
        destination_stop: version.destination_stop
          ? { id: version.destination_stop.id, name_ar: version.destination_stop.name_ar, name_en: version.destination_stop.name_en }
          : null,
        ...(input.demand
          ? {
              demand_summary: input.demand.type === "passenger"
                ? {
                    type: "passenger",
                    passenger_count: input.demand.passengerCount,
                    selected_destination_stop_ids: [...input.demand.destinationStopIds]
                  }
                : {
                    type: "merchant_order",
                    parcel_count: input.demand.parcelCount,
                    selected_destination_stop_ids: [...input.demand.destinationStopIds]
                  }
            }
          : {}),
        selected_pickup: stopSummary(pickup),
        selected_destinations: destinations.map(stopSummary),
        ordered_relevant_stops: version.stops
          .filter((membership) => membership.sequence >= pickup.sequence && membership.sequence <= finalSequence)
          .map(stopSummary)
      }) as Prisma.InputJsonObject;
      const encoded = JSON.stringify(snapshot);
      if (Buffer.byteLength(encoded, "utf8") > MAXIMUM_SNAPSHOT_BYTES) {
        throw new HttpError(409, "canonical_route_snapshot_too_large");
      }
      return {
        schemaVersion: ROUTE_SNAPSHOT_VERSION,
        snapshot,
        checksum: createHash("sha256").update(encoded).digest("hex")
      };
    }
  };
}

export const canonicalRouteSnapshotService = createCanonicalRouteSnapshotService();
