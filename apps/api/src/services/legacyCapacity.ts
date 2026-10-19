import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../middleware/error.js";

export type LegacyCapacityInput = {
  driverRouteId: string;
  seats: number;
  parcelUnits: number;
};

export function legacyRouteTimingWhere(now = new Date()): Prisma.DriverRouteWhereInput {
  return {
    departed_at: null,
    AND: [
      { OR: [{ departure_at: null }, { departure_at: { gt: now } }] },
      { OR: [{ availability_window_end: null }, { availability_window_end: { gt: now } }] },
    ],
  };
}

export function isLegacyRouteTimely(route: {
  departure_at?: Date | null;
  departed_at?: Date | null;
  availability_window_end?: Date | null;
}, now = new Date()) {
  return !route.departed_at && (!route.departure_at || route.departure_at > now) &&
    (!route.availability_window_end || route.availability_window_end > now);
}

export async function reserveLegacyCapacity(
  tx: Prisma.TransactionClient,
  input: LegacyCapacityInput,
) {
  if (input.seats < 0 || input.parcelUnits < 0 || (!input.seats && !input.parcelUnits)) {
    throw new HttpError(400, "invalid_capacity_request");
  }

  const result = await tx.driverRoute.updateMany({
    where: {
      id: input.driverRouteId,
      operational_mode: "legacy",
      status: "active",
      ...legacyRouteTimingWhere(),
      seats_available: { gte: input.seats },
      parcel_capacity_available: { gte: input.parcelUnits },
    },
    data: {
      seats_available: input.seats ? { decrement: input.seats } : undefined,
      parcel_capacity_available: input.parcelUnits ? { decrement: input.parcelUnits } : undefined,
    },
  });

  if (result.count !== 1) {
    throw new HttpError(
      409,
      input.seats && input.parcelUnits
        ? "insufficient_driver_capacity"
        : input.seats
          ? "insufficient_seat_capacity"
          : "insufficient_parcel_capacity",
    );
  }
}

export async function releaseLegacyCapacity(
  tx: Prisma.TransactionClient,
  input: LegacyCapacityInput,
) {
  if (input.seats < 0 || input.parcelUnits < 0 || (!input.seats && !input.parcelUnits)) return;
  await tx.driverRoute.update({
    where: { id: input.driverRouteId },
    data: {
      seats_available: input.seats ? { increment: input.seats } : undefined,
      parcel_capacity_available: input.parcelUnits ? { increment: input.parcelUnits } : undefined,
    },
  });
}

export async function legacyParcelUnits(
  tx: Prisma.TransactionClient,
  options: { parcelBatchId?: string | null; merchantOrderId?: string | null },
) {
  const where: Prisma.ParcelWhereInput | null = options.parcelBatchId
    ? { batch_id: options.parcelBatchId, status: { notIn: ["cancelled", "failed", "expired"] } }
    : options.merchantOrderId
      ? { order_id: options.merchantOrderId, status: { notIn: ["cancelled", "failed", "expired"] } }
      : null;
  if (!where) return 0;
  return tx.parcel.count({ where });
}
