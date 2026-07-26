import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { clamp01, haversineKm, LOCKED_DESTINATION, LOCKED_ORIGIN, round, toNumber } from "../lib/geo.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { LOCKED_CORRIDOR_KEY, LOCKED_CORRIDOR_LABEL } from "./demoReset.js";
import type { Prisma } from "../generated/prisma/client.js";
import { AuditAction, MatchStatus } from "../generated/prisma/enums.js";

const runMatchSchema = z
  .object({
    passengerRequestId: z.string().optional(),
    merchantOrderId: z.string().optional()
  })
  .refine((value) => value.passengerRequestId || value.merchantOrderId, {
    message: "passengerRequestId or merchantOrderId is required"
  });

type MatchInput = z.infer<typeof runMatchSchema>;

const listMatchesQuerySchema = z.object({
  status: z.enum(MatchStatus).optional()
});

const matchSummarySelect = {
  id: true,
  status: true,
  score: true,
  method: true,
  explanation: true,
  scoring_breakdown: true,
  created_at: true,
  operational_mode: true,
  canonical_match_version: true,
  route_version_id: true,
  driver_route: {
    select: {
      id: true,
      origin_label: true,
      destination_label: true,
      corridor_key: true,
      seats_available: true,
      parcel_capacity_available: true,
      status: true,
      driver: {
        select: {
          user_id: true,
          vehicle_type: true,
          verified: true,
          trust_score: true
        }
      }
    }
  },
  passenger_request: {
    select: {
      id: true,
      passenger_id: true,
      pickup_label: true,
      destination_label: true,
      preferred_time: true,
      passenger_count: true,
      status: true,
      created_at: true
    }
  },
  merchant_order: {
    select: {
      id: true,
      merchant_id: true,
      pickup_label: true,
      status: true,
      created_at: true,
      _count: { select: { parcels: true } }
    }
  },
  parcel_batch: {
    select: {
      id: true,
      status: true,
      estimated_distance_saved: true,
      explanation: true,
      created_at: true
    }
  }
} satisfies Prisma.MatchSelect;

type MatchSummaryRecord = Prisma.MatchGetPayload<{ select: typeof matchSummarySelect }>;

export const matchingRouter = Router();

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string") throw new HttpError(400, "invalid_route_param");
  return value;
}

function matchWhereForUser(req: AuthenticatedRequest): Prisma.MatchWhereInput {
  if (req.user!.role === "admin") return {};
  if (req.user!.role === "driver") return { driver_route: { driver: { user_id: req.user!.id } } };
  if (req.user!.role === "passenger") return { passenger_request: { passenger_id: req.user!.id } };
  return { merchant_order: { merchant_id: req.user!.id } };
}

function toMatchSummary(match: MatchSummaryRecord) {
  return {
    id: match.id,
    status: match.status,
    score: match.score,
    method: match.method,
    explanation: match.explanation,
    scoring_breakdown: match.scoring_breakdown,
    created_at: match.created_at,
    driver_route: {
      id: match.driver_route.id,
      origin_label: match.driver_route.origin_label,
      destination_label: match.driver_route.destination_label,
      corridor_key: match.driver_route.corridor_key,
      seats_available: match.driver_route.seats_available,
      parcel_capacity_available: match.driver_route.parcel_capacity_available,
      status: match.driver_route.status,
      driver: {
        vehicle_type: match.driver_route.driver.vehicle_type,
        verified: match.driver_route.driver.verified,
        trust_score: match.driver_route.driver.trust_score
      }
    },
    passenger_request: match.passenger_request
      ? {
          id: match.passenger_request.id,
          pickup_label: match.passenger_request.pickup_label,
          destination_label: match.passenger_request.destination_label,
          preferred_time: match.passenger_request.preferred_time,
          passenger_count: match.passenger_request.passenger_count,
          status: match.passenger_request.status,
          created_at: match.passenger_request.created_at
        }
      : null,
    merchant_order: match.merchant_order
      ? {
          id: match.merchant_order.id,
          pickup_label: match.merchant_order.pickup_label,
          status: match.merchant_order.status,
          parcel_count: match.merchant_order._count.parcels,
          created_at: match.merchant_order.created_at
        }
      : null,
    parcel_batch: match.parcel_batch
      ? {
          id: match.parcel_batch.id,
          status: match.parcel_batch.status,
          estimated_distance_saved: match.parcel_batch.estimated_distance_saved,
          explanation: match.parcel_batch.explanation,
          created_at: match.parcel_batch.created_at
        }
      : null
  };
}

