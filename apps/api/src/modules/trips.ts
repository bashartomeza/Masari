import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { DEMO_ROUTE_POINTS } from "../lib/geo.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AuditAction, MatchStatus, TripStatus } from "../generated/prisma/enums.js";
import { advanceLegacyTrip, isLegacyTripTransitionAllowed } from "../services/tripLifecycle.js";
import { legacyParcelUnits, reserveLegacyCapacity, releaseLegacyCapacity } from "../services/legacyCapacity.js";

export const tripsRouter = Router();
export const trackingSimulationRouter = Router();

const ACTIVE_TRIP_STATUSES = ["created", "accepted", "pickup_started", "picked_up", "in_transit", "delivered"] as const;
const statusSchema = z.object({ status: z.enum(["pickup_started", "picked_up", "in_transit", "delivered", "completed", "cancelled", "failed"]) });

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string") throw new HttpError(400, "invalid_route_param");
  return value;
}

async function getVisibleTrip(id: string, req: AuthenticatedRequest) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      driver_route: { include: { driver: true } },
      passenger_request: true,
      merchant_order: { include: { parcels: true } },
      parcel_batch: true
    }
  });
  if (!trip) throw new HttpError(404, "trip_not_found");
  if (
    ((trip as typeof trip & { operational_mode?: string }).operational_mode ?? "legacy") !== "legacy" ||
    trip.canonical_trip_version
  ) throw new HttpError(404, "trip_not_found");

  if (req.user!.role === "admin") return trip;
  if (req.user!.role === "driver" && trip.driver_route.driver.user_id === req.user!.id) return trip;
  if (req.user!.role === "passenger" && trip.passenger_request?.passenger_id === req.user!.id) return trip;
  if (req.user!.role === "merchant" && trip.merchant_order?.merchant_id === req.user!.id) return trip;

  throw new HttpError(403, "forbidden");
}

function tripWhereForUser(req: AuthenticatedRequest) {
  const legacy = { operational_mode: "legacy", canonical_trip_version: null };
  if (req.user!.role === "admin") return legacy;
  if (req.user!.role === "driver") return { ...legacy, driver_route: { driver: { user_id: req.user!.id } } };
  if (req.user!.role === "passenger") return { ...legacy, passenger_request: { passenger_id: req.user!.id } };
  return { ...legacy, merchant_order: { merchant_id: req.user!.id } };
}

