import { HttpError } from "../middleware/error.js";

type CanonicalDemand = {
  routeVersionId: string | null;
  pickupSequence: number;
  destinationSequences: number[];
};

export function requireCanonicalMatchCompatibility(input: {
  offerRouteVersionId: string;
  availabilityRouteVersionId: string | null;
  demand: CanonicalDemand;
  reservationRouteVersionId?: string | null;
}) {
  if (
    !input.availabilityRouteVersionId ||
    !input.demand.routeVersionId ||
    input.offerRouteVersionId !== input.availabilityRouteVersionId ||
    input.offerRouteVersionId !== input.demand.routeVersionId ||
    (input.reservationRouteVersionId !== undefined && input.offerRouteVersionId !== input.reservationRouteVersionId)
  ) throw new HttpError(409, "canonical_route_mismatch");
  if (
    input.demand.destinationSequences.length === 0 ||
    input.demand.destinationSequences.some((sequence) => sequence <= input.demand.pickupSequence)
  ) throw new HttpError(409, "canonical_stop_order_mismatch");
  return true;
}
