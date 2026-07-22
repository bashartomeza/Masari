import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError, notFoundHandler } from "../middleware/error.js";
import {
  canonicalDemandService,
  type CanonicalDemandService
} from "../services/canonicalDemand.js";

const idempotencyKeySchema = z.string().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const dateTime = z.string().datetime({ offset: true }).transform((value) => new Date(value));

const passengerSchema = z.strictObject({
  route_version_id: z.string().min(1).max(191),
  pickup_stop_id: z.string().min(1).max(191),
  dropoff_stop_id: z.string().min(1).max(191),
  requested_departure_from: dateTime,
  requested_departure_until: dateTime,
  passenger_count: z.number().int().min(1).max(8)
});

const canonicalParcelSchema = z.strictObject({
  destination_stop_id: z.string().min(1).max(191),
  size: z.enum(["S", "M", "L"]),
  priority: z.enum(["low", "normal", "high"]).default("normal")
});

const merchantSchema = z.strictObject({
  route_version_id: z.string().min(1).max(191),
  pickup_stop_id: z.string().min(1).max(191),
  requested_departure_from: dateTime,
  requested_departure_until: dateTime,
  parcels: z.array(canonicalParcelSchema).min(1).max(50)
});

function requireIdempotencyKey(req: AuthenticatedRequest) {
  const parsed = idempotencyKeySchema.safeParse(req.header("idempotency-key"));
  if (!parsed.success) throw new HttpError(400, "invalid_or_missing_idempotency_key");
  return parsed.data;
}

function passengerResponse(resource: Record<string, unknown>) {
  return {
    id: resource.id,
    status: resource.status,
    mode: resource.canonical_entry_version,
    route_version_id: resource.route_version_id,
    pickup_stop_id: resource.pickup_stop_id,
    dropoff_stop_id: resource.dropoff_stop_id,
    requested_departure_from: resource.requested_departure_from,
    requested_departure_until: resource.requested_departure_until,
    passenger_count: resource.passenger_count,
    created_at: resource.canonical_created_at
  };
}

function merchantResponse(resource: Record<string, unknown>) {
  return {
    id: resource.id,
    status: resource.status,
    mode: resource.canonical_entry_version,
    route_version_id: resource.route_version_id,
    pickup_stop_id: resource.pickup_stop_id,
    requested_departure_from: resource.requested_departure_from,
    requested_departure_until: resource.requested_departure_until,
    created_at: resource.canonical_created_at,
    parcels: ((resource.parcels as Array<Record<string, unknown>> | undefined) ?? []).map((parcel) => ({
      id: parcel.id,
      status: parcel.status,
      mode: parcel.canonical_entry_version,
      route_version_id: parcel.route_version_id,
      destination_stop_id: parcel.destination_stop_id,
      size: parcel.size,
      priority: parcel.priority
    }))
  };
}

export function createCanonicalDemandRouter(
  appConfig: AppConfig,
  service: CanonicalDemandService = canonicalDemandService
) {
  const router = Router();
  if (!appConfig.multiRouteEntryEnabled) {
    router.use("/passenger/route-requests", notFoundHandler);
    router.use("/merchant/route-orders", notFoundHandler);
    return router;
  }

  router.post(
    "/passenger/route-requests",
    requireAuth,
    requireRole("passenger"),
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const input = passengerSchema.parse(req.body);
        const result = await service.createPassengerRequest(
          {
            routeVersionId: input.route_version_id,
            pickupStopId: input.pickup_stop_id,
            dropoffStopId: input.dropoff_stop_id,
            requestedDepartureFrom: input.requested_departure_from,
            requestedDepartureUntil: input.requested_departure_until,
            passengerCount: input.passenger_count
          },
          { id: req.user!.id, requestId: req.requestId, idempotencyKey: requireIdempotencyKey(req) }
        );
        res.status(result.replayed ? 200 : 201).json({
          request: passengerResponse(result.resource as unknown as Record<string, unknown>),
          matching: { enabled: false, status: "not_active_in_m7c1" },
          replayed: result.replayed,
          request_id: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/merchant/route-orders",
    requireAuth,
    requireRole("merchant"),
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const input = merchantSchema.parse(req.body);
        const result = await service.createMerchantOrder(
          {
            routeVersionId: input.route_version_id,
            pickupStopId: input.pickup_stop_id,
            requestedDepartureFrom: input.requested_departure_from,
            requestedDepartureUntil: input.requested_departure_until,
            parcels: input.parcels.map((parcel) => ({
              destinationStopId: parcel.destination_stop_id,
              size: parcel.size,
              priority: parcel.priority
            }))
          },
          { id: req.user!.id, requestId: req.requestId, idempotencyKey: requireIdempotencyKey(req) }
        );
        res.status(result.replayed ? 200 : 201).json({
          order: merchantResponse(result.resource as unknown as Record<string, unknown>),
          batching: { enabled: false, status: "not_active_in_m7c1" },
          matching: { enabled: false, status: "not_active_in_m7c1" },
          replayed: result.replayed,
          request_id: req.requestId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

export const canonicalDemandSerializers = { passengerResponse, merchantResponse };