tripsRouter.post("/matches/:id/accept", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const matchId = routeParam(req.params.id);
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const match = await tx.match.findUnique({
          where: { id: matchId },
          include: {
            driver_route: { include: { driver: true } },
            passenger_request: true,
            merchant_order: { include: { parcels: true } },
            parcel_batch: true
          }
        });
        if (!match) throw new HttpError(404, "match_not_found");
        if (req.user!.role !== "admin" && (req.user!.role !== "driver" || match.driver_route.driver.user_id !== req.user!.id)) {
          throw new HttpError(403, "forbidden");
        }
        if (match.operational_mode !== "legacy" || match.canonical_match_version || match.route_version_id) {
          throw new HttpError(409, "canonical_matching_not_enabled");
        }
        if (match.status !== MatchStatus.proposed && match.status !== MatchStatus.sent_to_driver) {
          throw new HttpError(409, "match_cannot_be_accepted");
        }

        const duplicate = await tx.trip.findFirst({
          where: match.passenger_request_id
            ? {
                passenger_request_id: match.passenger_request_id,
                operational_mode: "legacy"
              }
            : {
                driver_route_id: match.driver_route_id,
                passenger_request_id: null,
                merchant_order_id: match.merchant_order_id,
                parcel_batch_id: match.parcel_batch_id,
                status: { in: [...ACTIVE_TRIP_STATUSES] }
              }
        });
        if (duplicate) throw new HttpError(409, "duplicate_active_trip");

        if (match.passenger_request_id) {
          const claimedRequest = await tx.passengerRequest.updateMany({
            where: {
              id: match.passenger_request_id,
              status: { in: ["pending", "matched"] }
            },
            data: { status: "accepted" }
          });
          if (claimedRequest.count !== 1) throw new HttpError(409, "passenger_request_not_accepting_matches");
        }

        if (!match.legacy_capacity_held) {
          const passengerSeats = match.passenger_request?.passenger_count ?? 0;
          const parcelUnits = await legacyParcelUnits(tx, {
            parcelBatchId: match.parcel_batch_id,
            merchantOrderId: match.parcel_batch_id ? null : match.merchant_order_id
          });
          if (passengerSeats || parcelUnits) {
            await reserveLegacyCapacity(tx, {
              driverRouteId: match.driver_route_id,
              seats: passengerSeats,
              parcelUnits
            });
          }
        }

        const claimedMatch = await tx.match.updateMany({
          where: {
            id: match.id,
            status: { in: [MatchStatus.proposed, MatchStatus.sent_to_driver] }
          },
          data: { status: MatchStatus.accepted, accepted_at: new Date(), legacy_capacity_held: true }
        });
        if (claimedMatch.count !== 1) throw new HttpError(409, "match_cannot_be_accepted");

        const claimedRoute = await tx.driverRoute.updateMany({
          where: { id: match.driver_route_id, status: "active" },
          data: { status: "assigned" }
        });
        if (claimedRoute.count !== 1) throw new HttpError(409, "driver_route_not_available");

        const staleMatches = await tx.match.findMany({
          where: {
            id: { not: match.id },
            driver_route_id: match.driver_route_id,
            operational_mode: "legacy",
            status: { in: [MatchStatus.proposed, MatchStatus.sent_to_driver] }
          },
          select: { id: true, passenger_request_id: true, merchant_order_id: true, parcel_batch_id: true, legacy_capacity_held: true, driver_route_id: true }
        });
        if (staleMatches.length > 0) {
          for (const stale of staleMatches) {
            if (stale.legacy_capacity_held) {
              const seats = stale.passenger_request_id
                ? await tx.passengerRequest.findUnique({ where: { id: stale.passenger_request_id }, select: { passenger_count: true } })
                    .then((request) => request?.passenger_count ?? 0)
                : 0;
              const parcelUnits = await legacyParcelUnits(tx, {
                parcelBatchId: stale.parcel_batch_id,
                merchantOrderId: stale.parcel_batch_id ? null : stale.merchant_order_id
              });
              await releaseLegacyCapacity(tx, { driverRouteId: stale.driver_route_id, seats, parcelUnits });
            }
          }
          await tx.match.updateMany({
            where: { id: { in: staleMatches.map((item) => item.id) } },
            data: { status: MatchStatus.invalidated, legacy_demand_key: null, legacy_capacity_held: false }
          });
          const merchantBatchIds = staleMatches
            .map((item) => item.parcel_batch_id)
            .filter((id): id is string => id !== null);
          for (const batchId of merchantBatchIds) {
            const batch = await tx.parcelBatch.findUnique({ where: { id: batchId }, select: { id: true, status: true } });
            if (batch && batch.status === "proposed") {
              await tx.parcelBatch.update({ where: { id: batchId }, data: { driver_route_id: null, status: "created" } });
              const members = await tx.parcelBatchOrder.findMany({ where: { parcel_batch_id: batchId, active: true }, select: { merchant_order_id: true } });
              const ids = members.map((member) => member.merchant_order_id);
              if (ids.length) await tx.merchantOrder.updateMany({ where: { id: { in: ids }, status: "matched" }, data: { status: "batched" } });
            }
          }
          const passengerIds = staleMatches
            .map((item) => item.passenger_request_id)
            .filter((id): id is string => id !== null);
          if (passengerIds.length > 0) {
            await tx.passengerRequest.updateMany({
              where: { id: { in: passengerIds }, status: "matched" },
              data: { status: "pending" }
            });
          }
        }

        const trip = await tx.trip.create({
          data: {
            driver_id: match.driver_route.driver_id,
            driver_route_id: match.driver_route_id,
            passenger_request_id: match.passenger_request_id,
            merchant_order_id: match.merchant_order_id,
            parcel_batch_id: match.parcel_batch_id,
            status: TripStatus.accepted,
            legacy_assignment_key: match.passenger_request_id
              ? `passenger:${match.passenger_request_id}`
              : `match:${match.id}`
          }
        });

        if (match.parcel_batch_id) {
          await tx.parcelBatch.update({ where: { id: match.parcel_batch_id }, data: { status: "assigned" } });
          const members = await tx.parcelBatchOrder.findMany({
            where: { parcel_batch_id: match.parcel_batch_id },
            select: { merchant_order_id: true }
          });
          const orderIds = members.map((member) => member.merchant_order_id);
          if (orderIds.length) {
            await tx.merchantOrder.updateMany({ where: { id: { in: orderIds } }, data: { status: "assigned" } });
            await tx.parcel.updateMany({ where: { order_id: { in: orderIds }, batch_id: match.parcel_batch_id }, data: { status: "assigned" } });
          }
        } else if (match.merchant_order_id) {
          await tx.merchantOrder.update({ where: { id: match.merchant_order_id }, data: { status: "assigned" } });
          await tx.parcel.updateMany({ where: { order_id: match.merchant_order_id }, data: { status: "assigned" } });
        }

        await tx.auditEvent.create({
          data: {
            user_id: req.user!.id,
            action: AuditAction.match_accepted,
            entity_type: "Match",
            entity_id: match.id,
            metadata: staleMatches.length > 0 ? { invalidated_competing_matches: staleMatches.length } : undefined
          }
        });

        return { trip, matchId: match.id };
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        throw new HttpError(409, "duplicate_active_trip");
      }
      throw error;
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

