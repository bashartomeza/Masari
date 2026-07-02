import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { DEMO_ROUTE_POINTS } from "../lib/geo.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AuditAction, MatchStatus, TripStatus } from "../generated/prisma/enums.js";

export const tripsRouter = Router();

const ACTIVE_TRIP_STATUSES = ["created", "accepted", "pickup_started", "picked_up", "in_transit", "delivered"] as const;
const statusSchema = z.object({ status: z.enum(["pickup_started", "picked_up", "in_transit", "delivered", "completed", "cancelled"]) });

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string") throw new HttpError(400, "invalid_route_param");
  return value;
}

function nextStatusAllowed(current: string, next: string) {
  const transitions: Record<string, string[]> = {
    accepted: ["pickup_started", "cancelled"],
    pickup_started: ["picked_up", "cancelled"],
    picked_up: ["in_transit", "cancelled"],
    in_transit: ["delivered", "cancelled"],
    delivered: ["completed"],
    completed: [],
    cancelled: []
  };
  return transitions[current]?.includes(next) ?? false;
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

  if (req.user!.role === "admin") return trip;
  if (req.user!.role === "driver" && trip.driver_route.driver.user_id === req.user!.id) return trip;
  if (req.user!.role === "passenger" && trip.passenger_request?.passenger_id === req.user!.id) return trip;
  if (req.user!.role === "merchant" && trip.merchant_order?.merchant_id === req.user!.id) return trip;

  throw new HttpError(403, "forbidden");
}

function tripWhereForUser(req: AuthenticatedRequest) {
  if (req.user!.role === "admin") return {};
  if (req.user!.role === "driver") return { driver_route: { driver: { user_id: req.user!.id } } };
  if (req.user!.role === "passenger") return { passenger_request: { passenger_id: req.user!.id } };
  return { merchant_order: { merchant_id: req.user!.id } };
}

tripsRouter.post("/matches/:id/accept", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const matchId = routeParam(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
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
      if (match.status !== MatchStatus.proposed && match.status !== MatchStatus.sent_to_driver) {
        throw new HttpError(409, "match_cannot_be_accepted");
      }

      const duplicate = await tx.trip.findFirst({
        where: {
          driver_route_id: match.driver_route_id,
          passenger_request_id: match.passenger_request_id,
          merchant_order_id: match.merchant_order_id,
          parcel_batch_id: match.parcel_batch_id,
          status: { in: [...ACTIVE_TRIP_STATUSES] }
        }
      });
      if (duplicate) throw new HttpError(409, "duplicate_active_trip");

      const trip = await tx.trip.create({
        data: {
          driver_id: match.driver_route.driver_id,
          driver_route_id: match.driver_route_id,
          passenger_request_id: match.passenger_request_id,
          merchant_order_id: match.merchant_order_id,
          parcel_batch_id: match.parcel_batch_id,
          status: TripStatus.accepted,
          started_at: new Date()
        }
      });

      await tx.match.update({ where: { id: match.id }, data: { status: MatchStatus.accepted } });
      await tx.driverRoute.update({ where: { id: match.driver_route_id }, data: { status: "assigned" } });
      if (match.passenger_request_id) await tx.passengerRequest.update({ where: { id: match.passenger_request_id }, data: { status: "accepted" } });
      if (match.parcel_batch_id) await tx.parcelBatch.update({ where: { id: match.parcel_batch_id }, data: { status: "assigned" } });
      if (match.merchant_order_id) {
        await tx.merchantOrder.update({ where: { id: match.merchant_order_id }, data: { status: "assigned" } });
        await tx.parcel.updateMany({ where: { order_id: match.merchant_order_id }, data: { status: "assigned" } });
      }

      await tx.auditEvent.create({
        data: { user_id: req.user!.id, action: AuditAction.match_accepted, entity_type: "Match", entity_id: match.id }
      });

      return { trip, matchId: match.id };
    });

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
    if (match.status !== MatchStatus.proposed && match.status !== MatchStatus.sent_to_driver) throw new HttpError(409, "match_cannot_be_rejected");

    const updated = await prisma.match.update({ where: { id: match.id }, data: { status: MatchStatus.rejected } });
    await auditEvent(prisma, { userId: req.user!.id, action: AuditAction.match_rejected, entityType: "Match", entityId: match.id });
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
    if (!nextStatusAllowed(existing.status, input.status)) throw new HttpError(409, "invalid_trip_status_transition");

    const trip = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: { status: input.status, completed_at: input.status === TripStatus.completed ? new Date() : undefined }
      });

      if (input.status === TripStatus.pickup_started) {
        await tx.driverRoute.update({ where: { id: existing.driver_route_id }, data: { status: "on_trip" } });
      }
      if (input.status === TripStatus.picked_up) {
        if (existing.passenger_request_id) await tx.passengerRequest.update({ where: { id: existing.passenger_request_id }, data: { status: "picked_up" } });
        if (existing.parcel_batch_id) await tx.parcelBatch.update({ where: { id: existing.parcel_batch_id }, data: { status: "picked_up" } });
        if (existing.merchant_order_id) await tx.parcel.updateMany({ where: { order_id: existing.merchant_order_id }, data: { status: "picked_up" } });
      }
      if (input.status === TripStatus.in_transit) {
        if (existing.passenger_request_id) await tx.passengerRequest.update({ where: { id: existing.passenger_request_id }, data: { status: "in_transit" } });
        if (existing.merchant_order_id) await tx.merchantOrder.update({ where: { id: existing.merchant_order_id }, data: { status: "in_transit" } });
        if (existing.parcel_batch_id) await tx.parcelBatch.update({ where: { id: existing.parcel_batch_id }, data: { status: "in_transit" } });
        if (existing.merchant_order_id) await tx.parcel.updateMany({ where: { order_id: existing.merchant_order_id }, data: { status: "in_transit" } });
      }
      if (input.status === TripStatus.delivered) {
        if (existing.passenger_request_id) await tx.passengerRequest.update({ where: { id: existing.passenger_request_id }, data: { status: "delivered" } });
        if (existing.parcel_batch_id) await tx.parcelBatch.update({ where: { id: existing.parcel_batch_id }, data: { status: "delivered" } });
        if (existing.merchant_order_id) {
          await tx.parcel.updateMany({ where: { order_id: existing.merchant_order_id }, data: { status: "delivered" } });
          await tx.merchantOrder.update({ where: { id: existing.merchant_order_id }, data: { status: "completed" } });
        }
      }
      if (input.status === TripStatus.completed) {
        await tx.driverRoute.update({ where: { id: existing.driver_route_id }, data: { status: "completed", completed_at: new Date() } });
      }

      await tx.auditEvent.create({
        data: {
          user_id: req.user!.id,
          action: AuditAction.trip_status_updated,
          entity_type: "Trip",
          entity_id: tripId,
          metadata: { from: existing.status, to: input.status }
        }
      });

      return updated;
    });

    res.json({ trip });
  } catch (error) {
    next(error);
  }
});

tripsRouter.post("/trips/:id/simulate/step", requireAuth, async (req: AuthenticatedRequest, res, next) => {
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

tripsRouter.post("/trips/:id/simulate/reset", requireAuth, async (req: AuthenticatedRequest, res, next) => {
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
