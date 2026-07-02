import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AuditAction } from "../generated/prisma/enums.js";

const coordinate = z.coerce.number().finite();

const parcelSchema = z.object({
  destination_label: z.string().min(1),
  destination_lat: coordinate,
  destination_lng: coordinate,
  size: z.enum(["S", "M", "L"]),
  priority: z.enum(["low", "normal", "high"]).default("normal")
});

const createOrderSchema = z.object({
  pickup_label: z.string().min(1),
  pickup_lat: coordinate,
  pickup_lng: coordinate,
  parcels: z.array(parcelSchema).min(1).max(10)
});

export const merchantRouter = Router();

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_route_param");
  }
  return value;
}

merchantRouter.use("/merchant", requireAuth, requireRole("merchant"));

merchantRouter.post("/merchant/orders", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await prisma.merchantOrder.create({
      data: {
        merchant_id: req.user!.id,
        pickup_label: input.pickup_label,
        pickup_lat: input.pickup_lat.toFixed(6),
        pickup_lng: input.pickup_lng.toFixed(6),
        status: "submitted",
        parcels: {
          create: input.parcels.map((parcel) => ({
            destination_label: parcel.destination_label,
            destination_lat: parcel.destination_lat.toFixed(6),
            destination_lng: parcel.destination_lng.toFixed(6),
            size: parcel.size,
            priority: parcel.priority,
            status: "pending" as const
          }))
        }
      },
      include: { parcels: true }
    });

    await auditEvent(prisma, {
      userId: req.user!.id,
      action: AuditAction.merchant_order_created,
      entityType: "MerchantOrder",
      entityId: order.id,
      metadata: { parcel_count: order.parcels.length }
    });

    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
});

merchantRouter.get("/merchant/orders", async (req: AuthenticatedRequest, res, next) => {
  try {
    const orders = await prisma.merchantOrder.findMany({
      where: { merchant_id: req.user!.id },
      include: { parcels: true },
      orderBy: { created_at: "desc" }
    });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

merchantRouter.get("/merchant/orders/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const orderId = routeParam(req.params.id);
    const order = await prisma.merchantOrder.findFirst({
      where: { id: orderId, merchant_id: req.user!.id },
      include: { parcels: true }
    });
    if (!order) {
      throw new HttpError(404, "order_not_found");
    }
    res.json({ order });
  } catch (error) {
    next(error);
  }
});
