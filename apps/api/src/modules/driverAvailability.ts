import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError, notFoundHandler } from "../middleware/error.js";
import {
  driverAvailabilityService,
  type DriverAvailabilityService
} from "../services/driverAvailability.js";

const createSchema = z.strictObject({
  route_version_id: z.string().min(1).max(191),
  departure_at: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
  availability_window_end: z.string().datetime({ offset: true }).transform((value) => new Date(value)).nullable().optional(),
  total_seats: z.number().int().nonnegative(),
  total_parcel_capacity: z.number().int().nonnegative()
});
const idempotencyKey = z.string().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);

export function createDriverAvailabilityRouter(
  appConfig: AppConfig,
  service: DriverAvailabilityService = driverAvailabilityService
) {
  const router = Router();
  if (!appConfig.multiRouteEntryEnabled) {
    router.use("/driver/availabilities", notFoundHandler);
    return router;
  }
  router.use("/driver/availabilities", requireAuth, requireRole("driver"));
  router.post("/driver/availabilities", async (req: AuthenticatedRequest, res, next) => {
    try {
      const key = idempotencyKey.safeParse(req.header("idempotency-key"));
      if (!key.success) throw new HttpError(400, "invalid_or_missing_idempotency_key");
      const input = createSchema.parse(req.body);
      const result = await service.createOneOff(
        {
          routeVersionId: input.route_version_id,
          departureAt: input.departure_at,
          availabilityWindowEnd: input.availability_window_end,
          totalSeats: input.total_seats,
          totalParcelCapacity: input.total_parcel_capacity
        },
        { id: req.user!.id, requestId: req.requestId, idempotencyKey: key.data }
      );
      res.status(result.replayed ? 200 : 201).json({
        availability: {
          id: result.resource.id,
          route_version_id: result.resource.route_version_id,
          departure_at: result.resource.departure_at,
          availability_window_end: result.resource.availability_window_end,
          total_seats: result.resource.total_seats,
          remaining_seats: result.resource.remaining_seats,
          total_parcel_capacity: result.resource.total_parcel_capacity,
          remaining_parcel_capacity: result.resource.remaining_parcel_capacity,
          status: result.resource.availability_status,
          revision: result.resource.availability_revision
        },
        replayed: result.replayed,
        request_id: req.requestId
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
