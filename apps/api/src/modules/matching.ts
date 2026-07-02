import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { clamp01, haversineKm, LOCKED_DESTINATION, LOCKED_ORIGIN, round, toNumber } from "../lib/geo.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { LOCKED_CORRIDOR_KEY, LOCKED_CORRIDOR_LABEL } from "./demoReset.js";
import { AuditAction } from "../generated/prisma/enums.js";

const runMatchSchema = z
  .object({
    passengerRequestId: z.string().optional(),
    merchantOrderId: z.string().optional()
  })
  .refine((value) => value.passengerRequestId || value.merchantOrderId, {
    message: "passengerRequestId or merchantOrderId is required"
  });

type MatchInput = z.infer<typeof runMatchSchema>;

export const matchingRouter = Router();

function routeParam(value: string | string[] | undefined) {
  if (typeof value !== "string") throw new HttpError(400, "invalid_route_param");
  return value;
}

async function loadAuthorizedInput(req: AuthenticatedRequest, input: MatchInput) {
  const passengerRequest = input.passengerRequestId
    ? await prisma.passengerRequest.findUnique({ where: { id: input.passengerRequestId } })
    : null;
  const merchantOrder = input.merchantOrderId
    ? await prisma.merchantOrder.findUnique({ where: { id: input.merchantOrderId }, include: { parcels: true } })
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

matchingRouter.get("/matches/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const matchId = routeParam(req.params.id);
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { driver_route: { include: { driver: true } }, passenger_request: true, merchant_order: true, parcel_batch: true }
    });
    if (!match) throw new HttpError(404, "match_not_found");

    if (req.user!.role !== "admin") {
      const ownsPassenger = req.user!.role === "passenger" && match.passenger_request?.passenger_id === req.user!.id;
      const ownsMerchant = req.user!.role === "merchant" && match.merchant_order?.merchant_id === req.user!.id;
      if (!ownsPassenger && !ownsMerchant) throw new HttpError(403, "forbidden");
    }

    res.json({ match, scoringBreakdown: match.scoring_breakdown });
  } catch (error) {
    next(error);
  }
});