async function loadAuthorizedInput(req: AuthenticatedRequest, input: MatchInput) {
  const passengerRequest = input.passengerRequestId
    ? await prisma.passengerRequest.findUnique({ where: { id: input.passengerRequestId } })
    : null;
  const merchantOrder = input.merchantOrderId
    ? await prisma.merchantOrder.findUnique({
        where: { id: input.merchantOrderId },
        include: {
          parcels: true,
          parcel_batches: { select: { id: true }, orderBy: { created_at: "desc" }, take: 1 }
        }
      })
    : null;

  if (input.passengerRequestId && !passengerRequest) throw new HttpError(404, "passenger_request_not_found");
  if (input.merchantOrderId && !merchantOrder) throw new HttpError(404, "merchant_order_not_found");
  if (req.user!.role !== "admin") {
    if (passengerRequest && (req.user!.role !== "passenger" || passengerRequest.passenger_id !== req.user!.id)) {
      throw new HttpError(403, "forbidden");
    }
    if (merchantOrder && (req.user!.role !== "merchant" || merchantOrder.merchant_id !== req.user!.id)) {
      throw new HttpError(403, "forbidden");
    }
  }
  if (passengerRequest?.canonical_entry_version || merchantOrder?.canonical_entry_version) {
    throw new HttpError(409, "canonical_matching_not_enabled");
  }

  return { passengerRequest, merchantOrder };
}

export function scoreDriverRoute(input: {
  route: {
    origin_label: string;
    destination_label: string;
    origin_lat: unknown;
    origin_lng: unknown;
    seats_available: number;
    parcel_capacity_available: number;
    driver: { trust_score: number };
  };
  passengerRequest?: { pickup_lat: unknown; pickup_lng: unknown; passenger_count: number; preferred_time: Date | string } | null;
  parcelCount: number;
}) {
  const isForwardCorridor =
    input.route.origin_label === "Hebron / PPU / Bab Al-Zawiya" && input.route.destination_label === "Bethlehem";
  const corridorOverlap = isForwardCorridor ? 0.95 : 0.3;
  const pickupPoint = input.passengerRequest
    ? { lat: toNumber(input.passengerRequest.pickup_lat), lng: toNumber(input.passengerRequest.pickup_lng) }
    : LOCKED_ORIGIN;
  const routeOrigin = { lat: toNumber(input.route.origin_lat), lng: toNumber(input.route.origin_lng) };
  const pickupDistanceKm = haversineKm(routeOrigin, pickupPoint);
  const pickupDistanceScore = clamp01(1 - pickupDistanceKm / 25);
  const timingFit = 0.9;
  const trustScore = clamp01(input.route.driver.trust_score / 100);
  const seatFit = input.passengerRequest ? input.route.seats_available / Math.max(1, input.passengerRequest.passenger_count) : 1;
  const parcelFit = input.parcelCount > 0 ? input.route.parcel_capacity_available / input.parcelCount : 1;
  const capacityFit = clamp01(Math.min(seatFit, parcelFit));
  const finalScore = round(
    0.4 * corridorOverlap + 0.25 * pickupDistanceScore + 0.15 * timingFit + 0.1 * trustScore + 0.1 * capacityFit
  );

  return {
    corridorOverlap: round(corridorOverlap),
    pickupDistanceScore: round(pickupDistanceScore),
    timingFit: round(timingFit),
    trustScore: round(trustScore),
    capacityFit: round(capacityFit),
    finalScore,
    estimatedDeviationKm: round(pickupDistanceKm, 2)
  };
}

