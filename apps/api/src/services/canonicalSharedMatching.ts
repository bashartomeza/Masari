import { createHash } from "node:crypto";
import { config, type AppConfig } from "../config.js";
import {
  AuditAction,
  CanonicalRejectReason,
  Prisma,
  type PrismaClient
} from "../generated/prisma/client.js";
import { auditEvent } from "../lib/audit.js";
import { claimIdempotency, completeIdempotency } from "../lib/idempotency.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware/error.js";
import { requireEligibleOperationalRoute } from "./operationalRouteEligibility.js";
import { canonicalScoring } from "./canonicalMatching.js";

export const SHARED_MATCH_VERSION = "canonical_shared_trip_match_v1";
export const SHARED_TRIP_VERSION = "canonical_shared_trip_v1";
export const SHARED_SNAPSHOT_VERSION = "canonical_shared_trip_snapshot_v1";
export const SHARED_MANIFEST_VERSION = "canonical_shared_manifest_v1";
export const GLOBAL_CAPACITY_VERSION = "canonical_global_capacity_v1";
const CANONICAL_MODE = "canonical_route_v1";
export const SHARED_LIMITS = {
  maximumMembers: 20,
  maximumPassengers: 20,
  maximumMerchantOrders: 20,
  maximumParcelUnits: 50,
  maximumAttempts: 5,
  offerLifetimeMinutes: 5,
  defaultBatchSize: 25,
  maximumBatchSize: 100,
  expiryFailureLimit: 3,
  maximumSnapshotBytes: 65_536
} as const;

type Actor = { id: string; requestId?: string; idempotencyKey: string };
type Demand = {
  dispatchId: string;
  dispatchCreatedAt: Date;
  dispatchRevision: number;
  dispatchStatus: "pending" | "offered" | "assigned" | "cancelled" | "unavailable";
  activeMatchOfferId: string | null;
  activeManifestId: string | null;
  attemptNumber: number;
  type: "passenger" | "merchant_order";
  id: string;
  routeVersionId: string;
  departureFrom: Date;
  departureUntil: Date;
  pickupStopId: string;
  dropOffStopId: string | null;
  destinationStopIds: string[];
  passengerSeats: number;
  parcelUnits: number;
  eligible: boolean;
};

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

function canonicalDigest(value: unknown) {
  return digest(JSON.stringify(canonicalize(value)));
}

function memberFingerprint(demand: Demand) {
  return canonicalDigest({
    schema_version: "canonical_shared_member_v1",
    demand_type: demand.type,
    demand_id: demand.id,
    route_version_id: demand.routeVersionId,
    pickup_stop_id: demand.pickupStopId,
    drop_off_stop_id: demand.dropOffStopId,
    destination_stop_ids: [...demand.destinationStopIds].sort(),
    passenger_seats: demand.passengerSeats,
    parcel_units: demand.parcelUnits,
    departure_from: demand.departureFrom.toISOString(),
    departure_until: demand.departureUntil.toISOString(),
    operational_mode: CANONICAL_MODE,
    lifecycle_revision: demand.dispatchRevision
  });
}

function manifestFingerprint(input: {
  routeVersionId: string;
  driverRouteId: string;
  memberFingerprints: string[];
  passengerSeats: number;
  parcelUnits: number;
}) {
  return canonicalDigest({
    schema_version: SHARED_MANIFEST_VERSION,
    match_version: SHARED_MATCH_VERSION,
    trip_version: SHARED_TRIP_VERSION,
    capacity_model: GLOBAL_CAPACITY_VERSION,
    route_version_id: input.routeVersionId,
    driver_route_id: input.driverRouteId,
    ordered_member_fingerprints: input.memberFingerprints,
    passenger_seats: input.passengerSeats,
    parcel_units: input.parcelUnits,
    member_count: input.memberFingerprints.length
  });
}

function safeTransactionError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    throw new HttpError(409, "transaction_retry_required");
  }
  throw error;
}

async function lockRow(tx: Prisma.TransactionClient, table: string, id: string) {
  const allowed = new Set([
    "service_routes",
    "service_route_versions",
    "driver_routes",
    "users",
    "driver_profiles",
    "canonical_trip_manifests",
    "canonical_demand_dispatches",
    "passenger_requests",
    "merchant_orders",
    "matches",
    "capacity_reservations",
    "trips"
  ]);
  if (!allowed.has(table)) throw new Error("invalid_lock_table");
  const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM \`${table}\` WHERE id = ? FOR UPDATE`,
    id
  );
  if (rows.length !== 1) throw new HttpError(409, "canonical_state_changed");
}

async function lockDispatches(tx: Prisma.TransactionClient, ids: string[]) {
  for (const id of [...ids].sort()) await lockRow(tx, "canonical_demand_dispatches", id);
}