tripsRouter.post("/matches/:id/reject", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const matchId = routeParam(req.params.id);
    const match = await prisma.match.findUnique({ where: { id: matchId }, include: { driver_route: { include: { driver: true } } } });
    if (!match) throw new HttpError(404, "match_not_found");
    if (req.user!.role !== "admin" && (req.user!.role !== "driver" || match.driver_route.driver.user_id !== req.user!.id)) {
      throw new HttpError(403, "forbidden");
    }
    if (match.operational_mode !== "legacy" || match.canonical_match_version || match.route_version_id) throw new HttpError(409, "canonical_matching_not_enabled");
    if (match.status !== MatchStatus.proposed && match.status !== MatchStatus.sent_to_driver) throw new HttpError(409, "match_cannot_be_rejected");

    const updated = await prisma.$transaction(async (tx) => {
      if (match.legacy_capacity_held) {
        const seats = match.passenger_request_id
          ? await tx.passengerRequest.findUnique({ where: { id: match.passenger_request_id }, select: { passenger_count: true } })
              .then((request) => request?.passenger_count ?? 0)
          : 0;
        const parcelUnits = await legacyParcelUnits(tx, {
          parcelBatchId: match.parcel_batch_id,
          merchantOrderId: match.parcel_batch_id ? null : match.merchant_order_id
        });
        await releaseLegacyCapacity(tx, {
          driverRouteId: match.driver_route_id,
          seats,
          parcelUnits
        });
      }

      if (match.passenger_request_id) {
        await tx.passengerRequest.updateMany({
          where: { id: match.passenger_request_id, status: "matched" },
          data: { status: "pending" }
        });
      }

      if (match.merchant_order_id) {
        const batch = match.parcel_batch_id
          ? await tx.parcelBatch.findUnique({ where: { id: match.parcel_batch_id }, select: { id: true, driver_route_id: true, status: true } })
          : null;
        if (batch) {
          await tx.parcelBatch.update({ where: { id: batch.id }, data: { driver_route_id: null, status: "created" } });
          const members = await tx.parcelBatchOrder.findMany({ where: { parcel_batch_id: batch.id }, select: { merchant_order_id: true } });
          const orderIds = members.map((member) => member.merchant_order_id);
          if (orderIds.length) await tx.merchantOrder.updateMany({ where: { id: { in: orderIds }, status: "matched" }, data: { status: "batched" } });
        } else {
          await tx.merchantOrder.updateMany({ where: { id: match.merchant_order_id, status: "matched" }, data: { status: "submitted" } });
        }
      }

      await tx.driverRoute.update({ where: { id: match.driver_route_id }, data: { status: "active" } });

      const changed = await tx.match.updateMany({
        where: {
          id: match.id,
          status: { in: [MatchStatus.proposed, MatchStatus.sent_to_driver] }
        },
        data: { status: MatchStatus.rejected, legacy_demand_key: null, rejected_at: new Date(), legacy_capacity_held: false }
      });
      if (changed.count !== 1) throw new HttpError(409, "match_cannot_be_rejected");
      await tx.auditEvent.create({
        data: { user_id: req.user!.id, action: AuditAction.match_rejected, entity_type: "Match", entity_id: match.id }
      });
      return { ...match, status: MatchStatus.rejected, legacy_demand_key: null };
    });
    res.json({ match: updated });
  } catch (error) {
    next(error);
  }
});

