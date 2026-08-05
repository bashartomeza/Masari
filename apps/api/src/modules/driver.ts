import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { LOCKED_CORRIDOR_KEY } from "./demoReset.js";
import { AuditAction } from "../generated/prisma/enums.js";
import {
  legacyDriverOnlineStateService,
  type LegacyDriverOnlineStateService,
} from "../services/legacyDriverOnlineState.js";

const LOCKED_ROUTE = {
  origin_label: "Hebron / PPU / Bab Al-Zawiya",
  origin_lat: 31.5326,
  origin_lng: 35.0998,
  destination_label: "Bethlehem",
  destination_lat: 31.7054,
  destination_lng: 35.2024,
  corridor_key: LOCKED_CORRIDOR_KEY,
};

const routeSchema = z.object({
  origin_label: z.string().optional(),
  destination_label: z.string().optional(),
  corridor_key: z.string().optional(),
  seats_available: z.coerce.number().int().min(0).max(8).default(1),
  parcel_capacity_available: z.coerce.number().int().min(0).max(20).default(0),
});

function assertLockedRoute(input: z.infer<typeof routeSchema>) {
  if (input.corridor_key && input.corridor_key !== LOCKED_ROUTE.corridor_key) {
    throw new HttpError(400, "route_outside_locked_corridor");
  }
  if (input.origin_label && input.origin_label !== LOCKED_ROUTE.origin_label) {
    throw new HttpError(400, "route_outside_locked_corridor");
  }
  if (
    input.destination_label &&
    input.destination_label !== LOCKED_ROUTE.destination_label
  ) {
    throw new HttpError(400, "route_outside_locked_corridor");
  }
}

const onlineStateSchema = z.strictObject({
  online: z.boolean(),
  expected_route_id: z.string().min(1).max(191).nullable().optional(),
});
const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

function serializeLegacyDriverRoute(value: Record<string, unknown>) {
  return {
    id: value.id,
    driver_id: value.driver_id,
    origin_label: value.origin_label,
    origin_lat: value.origin_lat,
    origin_lng: value.origin_lng,
    destination_label: value.destination_label,
    destination_lat: value.destination_lat,
    destination_lng: value.destination_lng,
    corridor_key: value.corridor_key,
    seats_available: value.seats_available,
    parcel_capacity_available: value.parcel_capacity_available,
    status: value.status,
    route_version_id: value.route_version_id,
    departure_at: value.departure_at,
    availability_window_end: value.availability_window_end,
    total_seats: value.total_seats,
    remaining_seats: value.remaining_seats,
    total_parcel_capacity: value.total_parcel_capacity,
    remaining_parcel_capacity: value.remaining_parcel_capacity,
    availability_status: value.availability_status,
    availability_revision: value.availability_revision,
    activated_at: value.activated_at,
    paused_at: value.paused_at,
    filled_at: value.filled_at,
    departed_at: value.departed_at,
    completed_at: value.completed_at,
    cancelled_at: value.cancelled_at,
    expired_at: value.expired_at,
  };
}

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_route_param");
  }
  return value;
}

export function createDriverRouter(
  onlineStateService: LegacyDriverOnlineStateService = legacyDriverOnlineStateService,
) {
  const driverRouter = Router();
  driverRouter.use("/driver", requireAuth, requireRole("driver"));

  driverRouter.put(
    "/driver/online-state",
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const key = idempotencyKeySchema.safeParse(
          req.header("idempotency-key"),
        );
        if (!key.success)
          throw new HttpError(400, "invalid_or_missing_idempotency_key");
        const input = onlineStateSchema.parse(req.body);
        const result = await onlineStateService.setState(
          { online: input.online, expectedRouteId: input.expected_route_id },
          {
            id: req.user!.id,
            requestId: req.requestId,
            idempotencyKey: key.data,
          },
        );
        res.json({
          online: result.online,
          route_id: result.routeId,
          replayed: result.replayed,
          request_id: req.requestId,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  driverRouter.post(
    "/driver/routes",
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const input = routeSchema.parse(req.body);
        assertLockedRoute(input);

        const profile = await prisma.driverProfile.findUnique({
          where: { user_id: req.user!.id },
        });
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
            activated_at: new Date(),
          },
        });

        await auditEvent(prisma, {
          userId: req.user!.id,
          action: AuditAction.driver_route_created,
          entityType: "DriverRoute",
          entityId: route.id,
          metadata: { corridor_key: LOCKED_ROUTE.corridor_key },
        });

        res.status(201).json({
          route: serializeLegacyDriverRoute(
            route as unknown as Record<string, unknown>,
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  driverRouter.get(
    "/driver/routes",
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const routes = await prisma.driverRoute.findMany({
          where: {
            driver: { user_id: req.user!.id },
            canonical_availability_version: null,
            operational_mode: "legacy",
          },
          orderBy: { activated_at: "desc" },
        });
        res.json({
          routes: routes.map((route) =>
            serializeLegacyDriverRoute(
              route as unknown as Record<string, unknown>,
            ),
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  driverRouter.get(
    "/driver/routes/active",
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const routes = await prisma.driverRoute.findMany({
          where: {
            driver: { user_id: req.user!.id },
            status: "active",
            canonical_availability_version: null,
            operational_mode: "legacy",
          },
          orderBy: { activated_at: "desc" },
        });
        res.json({
          routes: routes.map((route) =>
            serializeLegacyDriverRoute(
              route as unknown as Record<string, unknown>,
            ),
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  driverRouter.patch(
    "/driver/routes/:id/deactivate",
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const routeId = routeParam(req.params.id);
        const existing = await prisma.driverRoute.findFirst({
          where: {
            id: routeId,
            driver: { user_id: req.user!.id },
            canonical_availability_version: null,
            operational_mode: "legacy",
          },
        });
        if (!existing) {
          throw new HttpError(404, "route_not_found");
        }
        if (existing.status !== "active") {
          throw new HttpError(409, "route_not_active");
        }

        const route = await prisma.driverRoute.update({
          where: { id: existing.id },
          data: { status: "inactive", completed_at: new Date() },
        });

        await auditEvent(prisma, {
          userId: req.user!.id,
          action: AuditAction.driver_route_deactivated,
          entityType: "DriverRoute",
          entityId: route.id,
        });

        res.json({
          route: serializeLegacyDriverRoute(
            route as unknown as Record<string, unknown>,
          ),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return driverRouter;
}

export const driverRouter = createDriverRouter();
