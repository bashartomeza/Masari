import type { Prisma } from "../generated/prisma/client.js";
import { AuditAction, TripStatus } from "../generated/prisma/enums.js";
import { HttpError } from "../middleware/error.js";

export const LEGACY_TRIP_TRANSITIONS: Readonly<Record<string, readonly TripStatus[]>> = {
  accepted: [TripStatus.pickup_started, TripStatus.cancelled],
  pickup_started: [TripStatus.picked_up, TripStatus.cancelled],
  picked_up: [TripStatus.in_transit, TripStatus.cancelled],
  in_transit: [TripStatus.delivered, TripStatus.cancelled],
  delivered: [TripStatus.completed],
  completed: [],
  cancelled: [],
  created: [],
};

export const ADMIN_FORWARD_TRIP_TRANSITION: Readonly<Partial<Record<TripStatus, TripStatus>>> = {
  [TripStatus.accepted]: TripStatus.pickup_started,
  [TripStatus.pickup_started]: TripStatus.picked_up,
  [TripStatus.picked_up]: TripStatus.in_transit,
  [TripStatus.in_transit]: TripStatus.delivered,
  [TripStatus.delivered]: TripStatus.completed,
};

export function isLegacyTripTransitionAllowed(current: TripStatus, next: TripStatus) {
  return LEGACY_TRIP_TRANSITIONS[current]?.includes(next) ?? false;
}

export type LegacyTripLifecycleSnapshot = {
  id: string;
  status: TripStatus;
  driver_route_id: string;
  passenger_request_id: string | null;
  merchant_order_id: string | null;
  parcel_batch_id: string | null;
};

type AdvanceOptions = {
  actorId: string;
  expectedStatus: TripStatus;
};

export async function advanceLegacyTrip(
  tx: Prisma.TransactionClient,
  trip: LegacyTripLifecycleSnapshot,
  nextStatus: TripStatus,
  options: AdvanceOptions,
) {
  if (trip.status !== options.expectedStatus) throw new HttpError(409, "trip_status_conflict");
  if (!isLegacyTripTransitionAllowed(trip.status, nextStatus)) {
    throw new HttpError(409, "invalid_trip_status_transition");
  }

  const completedAt = nextStatus === TripStatus.completed ? new Date() : undefined;
  let updated;
  try {
    updated = await tx.trip.update({
      where: { id: trip.id, status: options.expectedStatus },
      data: { status: nextStatus, completed_at: completedAt },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      throw new HttpError(409, "trip_status_conflict");
    }
    throw error;
  }

  if (nextStatus === TripStatus.pickup_started) {
    await tx.driverRoute.update({ where: { id: trip.driver_route_id }, data: { status: "on_trip" } });
  }
  if (nextStatus === TripStatus.picked_up) {
    if (trip.passenger_request_id) {
      await tx.passengerRequest.update({ where: { id: trip.passenger_request_id }, data: { status: "picked_up" } });
    }
    if (trip.parcel_batch_id) {
      await tx.parcelBatch.update({ where: { id: trip.parcel_batch_id }, data: { status: "picked_up" } });
    }
    if (trip.merchant_order_id) {
      await tx.parcel.updateMany({ where: { order_id: trip.merchant_order_id }, data: { status: "picked_up" } });
    }
  }
  if (nextStatus === TripStatus.in_transit) {
    if (trip.passenger_request_id) {
      await tx.passengerRequest.update({ where: { id: trip.passenger_request_id }, data: { status: "in_transit" } });
    }
    if (trip.merchant_order_id) {
      await tx.merchantOrder.update({ where: { id: trip.merchant_order_id }, data: { status: "in_transit" } });
    }
    if (trip.parcel_batch_id) {
      await tx.parcelBatch.update({ where: { id: trip.parcel_batch_id }, data: { status: "in_transit" } });
    }
    if (trip.merchant_order_id) {
      await tx.parcel.updateMany({ where: { order_id: trip.merchant_order_id }, data: { status: "in_transit" } });
    }
  }
  if (nextStatus === TripStatus.delivered) {
    if (trip.passenger_request_id) {
      await tx.passengerRequest.update({ where: { id: trip.passenger_request_id }, data: { status: "delivered" } });
    }
    if (trip.parcel_batch_id) {
      await tx.parcelBatch.update({ where: { id: trip.parcel_batch_id }, data: { status: "delivered" } });
    }
    if (trip.merchant_order_id) {
      await tx.parcel.updateMany({ where: { order_id: trip.merchant_order_id }, data: { status: "delivered" } });
      await tx.merchantOrder.update({ where: { id: trip.merchant_order_id }, data: { status: "completed" } });
    }
  }
  if (nextStatus === TripStatus.completed) {
    await tx.driverRoute.update({
      where: { id: trip.driver_route_id },
      data: { status: "completed", completed_at: new Date() },
    });
  }

  await tx.auditEvent.create({
    data: {
      user_id: options.actorId,
      action: AuditAction.trip_status_updated,
      entity_type: "Trip",
      entity_id: trip.id,
      metadata: { from: trip.status, to: nextStatus },
    },
  });

  return updated;
}
