import type { Prisma, PrismaClient } from "../generated/prisma/client.js";

type Db = PrismaClient | Prisma.TransactionClient;

export type NotificationType =
  | "match_offered"
  | "match_accepted"
  | "match_rejected"
  | "trip_status"
  | "driver_verification_approved"
  | "driver_verification_rejected";

type NotifyInput = {
  userId: string | null | undefined;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  /** Same key for the same user means the event was already announced. */
  dedupeKey: string;
  params?: Prisma.InputJsonValue;
};

/**
 * Writes one inbox row. Notifications describe an event that has already
 * happened, so a failure here must never fail or roll back the business action;
 * duplicates (same recipient + dedupe key) are silently ignored.
 */
export async function notify(db: Db, input: NotifyInput): Promise<void> {
  if (!input.userId) return;
  try {
    await db.notification.create({
      data: {
        user_id: input.userId,
        type: input.type,
        entity_type: input.entityType,
        entity_id: input.entityId,
        dedupe_key: input.dedupeKey,
        params: input.params
      }
    });
  } catch {
    // Duplicate key, or the inbox is unavailable: the event itself stands.
  }
}

type MatchParties = {
  id: string;
  driver_route?: { driver?: { user_id: string } | null } | null;
  passenger_request?: { passenger_id: string } | null;
  merchant_order?: { merchant_id: string } | null;
};

function demandOwnerId(match: MatchParties) {
  return match.passenger_request?.passenger_id ?? match.merchant_order?.merchant_id;
}

export async function notifyMatchOffered(db: Db, match: MatchParties) {
  await notify(db, {
    userId: match.driver_route?.driver?.user_id,
    type: "match_offered",
    entityType: "Match",
    entityId: match.id,
    dedupeKey: `match_offered:${match.id}`
  });
}

export async function notifyMatchDecision(db: Db, match: MatchParties, decision: "accepted" | "rejected") {
  await notify(db, {
    userId: demandOwnerId(match),
    type: decision === "accepted" ? "match_accepted" : "match_rejected",
    entityType: "Match",
    entityId: match.id,
    dedupeKey: `match_${decision}:${match.id}`
  });
}

/** Tells the passenger and/or merchant behind a trip that its status moved. */
export async function notifyTripStatus(
  db: Db,
  trip: { id: string; passenger_request_id: string | null; merchant_order_id: string | null },
  status: string
) {
  try {
    const [request, order] = await Promise.all([
      trip.passenger_request_id
        ? db.passengerRequest.findUnique({ where: { id: trip.passenger_request_id }, select: { passenger_id: true } })
        : null,
      trip.merchant_order_id
        ? db.merchantOrder.findUnique({ where: { id: trip.merchant_order_id }, select: { merchant_id: true } })
        : null
    ]);
    for (const userId of [request?.passenger_id, order?.merchant_id]) {
      await notify(db, {
        userId,
        type: "trip_status",
        entityType: "Trip",
        entityId: trip.id,
        dedupeKey: `trip_status:${trip.id}:${status}`,
        params: { status }
      });
    }
  } catch {
    // See notify(): lookups are part of the same best-effort contract.
  }
}

export async function notifyDriverVerification(
  db: Db,
  userId: string,
  verificationId: string,
  revision: number,
  outcome: "approved" | "rejected",
  reason?: string | null
) {
  await notify(db, {
    userId,
    type: outcome === "approved" ? "driver_verification_approved" : "driver_verification_rejected",
    entityType: "DriverVerification",
    entityId: verificationId,
    dedupeKey: `driver_verification_${outcome}:${verificationId}:${revision}`,
    params: reason ? { reason } : undefined
  });
}
