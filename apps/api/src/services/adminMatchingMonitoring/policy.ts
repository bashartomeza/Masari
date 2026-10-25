import { Prisma } from "../../generated/prisma/client.js";

export const eligibleParcel = {
  operational_mode: "legacy",
  canonical_entry_version: null,
  route_version_id: null
} satisfies Prisma.ParcelWhereInput;

export const eligiblePassenger = {
  operational_mode: "legacy",
  canonical_entry_version: null,
  route_version_id: null,
  source: "manual",
  passenger: { is: { demo_account: false } }
} satisfies Prisma.PassengerRequestWhereInput;

const orderModeRules = {
  operational_mode: "legacy",
  canonical_entry_version: null,
  route_version_id: null,
  merchant: { is: { demo_account: false } }
} satisfies Prisma.MerchantOrderWhereInput;

/** The definition of an eligible order: legacy, non-demo, and every parcel eligible. */
export const eligibleOrder = {
  ...orderModeRules,
  parcels: { every: eligibleParcel }
} satisfies Prisma.MerchantOrderWhereInput;

export const eligibleRoute = {
  operational_mode: "legacy",
  canonical_availability_version: null,
  route_version_id: null,
  driver: { is: { user: { is: { demo_account: false } } } }
} satisfies Prisma.DriverRouteWhereInput;

function batchRule(order: Prisma.MerchantOrderWhereInput) {
  return {
    merchant_order: { is: order },
    OR: [
      { driver_route_id: null },
      { driver_route: { is: eligibleRoute } }
    ]
  } satisfies Prisma.ParcelBatchWhereInput;
}

function matchRule(order: Prisma.MerchantOrderWhereInput, batch: Prisma.ParcelBatchWhereInput) {
  return {
    operational_mode: "legacy",
    canonical_match_version: null,
    route_version_id: null,
    manifest_id: null,
    dispatch_id: null,
    reservation_id: null,
    driver_route: { is: eligibleRoute },
    OR: [
      { passenger_request_id: { not: null } },
      { merchant_order_id: { not: null } }
    ],
    AND: [
      { OR: [{ passenger_request_id: null }, { passenger_request: { is: eligiblePassenger } }] },
      { OR: [{ merchant_order_id: null }, { merchant_order: { is: order } }] },
      { OR: [{ parcel_batch_id: null }, { parcel_batch: { is: batch } }] }
    ]
  } satisfies Prisma.MatchWhereInput;
}

export const eligibleBatch = batchRule(eligibleOrder);

export const eligibleMatch = matchRule(eligibleOrder, eligibleBatch);

/**
 * The same eligibility as `eligibleOrder` / `eligibleBatch` / `eligibleMatch`, with the
 * "every parcel is eligible" rule replaced by an exclusion list of the (normally empty)
 * set of orders that hold an ineligible parcel. Prisma turns `parcels: { every }` into a
 * dependent subquery that is re-run for every match row, which made the 10,000-match
 * volume reads miss their budget; an id list is evaluated once.
 */
export function eligibilityFor(ineligibleOrderIds: readonly string[]) {
  const order: Prisma.MerchantOrderWhereInput = ineligibleOrderIds.length
    ? { ...orderModeRules, id: { notIn: [...ineligibleOrderIds] } }
    : orderModeRules;
  const batch = batchRule(order);
  return { eligibleOrder: order, eligibleBatch: batch, eligibleMatch: matchRule(order, batch) };
}

/** Orders that fail the parcel rule, i.e. hold at least one ineligible parcel. */
export const ordersWithIneligibleParcels = {
  parcels: { some: { NOT: eligibleParcel } }
} satisfies Prisma.MerchantOrderWhereInput;

const countedOrderSelect = {
  id: true,
  status: true,
  _count: { select: { parcels: { where: eligibleParcel } } }
} satisfies Prisma.MerchantOrderSelect;

export const matchSelect = {
  id: true,
  status: true,
  created_at: true,
  score: true,
  method: true,
  driver_route: { select: { id: true, status: true } },
  passenger_request: { select: { id: true, status: true, passenger_count: true } },
  merchant_order: { select: countedOrderSelect },
  parcel_batch: { select: { id: true, status: true } }
} satisfies Prisma.MatchSelect;

export const batchSelect = {
  id: true,
  status: true,
  created_at: true,
  merchant_order: { select: countedOrderSelect },
  driver_route: { select: { id: true, status: true } }
} satisfies Prisma.ParcelBatchSelect;

export const parcelSelect = {
  id: true,
  status: true
} satisfies Prisma.ParcelSelect;
