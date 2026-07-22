import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { lockedCorridorDistanceKm, round } from "../lib/geo.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { LOCKED_CORRIDOR_KEY, LOCKED_CORRIDOR_LABEL } from "./demoReset.js";
import { AuditAction } from "../generated/prisma/enums.js";

export const batchingRouter = Router();

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string") throw new HttpError(400, "invalid_route_param");
  return value;
}

export async function createParcelBatch(req: AuthenticatedRequest, orderId: string) {
  const order = await prisma.merchantOrder.findUnique({
    where: { id: orderId },
    include: { parcels: true, parcel_batches: { select: { id: true }, take: 1 } }
  });
  if (!order) throw new HttpError(404, "order_not_found");
  if (req.user!.role !== "admin" && (req.user!.role !== "merchant" || order.merchant_id !== req.user!.id)) {
    throw new HttpError(403, "forbidden");
  }
  if (order.canonical_entry_version) throw new HttpError(409, "canonical_batching_not_enabled");
  if (order.parcels.length < 1 || order.parcels.length > 10) throw new HttpError(400, "invalid_parcel_count");
  if (order.parcel_batches.length > 0) throw new HttpError(409, "order_already_batched");
  if (order.status !== "submitted") throw new HttpError(409, "order_not_batchable");

  const driverRoute = await prisma.driverRoute.findFirst({
    where: {
      status: "active",
      corridor_key: LOCKED_CORRIDOR_KEY,
      canonical_availability_version: null,
      parcel_capacity_available: { gte: order.parcels.length },
      driver: { verified: true }
    },
    orderBy: { id: "asc" }
  });

  if (!driverRoute) throw new HttpError(404, "no_route_with_parcel_capacity");

  const corridorKm = lockedCorridorDistanceKm();
  const nearestTrips = order.parcels.length;
  const masariTrips = 1;
  const estimatedDistanceSaved = round(Math.max(0, nearestTrips * corridorKm - masariTrips * corridorKm), 2);
  const explanation =
    `${order.parcels.length} parcels are compatible with the ${LOCKED_CORRIDOR_LABEL} corridor and can be grouped into one Masari batch, ` +
    `reducing the baseline from ${nearestTrips} nearest-driver trips to ${masariTrips} corridor trip.`;

  const batch = await prisma.parcelBatch.create({
    data: {
      merchant_order_id: order.id,
      driver_route_id: driverRoute.id,
      status: "created",
      estimated_distance_saved: estimatedDistanceSaved.toFixed(2),
      explanation
    },
    include: { merchant_order: { include: { parcels: true } }, driver_route: true }
  });

  await prisma.merchantOrder.update({ where: { id: order.id }, data: { status: "batched" } });

  await auditEvent(prisma, {
    userId: req.user!.id,
    action: AuditAction.parcel_batch_created,
    entityType: "ParcelBatch",
    entityId: batch.id,
    metadata: { parcel_count: order.parcels.length, estimated_distance_saved: estimatedDistanceSaved }
  });

  return batch;
}

batchingRouter.post("/merchant/orders/:id/batch", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.user!.role !== "merchant" && req.user!.role !== "admin") throw new HttpError(403, "forbidden");
    const batch = await createParcelBatch(req, routeParam(req.params.id));
    res.status(201).json({ batch });
  } catch (error) {
    next(error);
  }
});
