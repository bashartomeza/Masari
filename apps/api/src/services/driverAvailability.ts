import { createHash } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { auditEvent } from "../lib/audit.js";
import { claimIdempotency, completeIdempotency } from "../lib/idempotency.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware/error.js";

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export type DriverAvailabilityInput = {
  routeVersionId: string;
  departureAt: Date;
  availabilityWindowEnd?: Date | null;
  totalSeats: number;
  totalParcelCapacity: number;
};

export function createDriverAvailabilityService(db: PrismaClient = prisma) {
  return {
    async createOneOff(
      input: DriverAvailabilityInput,
      actor: { id: string; requestId?: string; idempotencyKey: string }
    ) {
      if (input.departureAt <= new Date()) throw new HttpError(400, "departure_must_be_future");
      if (input.availabilityWindowEnd && input.availabilityWindowEnd < input.departureAt) {
        throw new HttpError(400, "invalid_availability_window");
      }
      return db.$transaction(async (tx) => {
        const claim = await claimIdempotency(tx, {
          operation: "driver_availability_create",
          scopeDigest: digest(`driver-availability:${actor.id}`),
          keyDigest: digest(actor.idempotencyKey),
          keyVersion: 1,
          requestDigest: digest(JSON.stringify(input)),
          expiresAt: new Date(Date.now() + 86_400_000)
        });
        if (claim.kind === "conflict") throw new HttpError(409, "idempotency_conflict");
        if (claim.kind === "in_progress") throw new HttpError(409, "idempotency_in_progress");
        if (claim.kind === "failed") throw new HttpError(409, "idempotency_failed");
        if (claim.kind === "replay") {
          if (claim.record.resource_type !== "DriverRoute" || !claim.record.resource_id) {
            throw new HttpError(409, "idempotency_replay_unavailable");
          }
          const replay = await tx.driverRoute.findUnique({ where: { id: claim.record.resource_id } });
          if (!replay) throw new HttpError(409, "idempotency_replay_unavailable");
          return { resource: replay, replayed: true };
        }
        const profile = await tx.driverProfile.findUnique({ where: { user_id: actor.id } });
        if (!profile) throw new HttpError(404, "driver_profile_not_found");
        if (input.totalSeats > profile.seats_total || input.totalParcelCapacity > profile.parcel_capacity) {
          throw new HttpError(400, "availability_exceeds_vehicle_capacity");
        }
        const version = await tx.serviceRouteVersion.findUnique({
          where: { id: input.routeVersionId },
          include: { service_route: true, origin_stop: true, destination_stop: true }
        });
        if (
          !version ||
          version.status !== "published" ||
          version.service_route.status !== "active" ||
          version.service_route.current_version_id !== version.id ||
          !version.origin_stop ||
          !version.destination_stop
        ) {
          throw new HttpError(409, "route_version_not_available");
        }
        const resource = await tx.driverRoute.create({
          data: {
            driver_id: profile.id,
            route_version_id: version.id,
            origin_label: version.origin_stop.name_en,
            origin_lat: version.origin_stop.latitude,
            origin_lng: version.origin_stop.longitude,
            destination_label: version.destination_stop.name_en,
            destination_lat: version.destination_stop.latitude,
            destination_lng: version.destination_stop.longitude,
            corridor_key: version.service_route.route_key,
            seats_available: input.totalSeats,
            parcel_capacity_available: input.totalParcelCapacity,
            total_seats: input.totalSeats,
            remaining_seats: input.totalSeats,
            total_parcel_capacity: input.totalParcelCapacity,
            remaining_parcel_capacity: input.totalParcelCapacity,
            departure_at: input.departureAt,
            availability_window_end: input.availabilityWindowEnd ?? null,
            availability_status: "draft",
            status: "inactive"
          }
        });
        await auditEvent(tx, {
          userId: actor.id,
          action: AuditAction.driver_availability_created,
          entityType: "DriverRoute",
          entityId: resource.id,
          metadata: { route_version_id: version.id, transition: "created_draft", request_id: actor.requestId }
        });
        await completeIdempotency(tx, {
          recordId: claim.record.id,
          claimVersion: claim.record.claim_version,
          resourceType: "DriverRoute",
          resourceId: resource.id,
          responseStatus: 201
        });
        return { resource, replayed: false };
      });
    }
  };
}

export type DriverAvailabilityService = ReturnType<typeof createDriverAvailabilityService>;
export const driverAvailabilityService = createDriverAvailabilityService();
