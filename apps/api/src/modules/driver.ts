import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { LOCKED_CORRIDOR_KEY } from "./demoReset.js";
import { AuditAction } from "../generated/prisma/enums.js";

const LOCKED_ROUTE = {
  origin_label: "Hebron / PPU / Bab Al-Zawiya",
  origin_lat: 31.5326,
  origin_lng: 35.0998,
  destination_label: "Bethlehem",
  destination_lat: 31.7054,
  destination_lng: 35.2024,
  corridor_key: LOCKED_CORRIDOR_KEY
};

const routeSchema = z.object({
  origin_label: z.string().optional(),
  destination_label: z.string().optional(),
  corridor_key: z.string().optional(),
  seats_available: z.coerce.number().int().min(0).max(8).default(1),
  parcel_capacity_available: z.coerce.number().int().min(0).max(20).default(0)
});

function assertLockedRoute(input: z.infer<typeof routeSchema>) {
  if (input.corridor_key && input.corridor_key !== LOCKED_ROUTE.corridor_key) {
    throw new HttpError(400, "route_outside_locked_corridor");
  }
  if (input.origin_label && input.origin_label !== LOCKED_ROUTE.origin_label) {
    throw new HttpError(400, "route_outside_locked_corridor");
  }
  if (input.destination_label && input.destination_label !== LOCKED_ROUTE.destination_label) {
    throw new HttpError(400, "route_outside_locked_corridor");
  }
}

export const driverRouter = Router();

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_route_param");
  }
  return value;
}

driverRouter.use("/driver", requireAuth, requireRole("driver"));

driverRouter.post("/driver/routes", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = routeSchema.parse(req.body);
    assertLockedRoute(input);

    const profile = await prisma.driverProfile.findUnique({ where: { user_id: req.user!.id } });
    if (!profile) {
      throw new HttpError(404, "driver_profile_not_found");
    }

    const route = await prisma.driverRoute.create({
      data: {
        driver_id: profile.id,
        origin_label: LOCKED_ROUTE.origin_label,
        origin_lat: LOCKED_ROUTE.origin_lat.toFixed(6),
        origin_lng: LOCKED_ROUTE.origin_lng.toFixed(6),
        destination_label: LOCKED_ROUTE.destination_label,
        destination_lat: LOCKED_ROUTE.destination_lat.toFixed(6),
        destination_lng: LOCKED_ROUTE.destination_lng.toFixed(6),
        corridor_key: LOCKED_ROUTE.corridor_key,
        seats_available: input.seats_available,
        parcel_capacity_available: input.parcel_capacity_available,
        status: "active",
        activated_at: new Date()
      }
    });

    await auditEvent(prisma, {
      userId: req.user!.id,
      action: AuditAction.driver_route_created,
      entityType: "DriverRoute",
      entityId: route.id,
      metadata: { corridor_key: LOCKED_ROUTE.corridor_key }
    });

    res.status(201).json({ route });
  } catch (error) {
    next(error);
  }
});

driverRouter.get("/driver/routes", async (req: AuthenticatedRequest, res, next) => {
  try {
    const routes = await prisma.driverRoute.findMany({
      where: { driver: { user_id: req.user!.id } },
      orderBy: { activated_at: "desc" }
    });
    res.json({ routes });
  } catch (error) {
    next(error);
  }
});

driverRouter.get("/driver/routes/active", async (req: AuthenticatedRequest, res, next) => {
  try {
    const routes = await prisma.driverRoute.findMany({
      where: { driver: { user_id: req.user!.id }, status: "active" },
      orderBy: { activated_at: "desc" }
    });
    res.json({ routes });
  } catch (error) {
    next(error);
  }
});

driverRouter.patch("/driver/routes/:id/deactivate", async (req: AuthenticatedRequest, res, next) => {
  try {
    const routeId = routeParam(req.params.id);
    const existing = await prisma.driverRoute.findFirst({
      where: { id: routeId, driver: { user_id: req.user!.id } }
    });
    if (!existing) {
      throw new HttpError(404, "route_not_found");
    }
    if (existing.status !== "active") {
      throw new HttpError(409, "route_not_active");
    }

    const route = await prisma.driverRoute.update({
      where: { id: existing.id },
      data: { status: "inactive", completed_at: new Date() }
    });

    await auditEvent(prisma, {
      userId: req.user!.id,
      action: AuditAction.driver_route_deactivated,
      entityType: "DriverRoute",
      entityId: route.id
    });

    res.json({ route });
  } catch (error) {
    next(error);
  }
});
