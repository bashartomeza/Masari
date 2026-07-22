import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { latitudeSchema, longitudeSchema } from "../lib/validation.js";

const createPassengerRequestSchema = z.object({
  pickup_label: z.string().min(1),
  pickup_lat: latitudeSchema,
  pickup_lng: longitudeSchema,
  destination_label: z.string().min(1),
  destination_lat: latitudeSchema,
  destination_lng: longitudeSchema,
  preferred_time: z.coerce.date(),
  passenger_count: z.coerce.number().int().min(1).max(4)
});

export const passengerRouter = Router();

function serializeLegacyPassengerRequest(value: Record<string, unknown>) {
  return {
    id: value.id,
    passenger_id: value.passenger_id,
    pickup_label: value.pickup_label,
    pickup_lat: value.pickup_lat,
    pickup_lng: value.pickup_lng,
    destination_label: value.destination_label,
    destination_lat: value.destination_lat,
    destination_lng: value.destination_lng,
    preferred_time: value.preferred_time,
    passenger_count: value.passenger_count,
    status: value.status,
    source: value.source,
    created_at: value.created_at
  };
}

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

    res.status(201).json({ request: serializeLegacyPassengerRequest(created as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
});

passengerRouter.get("/passenger/requests", async (req: AuthenticatedRequest, res, next) => {
  try {
    const requests = await prisma.passengerRequest.findMany({
      where: { passenger_id: req.user!.id, canonical_entry_version: null },
      orderBy: { created_at: "desc" }
    });
    res.json({ requests: requests.map((request) => serializeLegacyPassengerRequest(request as unknown as Record<string, unknown>)) });
  } catch (error) {
    next(error);
  }
});

passengerRouter.get("/passenger/requests/active", async (req: AuthenticatedRequest, res, next) => {
  try {
    const requests = await prisma.passengerRequest.findMany({
      where: {
        passenger_id: req.user!.id,
        canonical_entry_version: null,
        status: { in: ["pending", "matched", "accepted", "picked_up", "in_transit"] }
      },
      orderBy: { created_at: "desc" }
    });
    res.json({ requests: requests.map((request) => serializeLegacyPassengerRequest(request as unknown as Record<string, unknown>)) });
  } catch (error) {
    next(error);
  }
});

passengerRouter.get("/passenger/requests/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const requestId = routeParam(req.params.id);
    const request = await prisma.passengerRequest.findFirst({
      where: { id: requestId, passenger_id: req.user!.id, canonical_entry_version: null }
    });
    if (!request) {
      throw new HttpError(404, "request_not_found");
    }
    res.json({ request: serializeLegacyPassengerRequest(request as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
});

passengerRouter.patch("/passenger/requests/:id/cancel", async (req: AuthenticatedRequest, res, next) => {
  try {
    const requestId = routeParam(req.params.id);
    const existing = await prisma.passengerRequest.findFirst({
      where: { id: requestId, passenger_id: req.user!.id, canonical_entry_version: null }
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

    res.json({ request: serializeLegacyPassengerRequest(request as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
});
