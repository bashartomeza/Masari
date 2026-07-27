import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { CanonicalRejectReason } from "../generated/prisma/enums.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError, notFoundHandler } from "../middleware/error.js";
import {
  canonicalMatchingService,
  type CanonicalMatchingService
} from "../services/canonicalMatching.js";

const id = z.string().min(1).max(191);
const idempotencyKey = z.string().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const page = z.strictObject({
  cursor: z.string().min(1).max(191).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25)
});
const rejectBody = z.strictObject({ reason: z.nativeEnum(CanonicalRejectReason) });

function requireKey(req: AuthenticatedRequest) {
  const parsed = idempotencyKey.safeParse(req.header("idempotency-key"));
  if (!parsed.success) throw new HttpError(400, "invalid_or_missing_idempotency_key");
  return parsed.data;
}

function offerResponse(offer: Record<string, any>) {
  const passenger = offer.passenger_request;
  const merchant = offer.merchant_order;
  return {
    id: offer.id,
    status: offer.status,
    demand_type: passenger ? "passenger" : "merchant_order",
    route_version_id: offer.route_version_id,
    attempt_number: offer.attempt_number,
    offered_at: offer.offered_at,
    expires_at: offer.expires_at,
    departure_at: offer.driver_route?.departure_at,
    demand: passenger
      ? {
          passenger_count: passenger.passenger_count,
          pickup_stop_id: passenger.pickup_stop_id,
          dropoff_stop_id: passenger.dropoff_stop_id,
          requested_departure_from: passenger.requested_departure_from,
          requested_departure_until: passenger.requested_departure_until
        }
      : {
          parcel_count: merchant?._count?.parcels ?? merchant?.parcels?.length,
          pickup_stop_id: merchant?.pickup_stop_id,
          destination_stop_ids: merchant?.parcels?.map((parcel: Record<string, unknown>) => parcel.destination_stop_id),
          requested_departure_from: merchant?.requested_departure_from,
          requested_departure_until: merchant?.requested_departure_until
        }
  };
}

function statusResponse(resource: Record<string, any>) {
  const dispatch = resource.canonical_dispatch;
  const trip = dispatch?.assigned_trip;
  return {
    id: resource.id,
    status: resource.status,
    route_version_id: resource.route_version_id,
    pickup_stop_id: resource.pickup_stop_id,
    dropoff_stop_id: resource.dropoff_stop_id,
    requested_departure_from: resource.requested_departure_from,
    requested_departure_until: resource.requested_departure_until,
    dispatch_status: dispatch?.status ?? "pending",
    offer_pending: dispatch?.status === "offered",
    assigned: dispatch?.status === "assigned",
    trip: trip ? { id: trip.id, status: trip.status, vehicle_type: trip.driver_route.driver.vehicle_type } : null,
    created_at: resource.canonical_created_at ?? resource.created_at,
    updated_at: dispatch?.updated_at ?? resource.created_at,
    ...(resource.parcels
      ? {
          parcels: resource.parcels.map((parcel: Record<string, unknown>) => ({
            id: parcel.id,
            status: parcel.status,
            destination_stop_id: parcel.destination_stop_id
          }))
        }
      : {})
  };
}

export function createCanonicalMatchingRouter(
  appConfig: AppConfig,
  service: CanonicalMatchingService = canonicalMatchingService
) {
  const router = Router();
  if (!appConfig.multiRouteEntryEnabled || !appConfig.multiRouteMatchingEnabled || !appConfig.canonicalTripCreationEnabled) {
    router.use("/driver/canonical-match-offers", notFoundHandler);
    router.use("/passenger/route-requests", notFoundHandler);
    router.use("/merchant/route-orders", notFoundHandler);
    return router;
  }

  router.get("/driver/canonical-match-offers", requireAuth, requireRole("driver"), async (req: AuthenticatedRequest, res, next) => {
    try {
      const query = page.parse(req.query);
      await service.assertDriverEligible(req.user!.id);
      const offers = await service.listDriverOffers(req.user!.id, query);
      res.json({ offers: offers.map((offer) => offerResponse(offer)), next_cursor: offers.length === query.limit ? offers.at(-1)!.id : null, request_id: req.requestId });
    } catch (error) { next(error); }
  });

  router.get("/driver/canonical-match-offers/:id", requireAuth, requireRole("driver"), async (req: AuthenticatedRequest, res, next) => {
    try {
      await service.assertDriverEligible(req.user!.id);
      const offer = await service.getDriverOffer(req.user!.id, id.parse(req.params.id));
      res.json({ offer: offerResponse(offer), request_id: req.requestId });
    } catch (error) { next(error); }
  });

  router.post("/driver/canonical-match-offers/:id/accept", requireAuth, requireRole("driver"), async (req: AuthenticatedRequest, res, next) => {
    try {
      await service.assertDriverEligible(req.user!.id);
      const result = await service.accept(req.user!.id, id.parse(req.params.id), {
        id: req.user!.id,
        requestId: req.requestId,
        idempotencyKey: requireKey(req)
      });
      res.json({ trip: { id: result.trip.id, status: result.trip.status, route_version_id: result.trip.route_version_id }, replayed: result.replayed, request_id: req.requestId });
    } catch (error) { next(error); }
  });

  router.post("/driver/canonical-match-offers/:id/reject", requireAuth, requireRole("driver"), async (req: AuthenticatedRequest, res, next) => {
    try {
      await service.assertDriverEligible(req.user!.id);
      const body = rejectBody.parse(req.body);
      const result = await service.reject(req.user!.id, id.parse(req.params.id), body.reason, {
        id: req.user!.id,
        requestId: req.requestId,
        idempotencyKey: requireKey(req)
      });
      res.json({ offer: { id: result.offer.id, status: result.offer.status, reject_reason: result.offer.reject_reason }, replayed: result.replayed, request_id: req.requestId });
    } catch (error) { next(error); }
  });

  router.get("/passenger/route-requests", requireAuth, requireRole("passenger"), async (req: AuthenticatedRequest, res, next) => {
    try {
      const query = page.parse(req.query);
      const resources = await service.passengerStatus(req.user!.id, undefined, query.limit);
      res.json({ requests: resources.map((resource) => statusResponse(resource)), request_id: req.requestId });
    } catch (error) { next(error); }
  });

  router.get("/passenger/route-requests/:id", requireAuth, requireRole("passenger"), async (req: AuthenticatedRequest, res, next) => {
    try {
      const resources = await service.passengerStatus(req.user!.id, id.parse(req.params.id), 1);
      if (!resources[0]) throw new HttpError(404, "canonical_route_request_not_found");
      res.json({ request: statusResponse(resources[0]), request_id: req.requestId });
    } catch (error) { next(error); }
  });

  router.get("/merchant/route-orders", requireAuth, requireRole("merchant"), async (req: AuthenticatedRequest, res, next) => {
    try {
      const query = page.parse(req.query);
      const resources = await service.merchantStatus(req.user!.id, undefined, query.limit);
      res.json({ orders: resources.map((resource) => statusResponse(resource)), request_id: req.requestId });
    } catch (error) { next(error); }
  });

  router.get("/merchant/route-orders/:id", requireAuth, requireRole("merchant"), async (req: AuthenticatedRequest, res, next) => {
    try {
      const resources = await service.merchantStatus(req.user!.id, id.parse(req.params.id), 1);
      if (!resources[0]) throw new HttpError(404, "canonical_route_order_not_found");
      res.json({ order: statusResponse(resources[0]), request_id: req.requestId });
    } catch (error) { next(error); }
  });
  return router;
}

export const canonicalMatchingSerializers = { offerResponse, statusResponse };