async function lockDemand(tx: Prisma.TransactionClient, demand: Demand) {
  if (demand.type === "passenger") {
    await lockRow(tx, "passenger_requests", demand.id);
  } else {
    await lockRow(tx, "merchant_orders", demand.id);
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM parcels WHERE order_id = ${demand.id} ORDER BY id FOR UPDATE
    `;
  }
}

async function loadDemand(tx: Prisma.TransactionClient, dispatchId: string): Promise<Demand> {
  const dispatch = await tx.canonicalDemandDispatch.findUnique({
    where: { id: dispatchId },
    include: {
      passenger_request: true,
      merchant_order: { include: { parcels: { orderBy: { id: "asc" } } } }
    }
  });
  if (!dispatch || dispatch.operational_mode !== CANONICAL_MODE) {
    throw new HttpError(409, "canonical_dispatch_unavailable");
  }
  if (dispatch.demand_type === "passenger" && dispatch.passenger_request) {
    const request = dispatch.passenger_request;
    return {
      dispatchId: dispatch.id,
      dispatchCreatedAt: dispatch.created_at,
      dispatchRevision: dispatch.status === "offered" ? dispatch.revision - 1 : dispatch.revision,
      dispatchStatus: dispatch.status,
      activeMatchOfferId: dispatch.active_match_offer_id,
      activeManifestId: dispatch.active_manifest_id,
      attemptNumber: dispatch.attempt_count + 1,
      type: "passenger",
      id: request.id,
      routeVersionId: request.route_version_id!,
      departureFrom: request.requested_departure_from!,
      departureUntil: request.requested_departure_until!,
      pickupStopId: request.pickup_stop_id!,
      dropOffStopId: request.dropoff_stop_id!,
      destinationStopIds: [request.dropoff_stop_id!],
      passengerSeats: request.passenger_count,
      parcelUnits: 0,
      eligible:
        ((dispatch.status === "pending" &&
          !dispatch.active_match_offer_id &&
          !dispatch.active_manifest_id) ||
          (dispatch.status === "offered" &&
            Boolean(dispatch.active_match_offer_id) &&
            Boolean(dispatch.active_manifest_id))) &&
        !dispatch.assigned_trip_id &&
        !dispatch.accepted_manifest_id &&
        dispatch.attempt_count < SHARED_LIMITS.maximumAttempts &&
        request.operational_mode === CANONICAL_MODE &&
        request.canonical_entry_version === CANONICAL_MODE &&
        request.status === "pending" &&
        request.passenger_count > 0
    };
  }
  if (dispatch.demand_type === "merchant_order" && dispatch.merchant_order) {
    const order = dispatch.merchant_order;
    return {
      dispatchId: dispatch.id,
      dispatchCreatedAt: dispatch.created_at,
      dispatchRevision: dispatch.status === "offered" ? dispatch.revision - 1 : dispatch.revision,
      dispatchStatus: dispatch.status,
      activeMatchOfferId: dispatch.active_match_offer_id,
      activeManifestId: dispatch.active_manifest_id,
      attemptNumber: dispatch.attempt_count + 1,
      type: "merchant_order",
      id: order.id,
      routeVersionId: order.route_version_id!,
      departureFrom: order.requested_departure_from!,
      departureUntil: order.requested_departure_until!,
      pickupStopId: order.pickup_stop_id!,
      dropOffStopId: null,
      destinationStopIds: order.parcels.map((parcel) => parcel.destination_stop_id!),
      passengerSeats: 0,
      parcelUnits: order.parcels.length,
      eligible:
        ((dispatch.status === "pending" &&
          !dispatch.active_match_offer_id &&
          !dispatch.active_manifest_id) ||
          (dispatch.status === "offered" &&
            Boolean(dispatch.active_match_offer_id) &&
            Boolean(dispatch.active_manifest_id))) &&
        !dispatch.assigned_trip_id &&
        !dispatch.accepted_manifest_id &&
        dispatch.attempt_count < SHARED_LIMITS.maximumAttempts &&
        order.operational_mode === CANONICAL_MODE &&
        order.canonical_entry_version === CANONICAL_MODE &&
        order.status === "submitted" &&
        order.parcels.length > 0 &&
        order.parcels.every(
          (parcel) =>
            parcel.operational_mode === CANONICAL_MODE &&
            parcel.canonical_entry_version === CANONICAL_MODE &&
            parcel.route_version_id === order.route_version_id &&
            parcel.status === "pending" &&
            Boolean(parcel.destination_stop_id)
        )
    };
  }
  throw new HttpError(409, "canonical_demand_invalid");
}

async function ensureDispatches(db: PrismaClient, routeVersionId?: string) {
  const requests = await db.passengerRequest.findMany({
    where: {
      operational_mode: CANONICAL_MODE,
      canonical_entry_version: CANONICAL_MODE,
      status: "pending",
      route_version_id: routeVersionId
    },
    select: { id: true, route_version_id: true },
    take: SHARED_LIMITS.maximumBatchSize
  });
  const orders = await db.merchantOrder.findMany({
    where: {
      operational_mode: CANONICAL_MODE,
      canonical_entry_version: CANONICAL_MODE,
      status: "submitted",
      route_version_id: routeVersionId
    },
    select: { id: true, route_version_id: true },
    take: SHARED_LIMITS.maximumBatchSize
  });
  for (const request of requests) {
    await db.canonicalDemandDispatch.upsert({
      where: { passenger_request_id: request.id },
      create: {
        demand_type: "passenger",
        passenger_request_id: request.id,
        route_version_id: request.route_version_id!,
        operational_mode: CANONICAL_MODE
      },
      update: {}
    });
  }
  for (const order of orders) {
    await db.canonicalDemandDispatch.upsert({
      where: { merchant_order_id: order.id },
      create: {
        demand_type: "merchant_order",
        merchant_order_id: order.id,
        route_version_id: order.route_version_id!,
        operational_mode: CANONICAL_MODE
      },
      update: {}
    });
  }
}

async function claimMutation(
  tx: Prisma.TransactionClient,
  operation: string,
  actor: Actor,
  offerId: string,
  manifestId: string,
  revision: number,
  payload: unknown
) {
  const claim = await claimIdempotency(tx, {
    operation,
    scopeDigest: digest(`${operation}:${actor.id}`),
    keyDigest: digest(actor.idempotencyKey),
    keyVersion: 1,
    requestDigest: canonicalDigest({
      actor_id: actor.id,
      operation,
      offer_id: offerId,
      manifest_id: manifestId,
      lifecycle_revision: revision,
      payload
    }),
    expiresAt: new Date(Date.now() + 86_400_000)
  });
  if (claim.kind === "conflict") throw new HttpError(409, "idempotency_conflict");
  if (claim.kind === "in_progress") throw new HttpError(409, "idempotency_in_progress");
  if (claim.kind === "failed") throw new HttpError(409, "idempotency_failed");
  return claim;
}

function memberOrder(left: Demand, right: Demand) {
  return (
    left.departureUntil.getTime() - right.departureUntil.getTime() ||
    left.dispatchCreatedAt.getTime() - right.dispatchCreatedAt.getTime() ||
    left.type.localeCompare(right.type) ||
    left.id.localeCompare(right.id)
  );
}

async function buildSnapshot(
  tx: Prisma.TransactionClient,
  manifest: {
    id: string;
    route_version_id: string;
    driver_route_id: string;
    member_count: number;
    passenger_request_count: number;
    passenger_seat_count: number;
    merchant_order_count: number;
    parcel_unit_count: number;
  },
  demands: Demand[]
) {
  const version = await tx.serviceRouteVersion.findUnique({
    where: { id: manifest.route_version_id },
    include: {
      service_route: true,
      stops: { include: { stop: true }, orderBy: { sequence: "asc" } }
    }
  });
  const availability = await tx.driverRoute.findUnique({
    where: { id: manifest.driver_route_id },
    select: { departure_at: true }
  });
  if (!version || !availability?.departure_at) throw new HttpError(409, "canonical_state_changed");
  const stop = (id: string) => {
    const membership = version.stops.find((item) => item.stop_id === id);
    if (!membership) throw new HttpError(409, "canonical_stop_order_mismatch");
    return {
      id: membership.stop_id,
      sequence: membership.sequence,
      name_ar: membership.stop.name_ar,
      name_en: membership.stop.name_en
    };
  };
  const snapshot = canonicalize({
    schema_version: SHARED_SNAPSHOT_VERSION,
    operational_mode: CANONICAL_MODE,
    match_version: SHARED_MATCH_VERSION,
    trip_version: SHARED_TRIP_VERSION,
    capacity_model: GLOBAL_CAPACITY_VERSION,
    route: {
      id: version.service_route.id,
      route_key: version.service_route.route_key,
      direction: version.service_route.direction,
      name_ar: version.name_ar,
      name_en: version.name_en
    },
    route_version: { id: version.id, version_number: version.version_number },
    ordered_route_stops: version.stops.map((item) => stop(item.stop_id)),
    driver_route: {
      id: manifest.driver_route_id,
      departure_at: availability.departure_at.toISOString()
    },
    manifest: {
      id: manifest.id,
      member_count: manifest.member_count,
      passenger_request_count: manifest.passenger_request_count,
      passenger_seat_count: manifest.passenger_seat_count,
      merchant_order_count: manifest.merchant_order_count,
      parcel_unit_count: manifest.parcel_unit_count,
      members: demands.map((demand) =>
        demand.type === "passenger"
          ? {
              demand_type: demand.type,
              request_id: demand.id,
              pickup_stop: stop(demand.pickupStopId),
              drop_off_stop: stop(demand.dropOffStopId!),
              passenger_count: demand.passengerSeats,
              member_fingerprint: memberFingerprint(demand)
            }
          : {
              demand_type: demand.type,
              order_id: demand.id,
              pickup_stop: stop(demand.pickupStopId),
              destination_stops: demand.destinationStopIds.map(stop),
              parcel_count: demand.parcelUnits,
              member_fingerprint: memberFingerprint(demand)
            }
      )
    }
  }) as Prisma.InputJsonObject;
  const encoded = JSON.stringify(snapshot);
  if (Buffer.byteLength(encoded, "utf8") > SHARED_LIMITS.maximumSnapshotBytes) {
    throw new HttpError(409, "canonical_shared_snapshot_too_large");
  }
  return { snapshot, checksum: digest(encoded) };
}

async function restoreCapacity(
  tx: Prisma.TransactionClient,
  reservation: {
    id: string;
    driver_route_id: string;
    seats_reserved: number;
    parcel_units_reserved: number;
    revision: number;
  },
  status: "released" | "expired",
  reason: "offer_rejected" | "hold_expired" | "manifest_invalidated",
  now: Date
) {
  const changed = await tx.capacityReservation.updateMany({
    where: { id: reservation.id, status: "held", revision: reservation.revision },
    data: { status, released_at: now, release_reason: reason, revision: { increment: 1 } }
  });
  if (changed.count !== 1) throw new HttpError(409, "reservation_state_conflict");
  const restored = await tx.driverRoute.updateMany({
    where: { id: reservation.driver_route_id },
    data: {
      remaining_seats: { increment: reservation.seats_reserved },
      remaining_parcel_capacity: { increment: reservation.parcel_units_reserved }
    }
  });
  if (restored.count !== 1) throw new HttpError(409, "capacity_restore_invariant_failed");
}

export function createCanonicalSharedMatchingService(
  db: PrismaClient = prisma,
  appConfig: AppConfig = config
) {
  const requireEnabled = () => {
    if (
      !(appConfig.isLocal || appConfig.isTest || appConfig.isDemo) ||
      !appConfig.multiRouteEntryEnabled ||
      !appConfig.multiRouteMatchingEnabled ||
      !appConfig.canonicalTripCreationEnabled ||
      !appConfig.canonicalSharedTripsEnabled
    ) throw new HttpError(404, "not_found");
  };

  async function terminalize(
    tx: Prisma.TransactionClient,
    offer: any,
    outcome: "rejected" | "expired" | "system_invalidated",
    reason: CanonicalRejectReason | undefined,
    now: Date,
    requestId?: string,
    userId?: string
  ) {
    const manifest = offer.canonical_manifest;
    const reservation = offer.offer_reservation;
    if (!manifest || !reservation || reservation.status !== "held") {
      throw new HttpError(409, "canonical_manifest_invariant_failed");
    }
    const members = [...manifest.members].sort((a: any, b: any) => a.dispatch_id.localeCompare(b.dispatch_id));
    for (const member of members) {
      const unavailable = member.dispatch.attempt_count >= SHARED_LIMITS.maximumAttempts;
      await tx.canonicalDemandDispatch.update({
        where: { id: member.dispatch_id },
        data: {
          status: member.dispatch.status === "cancelled" ? "cancelled" : unavailable ? "unavailable" : "pending",
          active_match_offer_id: null,
          active_manifest_id: null,
          revision: { increment: 1 }
        }
      });
    }
    await tx.canonicalTripManifestMember.updateMany({
      where: { manifest_id: manifest.id, member_status: "active" },
      data: {
        member_status: outcome === "system_invalidated" ? "invalidated" : "released",
        active_dispatch_key: null
      }
    });
    await restoreCapacity(
      tx,
      reservation,
      outcome === "expired" ? "expired" : "released",
      outcome === "rejected"
        ? "offer_rejected"
        : outcome === "expired"
          ? "hold_expired"
          : "manifest_invalidated",
      now
    );
    await tx.canonicalDemandAttempt.updateMany({
      where: { manifest_id: manifest.id, outcome: "offered" },
      data: { outcome, outcome_at: now }
    });
    await tx.canonicalTripManifest.update({
      where: { id: manifest.id },
      data: {
        lifecycle_status:
          outcome === "rejected" ? "rejected" : outcome === "expired" ? "expired" : "dissolved",
        active_offer_id: null,
        active_availability_key: null,
        ...(outcome === "rejected"
          ? { rejected_at: now }
          : outcome === "expired"
            ? { expired_at: now }
            : { dissolved_at: now }),
        revision: { increment: 1 }
      }
    });
    await tx.match.update({
      where: { id: offer.id },
      data: {
        status:
          outcome === "rejected" ? "rejected" : outcome === "expired" ? "expired" : "invalidated",
        active_manifest_key: null,
        active_driver_route_key: null,
        ...(outcome === "rejected"
          ? { rejected_at: now, reject_reason: reason }
          : { expired_at: now })
      }
    });
    await auditEvent(tx, {
      userId,
      action:
        outcome === "rejected"
          ? AuditAction.canonical_manifest_rejected
          : outcome === "expired"
            ? AuditAction.canonical_manifest_expired
            : AuditAction.canonical_manifest_invalidated,
      entityType: "CanonicalTripManifest",
      entityId: manifest.id,
      metadata: {
        route_version_id: manifest.route_version_id,
        driver_route_id: manifest.driver_route_id,
        member_count: manifest.member_count,
        outcome_category: outcome,
        request_id: requestId
      }
    });
    return manifest;
  }

  return {
    async run(input: {
      routeVersionId?: string;
      limit?: number;
      now?: Date;
      requestId?: string;
      throwOnFailure?: boolean;
    } = {}) {
      requireEnabled();
      const now = input.now ?? new Date();
      const limit = Math.min(
        Math.max(input.limit ?? SHARED_LIMITS.defaultBatchSize, 1),
        SHARED_LIMITS.maximumBatchSize
      );
      await ensureDispatches(db, input.routeVersionId);
      const seeds = await db.canonicalDemandDispatch.findMany({
        where: {
          operational_mode: CANONICAL_MODE,
          status: "pending",
          route_version_id: input.routeVersionId,
          attempt_count: { lt: SHARED_LIMITS.maximumAttempts },
          active_manifest_id: null,
          accepted_manifest_id: null
        },
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true },
        take: limit
      });
      const result = {
        examined: seeds.length,
        offered: 0,
        skipped: 0,
        failed: 0,
        manifestIds: [] as string[],
        offerIds: [] as string[]
      };
      for (const seed of seeds) {
        try {
          const formed = await db.$transaction(async (tx) => {
            const seedLookup = await tx.canonicalDemandDispatch.findUnique({
              where: { id: seed.id },
              select: { route_version_id: true }
            });
            if (!seedLookup) return null;
            await requireEligibleOperationalRoute(tx, seedLookup.route_version_id, {
              now,
              lockForUpdate: true
            });
            await lockDispatches(tx, [seed.id]);
            const seedDemand = await loadDemand(tx, seed.id);
            await lockDemand(tx, seedDemand);
            if (!seedDemand.eligible || seedDemand.departureUntil <= now) return null;
            const excluded = await tx.canonicalDemandAttempt.findMany({
              where: { dispatch_id: seed.id },
              select: { driver_route_id: true }
            });
            const candidates = await tx.driverRoute.findMany({
              where: {
                operational_mode: CANONICAL_MODE,
                canonical_availability_version: CANONICAL_MODE,
                route_version_id: seedDemand.routeVersionId,
                status: "active",
                availability_status: "active",
                departure_at: {
                  gt: now,
                  gte: seedDemand.departureFrom,
                  lte: seedDemand.departureUntil
                },
                remaining_seats: { gte: seedDemand.passengerSeats },
                remaining_parcel_capacity: { gte: seedDemand.parcelUnits },
                id: { notIn: excluded.map((item) => item.driver_route_id) },
                canonical_manifests: {
                  none: {
                    lifecycle_status: { in: ["building", "offered", "accepted"] }
                  }
                },
                trips: { none: { operational_mode: CANONICAL_MODE } },
                driver: {
                  verified: true,
                  user: { role: "driver", account_status: "active" }
                }
              },
              include: { driver: { include: { user: true } } }
            });
            const scored = await Promise.all(candidates.map(async (candidate) => {
              const recentAssignments = await tx.trip.count({
                where: {
                  operational_mode: CANONICAL_MODE,
                  driver_id: candidate.driver.user_id,
                  created_at: { gte: new Date(now.getTime() - 30 * 86_400_000) }
                }
              });
              const requested = seedDemand.type === "passenger"
                ? seedDemand.passengerSeats
                : seedDemand.parcelUnits;
              const available = seedDemand.type === "passenger"
                ? candidate.remaining_seats!
                : candidate.remaining_parcel_capacity!;
              return {
                candidate,
                recentAssignments,
                ...canonicalScoring.scoreCandidate({
                  departureAt: candidate.departure_at!,
                  departureFrom: seedDemand.departureFrom,
                  departureUntil: seedDemand.departureUntil,
                  requestedCapacity: requested,
                  availableCapacity: available,
                  trustScore: candidate.driver.trust_score,
                  recentAssignments
                })
              };
            }));
            scored.sort((left, right) =>
              right.score - left.score ||
              left.departureDeltaSeconds - right.departureDeltaSeconds ||
              right.candidate.driver.trust_score - left.candidate.driver.trust_score ||
              left.recentAssignments - right.recentAssignments ||
              left.candidate.id.localeCompare(right.candidate.id)
            );
            const selected = scored[0];
            if (!selected) return null;
            await lockRow(tx, "users", selected.candidate.driver.user_id);
            await lockRow(tx, "driver_profiles", selected.candidate.driver.id);
            await lockRow(tx, "driver_routes", selected.candidate.id);
            const availability = await tx.driverRoute.findUnique({
              where: { id: selected.candidate.id },
              include: { driver: { include: { user: true } } }
            });
            if (
              !availability ||
              availability.operational_mode !== CANONICAL_MODE ||
              availability.route_version_id !== seedDemand.routeVersionId ||
              availability.status !== "active" ||
              availability.availability_status !== "active" ||
              !availability.departure_at ||
              availability.departure_at <= now ||
              !availability.driver.verified ||
              availability.driver.user.role !== "driver" ||
              availability.driver.user.account_status !== "active"
            ) throw new HttpError(409, "candidate_state_changed");

            const additionalRows = await tx.canonicalDemandDispatch.findMany({
              where: {
                id: { not: seed.id },
                operational_mode: CANONICAL_MODE,
                route_version_id: seedDemand.routeVersionId,
                status: "pending",
                attempt_count: { lt: SHARED_LIMITS.maximumAttempts },
                active_manifest_id: null,
                accepted_manifest_id: null,
                attempts: { none: { driver_route_id: availability.id } }
              },
              select: { id: true },
              orderBy: { id: "asc" },
              take: SHARED_LIMITS.maximumBatchSize
            });
            await lockDispatches(tx, additionalRows.map((row) => row.id));
            const additional: Demand[] = [];
            for (const row of additionalRows) {
              try {
                const demand = await loadDemand(tx, row.id);
                await lockDemand(tx, demand);
                if (
                  demand.eligible &&
                  demand.routeVersionId === seedDemand.routeVersionId &&
                  availability.departure_at >= demand.departureFrom &&
                  availability.departure_at <= demand.departureUntil
                ) additional.push(demand);
              } catch (error) {
                if (!(error instanceof HttpError)) throw error;
              }
            }
            additional.sort(memberOrder);
            const members = [seedDemand];
            let passengerSeats = seedDemand.passengerSeats;
            let parcelUnits = seedDemand.parcelUnits;
            let passengerCount = seedDemand.type === "passenger" ? 1 : 0;
            let merchantCount = seedDemand.type === "merchant_order" ? 1 : 0;
            for (const demand of additional) {
              if (members.length >= SHARED_LIMITS.maximumMembers) break;
              const nextPassengerCount = passengerCount + (demand.type === "passenger" ? 1 : 0);
              const nextMerchantCount = merchantCount + (demand.type === "merchant_order" ? 1 : 0);
              const nextSeats = passengerSeats + demand.passengerSeats;
              const nextParcels = parcelUnits + demand.parcelUnits;
              if (
                nextPassengerCount > SHARED_LIMITS.maximumPassengers ||
                nextMerchantCount > SHARED_LIMITS.maximumMerchantOrders ||
                nextParcels > SHARED_LIMITS.maximumParcelUnits ||
                nextSeats > availability.remaining_seats! ||
                nextParcels > availability.remaining_parcel_capacity!
              ) continue;
              members.push(demand);
              passengerCount = nextPassengerCount;
              merchantCount = nextMerchantCount;
              passengerSeats = nextSeats;
              parcelUnits = nextParcels;
            }
            if (
              passengerSeats > availability.remaining_seats! ||
              parcelUnits > availability.remaining_parcel_capacity!
            ) throw new HttpError(409, "insufficient_capacity");
            const fingerprints = members.map(memberFingerprint);
            const fingerprint = manifestFingerprint({
              routeVersionId: seedDemand.routeVersionId,
              driverRouteId: availability.id,
              memberFingerprints: fingerprints,
              passengerSeats,
              parcelUnits
            });
            const manifest = await tx.canonicalTripManifest.create({
              data: {
                match_version: SHARED_MATCH_VERSION,
                trip_version: SHARED_TRIP_VERSION,
                capacity_model: GLOBAL_CAPACITY_VERSION,
                route_version_id: seedDemand.routeVersionId,
                driver_route_id: availability.id,
                member_count: members.length,
                passenger_request_count: passengerCount,
                passenger_seat_count: passengerSeats,
                merchant_order_count: merchantCount,
                parcel_unit_count: parcelUnits,
                manifest_fingerprint: fingerprint,
                manifest_schema_version: SHARED_MANIFEST_VERSION,
                active_availability_key: availability.id
              }
            });
            for (let index = 0; index < members.length; index++) {
              const demand = members[index]!;
              await tx.canonicalTripManifestMember.create({
                data: {
                  manifest_id: manifest.id,
                  dispatch_id: demand.dispatchId,
                  operational_mode: CANONICAL_MODE,
                  demand_type: demand.type,
                  member_sequence: index + 1,
                  demand_id: demand.id,
                  passenger_request_id: demand.type === "passenger" ? demand.id : null,
                  merchant_order_id: demand.type === "merchant_order" ? demand.id : null,
                  passenger_seats: demand.passengerSeats,
                  parcel_units: demand.parcelUnits,
                  pickup_stop_id: demand.pickupStopId,
                  drop_off_stop_id: demand.dropOffStopId,
                  destination_summary_json: demand.type === "merchant_order"
                    ? { stop_ids: [...demand.destinationStopIds].sort() }
                    : Prisma.DbNull,
                  demand_fingerprint: fingerprints[index]!,
                  attempt_number: demand.attemptNumber,
                  active_dispatch_key: demand.dispatchId,
                  route_version_id: demand.routeVersionId
                }
              });
            }
            const decremented = await tx.driverRoute.updateMany({
              where: {
                id: availability.id,
                availability_status: "active",
                remaining_seats: { gte: passengerSeats },
                remaining_parcel_capacity: { gte: parcelUnits }
              },
              data: {
                remaining_seats: { decrement: passengerSeats },
                remaining_parcel_capacity: { decrement: parcelUnits }
              }
            });
            if (decremented.count !== 1) throw new HttpError(409, "insufficient_capacity");
            const expiresAt = new Date(
              now.getTime() + SHARED_LIMITS.offerLifetimeMinutes * 60_000
            );
            const reservation = await tx.capacityReservation.create({
              data: {
                driver_route_id: availability.id,
                route_version_id: seedDemand.routeVersionId,
                manifest_id: manifest.id,
                reservation_type:
                  passengerSeats > 0 && parcelUnits > 0
                    ? "combined"
                    : passengerSeats > 0
                      ? "passenger"
                      : "parcel",
                seats_reserved: passengerSeats,
                parcel_units_reserved: parcelUnits,
                expires_at: expiresAt,
                created_request_id: input.requestId,
                idempotency_fingerprint: digest(`shared_manifest:${manifest.id}`),
                operational_mode: CANONICAL_MODE,
                capacity_model: GLOBAL_CAPACITY_VERSION,
                reservation_fingerprint: fingerprint
              }
            });
            const offer = await tx.match.create({
              data: {
                driver_route_id: availability.id,
                score: new Prisma.Decimal(selected.score),
                method: SHARED_MATCH_VERSION,
                explanation: "canonical shared route-version manifest",
                scoring_breakdown: {
                  scorer_version: "canonical_route_match_v1",
                  departure_delta_seconds: selected.departureDeltaSeconds,
                  final_score: selected.score,
                  aggregate_counts: {
                    members: members.length,
                    passenger_requests: passengerCount,
                    passenger_seats: passengerSeats,
                    merchant_orders: merchantCount,
                    parcel_units: parcelUnits
                  }
                },
                status: "sent_to_driver",
                route_version_id: seedDemand.routeVersionId,
                canonical_match_version: SHARED_MATCH_VERSION,
                operational_mode: CANONICAL_MODE,
                reservation_id: reservation.id,
                offered_at: now,
                expires_at: expiresAt,
                score_version: "canonical_route_match_v1",
                active_driver_route_key: availability.id,
                manifest_id: manifest.id,
                active_manifest_key: manifest.id
              }
            });
            await tx.capacityReservation.update({
              where: { id: reservation.id },
              data: { match_id: offer.id }
            });
            for (const demand of members) {
              await tx.canonicalDemandAttempt.create({
                data: {
                  dispatch_id: demand.dispatchId,
                  driver_route_id: availability.id,
                  manifest_id: manifest.id,
                  match_offer_id: offer.id,
                  attempt_number: demand.attemptNumber
                }
              });
              await tx.canonicalDemandDispatch.update({
                where: { id: demand.dispatchId },
                data: {
                  status: "offered",
                  active_match_offer_id: offer.id,
                  active_manifest_id: manifest.id,
                  attempt_count: { increment: 1 },
                  revision: { increment: 1 }
                }
              });
            }
            await tx.canonicalTripManifest.update({
              where: { id: manifest.id },
              data: {
                lifecycle_status: "offered",
                active_offer_id: offer.id,
                reservation_id: reservation.id,
                offered_at: now,
                offered_revision: 2,
                revision: { increment: 1 }
              }
            });
            await auditEvent(tx, {
              action: AuditAction.canonical_manifest_created,
              entityType: "CanonicalTripManifest",
              entityId: manifest.id,
              metadata: {
                route_version_id: manifest.route_version_id,
                driver_route_id: manifest.driver_route_id,
                member_count: members.length,
                passenger_seats: passengerSeats,
                parcel_units: parcelUnits,
                request_id: input.requestId
              }
            });
            await auditEvent(tx, {
              action: AuditAction.canonical_manifest_offered,
              entityType: "CanonicalTripManifest",
              entityId: manifest.id,
              metadata: {
                route_version_id: manifest.route_version_id,
                driver_route_id: manifest.driver_route_id,
                member_count: members.length,
                request_id: input.requestId
              }
            });
            return { manifestId: manifest.id, offerId: offer.id };
          }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
          if (formed) {
            result.offered += 1;
            result.manifestIds.push(formed.manifestId);
            result.offerIds.push(formed.offerId);
          } else result.skipped += 1;
        } catch (error) {
          if (input.throwOnFailure) throw error;
          result.failed += 1;
        }
      }
      return result;
    },

    async listDriverOffers(driverUserId: string, limit = 25) {
      requireEnabled();
      return db.match.findMany({
        where: {
          operational_mode: CANONICAL_MODE,
          canonical_match_version: SHARED_MATCH_VERSION,
          driver_route: {
            driver: {
              user_id: driverUserId,
              verified: true,
              user: { role: "driver", account_status: "active" }
            }
          }
        },
        include: {
          driver_route: { select: { departure_at: true } },
          route_version: {
            select: {
              id: true,
              name_ar: true,
              name_en: true,
              service_route: { select: { direction: true } },
              stops: {
                orderBy: { sequence: "asc" },
                select: {
                  sequence: true,
                  stop: { select: { id: true, name_ar: true, name_en: true } }
                }
              }
            }
          },
          canonical_manifest: {
            include: {
              members: {
                orderBy: { member_sequence: "asc" },
                select: {
                  member_sequence: true,
                  demand_type: true,
                  passenger_seats: true,
                  parcel_units: true,
                  pickup_stop_id: true,
                  drop_off_stop_id: true,
                  destination_summary_json: true
                }
              },
              assigned_trip: {
                select: {
                  id: true,
                  status: true,
                  route_version_id: true,
                  created_at: true
                }
              }
            }
          }
        },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: Math.min(Math.max(limit, 1), 50)
      });
    },

    async getDriverOffer(driverUserId: string, offerId: string) {
      requireEnabled();
      const rows = await this.listDriverOffers(driverUserId, 50);
      const offer = rows.find((row) => row.id === offerId);
      if (!offer) throw new HttpError(404, "canonical_shared_offer_not_found");
      return offer;
    },

    async accept(driverUserId: string, offerId: string, actor: Actor) {
      requireEnabled();
      const owned = await this.getDriverOffer(driverUserId, offerId);
      try {
        const result = await db.$transaction(async (tx) => {
          const manifestId = owned.manifest_id!;
          await lockRow(tx, "canonical_trip_manifests", manifestId);
          const manifestLookup = await tx.canonicalTripManifest.findUniqueOrThrow({
            where: { id: manifestId }
          });
          const claim = await claimMutation(
            tx,
            "canonical_shared_offer_accept",
            actor,
            offerId,
            manifestId,
            manifestLookup.offered_revision!,
            {}
          );
          if (claim.kind === "replay") {
            if (claim.record.resource_type !== "Trip" || !claim.record.resource_id) {
              throw new HttpError(409, "idempotency_replay_unavailable");
            }
            const trip = await tx.trip.findFirst({
              where: {
                id: claim.record.resource_id,
                manifest_id: manifestId,
                canonical_match_id: offerId
              }
            });
            if (!trip) throw new HttpError(409, "idempotency_replay_unavailable");
            return { trip, replayed: true };
          }
          await requireEligibleOperationalRoute(tx, manifestLookup.route_version_id, {
            lockForUpdate: true
          }).catch((error) => {
            if (!(error instanceof HttpError)) throw error;
          });
          await lockRow(tx, "driver_routes", manifestLookup.driver_route_id);
          await lockRow(tx, "matches", offerId);
          await lockRow(tx, "capacity_reservations", manifestLookup.reservation_id!);
          const aggregate = await tx.match.findUniqueOrThrow({
            where: { id: offerId },
            include: {
              offer_reservation: true,
              driver_route: { include: { driver: { include: { user: true } } } },
              canonical_manifest: {
                include: {
                  members: {
                    include: { dispatch: true },
                    orderBy: { member_sequence: "asc" }
                  }
                }
              }
            }
          });
          const manifest = aggregate.canonical_manifest!;
          if (aggregate.status === "accepted" && manifest.lifecycle_status === "accepted") {
            const trip = await tx.trip.findUnique({ where: { manifest_id: manifest.id } });
            if (!trip) throw new HttpError(409, "canonical_shared_trip_missing");
            await completeIdempotency(tx, {
              recordId: claim.record.id,
              claimVersion: claim.record.claim_version,
              resourceType: "Trip",
              resourceId: trip.id,
              responseStatus: 200
            });
            return { trip, replayed: true };
          }
          await lockDispatches(tx, manifest.members.map((member) => member.dispatch_id));
          const demands: Demand[] = [];
          for (const member of manifest.members) {
            const demand = await loadDemand(tx, member.dispatch_id);
            await lockDemand(tx, demand);
            demands.push(demand);
          }
          const now = new Date();
          const fingerprints = demands.map(memberFingerprint);
          const expectedManifestFingerprint = manifestFingerprint({
            routeVersionId: manifest.route_version_id,
            driverRouteId: manifest.driver_route_id,
            memberFingerprints: fingerprints,
            passengerSeats: demands.reduce((sum, item) => sum + item.passengerSeats, 0),
            parcelUnits: demands.reduce((sum, item) => sum + item.parcelUnits, 0)
          });
          const invalid =
            aggregate.status !== "sent_to_driver" ||
            manifest.lifecycle_status !== "offered" ||
            aggregate.expires_at! <= now ||
            !aggregate.offer_reservation ||
            aggregate.offer_reservation.status !== "held" ||
            aggregate.offer_reservation.manifest_id !== manifest.id ||
            aggregate.offer_reservation.reservation_fingerprint !== manifest.manifest_fingerprint ||
            aggregate.driver_route.driver.user_id !== driverUserId ||
            !aggregate.driver_route.driver.verified ||
            aggregate.driver_route.driver.user.role !== "driver" ||
            aggregate.driver_route.driver.user.account_status !== "active" ||
            aggregate.driver_route.status !== "active" ||
            aggregate.driver_route.availability_status !== "active" ||
            !aggregate.driver_route.departure_at ||
            aggregate.driver_route.departure_at <= now ||
            demands.some((demand, index) =>
              !demand.eligible ||
              demand.dispatchStatus !== "offered" ||
              demand.activeMatchOfferId !== aggregate.id ||
              demand.activeManifestId !== manifest.id ||
              demand.routeVersionId !== manifest.route_version_id ||
              aggregate.driver_route.departure_at! < demand.departureFrom ||
              aggregate.driver_route.departure_at! > demand.departureUntil ||
              fingerprints[index] !== manifest.members[index]!.demand_fingerprint
            ) ||
            expectedManifestFingerprint !== manifest.manifest_fingerprint;
          if (invalid) {
            await terminalize(
              tx,
              aggregate,
              "system_invalidated",
              undefined,
              now,
              actor.requestId,
              driverUserId
            );
            await completeIdempotency(tx, {
              recordId: claim.record.id,
              claimVersion: claim.record.claim_version,
              resourceType: "Match",
              resourceId: offerId,
              responseStatus: 409
            });
            return { invalid: true as const };
          }
          const snapshot = await buildSnapshot(tx, manifest, demands);
          const reservation = aggregate.offer_reservation!;
          await tx.capacityReservation.update({
            where: { id: reservation.id },
            data: { status: "confirmed", confirmed_at: now, revision: { increment: 1 } }
          });
          await tx.match.update({
            where: { id: offerId },
            data: {
              status: "accepted",
              accepted_at: now,
              active_manifest_key: null,
              accepted_manifest_key: manifest.id,
              active_driver_route_key: null,
              accepted_driver_route_key: manifest.driver_route_id
            }
          });
          const trip = await tx.trip.create({
            data: {
              driver_id: aggregate.driver_route.driver.user_id,
              driver_route_id: manifest.driver_route_id,
              status: "accepted",
              route_version_id: manifest.route_version_id,
              canonical_trip_version: SHARED_TRIP_VERSION,
              route_snapshot_json: snapshot.snapshot,
              route_snapshot_checksum: snapshot.checksum,
              route_snapshot_schema_version: SHARED_SNAPSHOT_VERSION,
              operational_mode: CANONICAL_MODE,
              canonical_match_id: offerId,
              canonical_availability_key: manifest.driver_route_id,
              manifest_id: manifest.id
            }
          });
          for (const member of manifest.members) {
            await tx.canonicalDemandDispatch.update({
              where: { id: member.dispatch_id },
              data: {
                status: "assigned",
                active_match_offer_id: null,
                active_manifest_id: null,
                accepted_manifest_id: manifest.id,
                assigned_trip_id: trip.id,
                revision: { increment: 1 }
              }
            });
            if (member.demand_type === "passenger") {
              await tx.passengerRequest.update({
                where: { id: member.passenger_request_id! },
                data: { status: "matched" }
              });
            } else {
              await tx.merchantOrder.update({
                where: { id: member.merchant_order_id! },
                data: { status: "assigned" }
              });
              await tx.parcel.updateMany({
                where: { order_id: member.merchant_order_id! },
                data: { status: "assigned" }
              });
            }
          }
          await tx.canonicalTripManifestMember.updateMany({
            where: { manifest_id: manifest.id },
            data: { member_status: "accepted" }
          });
          await tx.canonicalTripManifest.update({
            where: { id: manifest.id },
            data: {
              lifecycle_status: "accepted",
              active_offer_id: null,
              accepted_offer_id: offerId,
              assigned_trip_id: trip.id,
              accepted_at: now,
              revision: { increment: 1 }
            }
          });
          await tx.driverRoute.update({
            where: { id: manifest.driver_route_id },
            data: {
              status: "assigned",
              availability_status: "filled",
              filled_at: now,
              availability_revision: { increment: 1 }
            }
          });
          await auditEvent(tx, {
            userId: driverUserId,
            action: AuditAction.canonical_manifest_accepted,
            entityType: "CanonicalTripManifest",
            entityId: manifest.id,
            metadata: {
              route_version_id: manifest.route_version_id,
              driver_route_id: manifest.driver_route_id,
              member_count: manifest.member_count,
              request_id: actor.requestId
            }
          });
          await auditEvent(tx, {
            userId: driverUserId,
            action: AuditAction.canonical_shared_trip_created,
            entityType: "Trip",
            entityId: trip.id,
            metadata: {
              route_version_id: manifest.route_version_id,
              driver_route_id: manifest.driver_route_id,
              member_count: manifest.member_count,
              request_id: actor.requestId
            }
          });
          await completeIdempotency(tx, {
            recordId: claim.record.id,
            claimVersion: claim.record.claim_version,
            resourceType: "Trip",
            resourceId: trip.id,
            responseStatus: 200
          });
          return { trip, replayed: false };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
        if ("invalid" in result) throw new HttpError(409, "canonical_manifest_invalidated");
        return result;
      } catch (error) {
        safeTransactionError(error);
      }
    },

    async reject(
      driverUserId: string,
      offerId: string,
      reason: CanonicalRejectReason,
      actor: Actor
    ) {
      requireEnabled();
      const owned = await this.getDriverOffer(driverUserId, offerId);
      try {
        return await db.$transaction(async (tx) => {
          const manifestId = owned.manifest_id!;
          await lockRow(tx, "canonical_trip_manifests", manifestId);
          const manifestLookup = await tx.canonicalTripManifest.findUniqueOrThrow({
            where: { id: manifestId }
          });
          const claim = await claimMutation(
            tx,
            "canonical_shared_offer_reject",
            actor,
            offerId,
            manifestId,
            manifestLookup.offered_revision!,
            { reason }
          );
          if (claim.kind === "replay") {
            const offer = await tx.match.findUnique({ where: { id: offerId } });
            if (!offer || offer.status !== "rejected") {
              throw new HttpError(409, "idempotency_replay_unavailable");
            }
            return { offer, replayed: true };
          }
          await lockRow(tx, "driver_routes", manifestLookup.driver_route_id);
          await lockRow(tx, "matches", offerId);
          await lockRow(tx, "capacity_reservations", manifestLookup.reservation_id!);
          const aggregate = await tx.match.findUniqueOrThrow({
            where: { id: offerId },
            include: {
              offer_reservation: true,
              driver_route: { include: { driver: { include: { user: true } } } },
              canonical_manifest: {
                include: {
                  members: { include: { dispatch: true }, orderBy: { member_sequence: "asc" } }
                }
              }
            }
          });
          if (
            aggregate.status === "rejected" &&
            aggregate.canonical_manifest?.lifecycle_status === "rejected"
          ) {
            await completeIdempotency(tx, {
              recordId: claim.record.id,
              claimVersion: claim.record.claim_version,
              resourceType: "Match",
              resourceId: offerId,
              responseStatus: 200
            });
            return { offer: aggregate, replayed: true };
          }
          if (
            aggregate.status !== "sent_to_driver" ||
            aggregate.driver_route.driver.user_id !== driverUserId ||
            aggregate.driver_route.driver.user.account_status !== "active" ||
            aggregate.driver_route.driver.user.role !== "driver" ||
            !aggregate.driver_route.driver.verified
          ) throw new HttpError(409, "canonical_shared_offer_not_rejectable");
          await lockDispatches(
            tx,
            aggregate.canonical_manifest!.members.map((member) => member.dispatch_id)
          );
          const now = new Date();
          await terminalize(
            tx,
            aggregate,
            "rejected",
            reason,
            now,
            actor.requestId,
            driverUserId
          );
          await completeIdempotency(tx, {
            recordId: claim.record.id,
            claimVersion: claim.record.claim_version,
            resourceType: "Match",
            resourceId: offerId,
            responseStatus: 200
          });
          return {
            offer: await tx.match.findUniqueOrThrow({ where: { id: offerId } }),
            replayed: false
          };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
      } catch (error) {
        safeTransactionError(error);
      }
    },

    async expire(input: { now?: Date; limit?: number; requestId?: string } = {}) {
      requireEnabled();
      const now = input.now ?? new Date();
      const candidates = await db.match.findMany({
        where: {
          canonical_match_version: SHARED_MATCH_VERSION,
          status: "sent_to_driver",
          expires_at: { lte: now },
          expiry_failure_count: { lt: SHARED_LIMITS.expiryFailureLimit }
        },
        select: { id: true, manifest_id: true },
        orderBy: [{ expires_at: "asc" }, { id: "asc" }],
        take: Math.min(Math.max(input.limit ?? 25, 1), 100)
      });
      const result = { examined: candidates.length, expired: 0, failed: 0 };
      for (const candidate of candidates) {
        try {
          const changed = await db.$transaction(async (tx) => {
            await lockRow(tx, "canonical_trip_manifests", candidate.manifest_id!);
            const lookup = await tx.canonicalTripManifest.findUniqueOrThrow({
              where: { id: candidate.manifest_id! }
            });
            await lockRow(tx, "driver_routes", lookup.driver_route_id);
            await lockRow(tx, "matches", candidate.id);
            await lockRow(tx, "capacity_reservations", lookup.reservation_id!);
            const aggregate = await tx.match.findUniqueOrThrow({
              where: { id: candidate.id },
              include: {
                offer_reservation: true,
                canonical_manifest: {
                  include: {
                    members: { include: { dispatch: true }, orderBy: { member_sequence: "asc" } }
                  }
                }
              }
            });
            if (aggregate.status !== "sent_to_driver" || aggregate.expires_at! > now) {
              return false;
            }
            await lockDispatches(
              tx,
              aggregate.canonical_manifest!.members.map((member) => member.dispatch_id)
            );
            await terminalize(
              tx,
              aggregate,
              "expired",
              undefined,
              now,
              input.requestId
            );
            return true;
          }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
          if (changed) result.expired += 1;
        } catch {
          result.failed += 1;
          await db.match.updateMany({
            where: {
              id: candidate.id,
              status: "sent_to_driver",
              expiry_failure_count: { lt: SHARED_LIMITS.expiryFailureLimit }
            },
            data: {
              expiry_failure_count: { increment: 1 },
              expiry_last_failed_at: new Date()
            }
          });
        }
      }
      return result;
    }
  };
}

export type CanonicalSharedMatchingService = ReturnType<
  typeof createCanonicalSharedMatchingService
>;
export const canonicalSharedMatchingService = createCanonicalSharedMatchingService();
export const canonicalSharedFingerprints = {
  member: memberFingerprint,
  manifest: manifestFingerprint
};