async function createBestMatch(req: AuthenticatedRequest, input: MatchInput) {
  const { passengerRequest, merchantOrder } = await loadAuthorizedInput(req, input);
  const parcelCount = merchantOrder?.parcels.length ?? 0;
  const routes = await prisma.driverRoute.findMany({
    where: {
      status: "active",
      corridor_key: LOCKED_CORRIDOR_KEY,
      canonical_availability_version: null,
      operational_mode: "legacy",
      driver: { verified: true }
    },
    include: { driver: true },
    orderBy: { id: "asc" }
  });

  const candidates = routes
    .filter((route) => !passengerRequest || route.seats_available >= passengerRequest.passenger_count)
    .filter((route) => parcelCount === 0 || route.parcel_capacity_available >= parcelCount)
    .map((route) => ({ route, breakdown: scoreDriverRoute({ route, passengerRequest, parcelCount }) }))
    .sort((a, b) => {
      if (b.breakdown.finalScore !== a.breakdown.finalScore) return b.breakdown.finalScore - a.breakdown.finalScore;
      if (a.breakdown.estimatedDeviationKm !== b.breakdown.estimatedDeviationKm) {
        return a.breakdown.estimatedDeviationKm - b.breakdown.estimatedDeviationKm;
      }
      if (b.route.driver.trust_score !== a.route.driver.trust_score) return b.route.driver.trust_score - a.route.driver.trust_score;
      return a.route.id.localeCompare(b.route.id);
    });

  const best = candidates[0];
  if (!best) throw new HttpError(404, "no_compatible_driver_route");

  const explanation =
    `Driver selected because the route matches the ${LOCKED_CORRIDOR_LABEL} corridor, ` +
    "pickup is near the route, capacity is available, and trust score is high.";

  const match = await prisma.match.create({
    data: {
      driver_route_id: best.route.id,
      passenger_request_id: passengerRequest?.id,
      merchant_order_id: merchantOrder?.id,
      parcel_batch_id: merchantOrder?.parcel_batches[0]?.id,
      score: best.breakdown.finalScore.toFixed(4),
      method: "masari_route_score",
      explanation,
      scoring_breakdown: best.breakdown,
      status: "proposed"
    },
    include: { driver_route: { include: { driver: true } }, passenger_request: true, merchant_order: true, parcel_batch: true }
  });

  await auditEvent(prisma, {
    userId: req.user!.id,
    action: AuditAction.match_decision,
    entityType: "Match",
    entityId: match.id,
    metadata: { method: match.method, score: best.breakdown.finalScore }
  });

  return { match, scoringBreakdown: best.breakdown, candidatesConsidered: candidates.length };
}

matchingRouter.post("/matches/run", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = runMatchSchema.parse(req.body);
    const result = await createBestMatch(req, input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

matchingRouter.get("/matches", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = listMatchesQuerySchema.parse(req.query);
    const matches = await prisma.match.findMany({
      where: { ...matchWhereForUser(req), ...(status ? { status } : {}) },
      select: matchSummarySelect,
      orderBy: { created_at: "desc" }
    });

    res.json({
      matches: matches
        .filter((match) => {
          const mode = match as MatchSummaryRecord & {
            operational_mode?: string;
            canonical_match_version?: string | null;
            route_version_id?: string | null;
          };
          return (mode.operational_mode ?? "legacy") === "legacy" &&
            !mode.canonical_match_version &&
            !mode.route_version_id;
        })
        .map(toMatchSummary)
    });
  } catch (error) {
    next(error);
  }
});

matchingRouter.get("/matches/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const matchId = routeParam(req.params.id);
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: matchSummarySelect
    });
    if (!match) throw new HttpError(404, "match_not_found");
    const mode = match as MatchSummaryRecord & {
      operational_mode?: string;
      canonical_match_version?: string | null;
      route_version_id?: string | null;
    };
    if ((mode.operational_mode ?? "legacy") !== "legacy" || mode.canonical_match_version || mode.route_version_id) {
      throw new HttpError(404, "match_not_found");
    }

    if (req.user!.role !== "admin") {
      const ownsDriver = req.user!.role === "driver" && match.driver_route.driver.user_id === req.user!.id;
      const ownsPassenger = req.user!.role === "passenger" && match.passenger_request?.passenger_id === req.user!.id;
      const ownsMerchant = req.user!.role === "merchant" && match.merchant_order?.merchant_id === req.user!.id;
      if (!ownsDriver && !ownsPassenger && !ownsMerchant) throw new HttpError(403, "forbidden");
    }

    const summary = toMatchSummary(match);
    res.json({ match: summary, scoringBreakdown: summary.scoring_breakdown });
  } catch (error) {
    next(error);
  }
});
