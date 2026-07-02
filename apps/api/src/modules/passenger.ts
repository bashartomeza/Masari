import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AuditAction } from "../generated/prisma/enums.js";

const coordinate = z.coerce.number().finite();

const createPassengerRequestSchema = z.object({
  pickup_label: z.string().min(1),
  pickup_lat: coordinate,
  pickup_lng: coordinate,
  destination_label: z.string().min(1),
  destination_lat: coordinate,
  destination_lng: coordinate,
  preferred_time: z.coerce.date(),
  passenger_count: z.coerce.number().int().min(1).max(4)
});

export const passengerRouter = Router();

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_route_param");
  }
  return value;
}

passengerRouter.use("/passenger", requireAuth, requireRole("passenger"));

passengerRouter.post("/passenger/requests", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = createPassengerRequestSchema.parse(req.body);
    const created = await prisma.passengerRequest.create({
      data: {
        passenger_id: req.user!.id,
        pickup_label: input.pickup_label,
        pickup_lat: input.pickup_lat.toFixed(6),
        pickup_lng: input.pickup_lng.toFixed(6),
        destination_label: input.destination_label,
        destination_lat: input.destination_lat.toFixed(6),
        destination_lng: input.destination_lng.toFixed(6),
        preferred_time: input.preferred_time,
        passenger_count: input.passenger_count,
        status: "pending",
        source: "manual"
      }
    });

    await auditEvent(prisma, {
      userId: req.user!.id,
      action: AuditAction.passenger_request_created,
      entityType: "PassengerRequest",
      entityId: created.id
    });

    res.status(201).json({ request: created });
  } catch (error) {
    next(error);
  }
});

passengerRouter.get("/passenger/requests", async (req: AuthenticatedRequest, res, next) => {
  try {
    const requests = await prisma.passengerRequest.findMany({
      where: { passenger_id: req.user!.id },
      orderBy: { created_at: "desc" }
    });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

passengerRouter.get("/passenger/requests/active", async (req: AuthenticatedRequest, res, next) => {
  try {
    const requests = await prisma.passengerRequest.findMany({
      where: {
        passenger_id: req.user!.id,
        status: { in: ["pending", "matched", "accepted", "picked_up", "in_transit"] }
      },
      orderBy: { created_at: "desc" }
    });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

passengerRouter.get("/passenger/requests/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const requestId = routeParam(req.params.id);
    const request = await prisma.passengerRequest.findFirst({
      where: { id: requestId, passenger_id: req.user!.id }
    });
    if (!request) {
      throw new HttpError(404, "request_not_found");
    }
    res.json({ request });
  } catch (error) {
    next(error);
  }
});

passengerRouter.patch("/passenger/requests/:id/cancel", async (req: AuthenticatedRequest, res, next) => {
  try {
    const requestId = routeParam(req.params.id);
    const existing = await prisma.passengerRequest.findFirst({
      where: { id: requestId, passenger_id: req.user!.id }
    });
    if (!existing) {
      throw new HttpError(404, "request_not_found");
    }
    if (existing.status !== "pending" && existing.status !== "matched") {
      throw new HttpError(409, "request_cannot_be_cancelled");
    }

    const request = await prisma.passengerRequest.update({
      where: { id: existing.id },
      data: { status: "cancelled" }
    });

    await auditEvent(prisma, {
      userId: req.user!.id,
      action: AuditAction.passenger_request_cancelled,
      entityType: "PassengerRequest",
      entityId: request.id,
      metadata: { previous_status: existing.status }
    });

    res.json({ request });
  } catch (error) {
    next(error);
  }
});