tripsRouter.get("/trips", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const trips = await prisma.trip.findMany({
      where: tripWhereForUser(req),
      include: { driver_route: true, passenger_request: true, merchant_order: true, parcel_batch: true },
      orderBy: { created_at: "desc" }
    });
    res.json({ trips });
  } catch (error) {
    next(error);
  }
});

tripsRouter.get("/trips/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const trip = await getVisibleTrip(routeParam(req.params.id), req);
    res.json({ trip });
  } catch (error) {
    next(error);
  }
});

tripsRouter.post("/trips/:id/status", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const tripId = routeParam(req.params.id);
    const input = statusSchema.parse(req.body);
    const existing = await getVisibleTrip(tripId, req);
    if (req.user!.role !== "admin" && (req.user!.role !== "driver" || existing.driver_route.driver.user_id !== req.user!.id)) {
      throw new HttpError(403, "forbidden");
    }
    if (!isLegacyTripTransitionAllowed(existing.status, input.status)) throw new HttpError(409, "invalid_trip_status_transition");

    const trip = await prisma.$transaction(async (tx) => {
      return advanceLegacyTrip(tx, existing, input.status, {
        actorId: req.user!.id,
        expectedStatus: existing.status,
      });
    });

    res.json({ trip });
  } catch (error) {
    next(error);
  }
});

trackingSimulationRouter.post("/trips/:id/simulate/step", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const trip = await getVisibleTrip(routeParam(req.params.id), req);
    if (req.user!.role !== "admin" && (req.user!.role !== "driver" || trip.driver_route.driver.user_id !== req.user!.id)) {
      throw new HttpError(403, "forbidden");
    }
    const latest = await prisma.locationEvent.findFirst({ where: { trip_id: trip.id }, orderBy: { sequence: "desc" } });
    const sequence = latest ? latest.sequence + 1 : 0;
    const point = DEMO_ROUTE_POINTS[sequence % DEMO_ROUTE_POINTS.length];
    const location = await prisma.locationEvent.create({
      data: {
        trip_id: trip.id,
        driver_id: trip.driver_id,
        lat: point.lat.toFixed(6),
        lng: point.lng.toFixed(6),
        source: "simulated",
        sequence
      }
    });
    await auditEvent(prisma, { userId: req.user!.id, action: AuditAction.location_recorded, entityType: "LocationEvent", entityId: location.id });
    await auditEvent(prisma, { userId: req.user!.id, action: AuditAction.tracking_simulation_step, entityType: "Trip", entityId: trip.id, metadata: { sequence } });
    res.status(201).json({ location });
  } catch (error) {
    next(error);
  }
});

trackingSimulationRouter.post("/trips/:id/simulate/reset", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const trip = await getVisibleTrip(routeParam(req.params.id), req);
    if (req.user!.role !== "admin" && (req.user!.role !== "driver" || trip.driver_route.driver.user_id !== req.user!.id)) {
      throw new HttpError(403, "forbidden");
    }
    await prisma.locationEvent.deleteMany({ where: { trip_id: trip.id, source: "simulated" } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

tripsRouter.get("/trips/:id/location", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const trip = await getVisibleTrip(routeParam(req.params.id), req);
    const location = await prisma.locationEvent.findFirst({ where: { trip_id: trip.id }, orderBy: { sequence: "desc" } });
    res.json({ location });
  } catch (error) {
    next(error);
  }
});
