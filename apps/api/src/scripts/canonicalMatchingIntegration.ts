import { createCanonicalMatchingService } from "../services/canonicalMatching.js";
import { createCanonicalRouteSnapshotService } from "../services/canonicalRouteSnapshots.js";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

let assertions = 0;
function check(value: unknown, message: string) {
  if (!value) throw new Error(`M7C3A assertion failed: ${message}`);
  assertions += 1;
}
async function rejects(action: () => Promise<unknown>, message: string) {
  try {
    await action();
  } catch {
    assertions += 1;
    return;
  }
  throw new Error(`M7C3A assertion failed: ${message}`);
}

const now = new Date("2030-01-15T08:00:00.000Z");
const from = new Date("2030-01-15T09:00:00.000Z");
const until = new Date("2030-01-15T11:00:00.000Z");
const departure = new Date("2030-01-15T09:30:00.000Z");
const mode = "canonical_route_v1";

async function seed() {
  const admin = await prisma.user.create({
    data: {
      id: "m7c3a_admin",
      name: "M7C3A Admin",
      phone: "+970599910001",
      password_hash: "integration-only",
      role: "admin"
    }
  });
  const passenger = await prisma.user.create({
    data: {
      id: "m7c3a_passenger",
      name: "M7C3A Passenger",
      phone: "+970599910002",
      password_hash: "integration-only",
      role: "passenger"
    }
  });
  const merchant = await prisma.user.create({
    data: {
      id: "m7c3a_merchant",
      name: "M7C3A Merchant",
      phone: "+970599910003",
      password_hash: "integration-only",
      role: "merchant"
    }
  });
  const drivers = [];
  for (let index = 1; index <= 3; index += 1) {
    const user = await prisma.user.create({
      data: {
        id: `m7c3a_driver_user_${index}`,
        name: `M7C3A Driver ${index}`,
        phone: `+97059991000${index + 3}`,
        password_hash: "integration-only",
        role: "driver"
      }
    });
    const profile = await prisma.driverProfile.create({
      data: {
        id: `m7c3a_driver_profile_${index}`,
        user_id: user.id,
        vehicle_type: index === 1 ? "sedan" : "van",
        seats_total: 4,
        parcel_capacity: 10,
        verified: true,
        trust_score: index === 1 ? 95 : 85
      }
    });
    drivers.push({ user, profile });
  }
  const stops = [];
  for (const [index, names] of [
    ["origin", ["باب الزاوية", "Bab Al-Zawiya"]],
    ["pickup", ["جامعة بوليتكنك فلسطين", "Palestine Polytechnic University"]],
    ["middle", ["الخضر", "Al-Khader"]],
    ["destination", ["بيت لحم", "Bethlehem"]]
  ].entries()) {
    stops.push(await prisma.stop.create({
      data: {
        id: `m7c3a_stop_${index + 1}`,
        stop_key: `m7c3a-${names[0]}`,
        service_region_key: "palestine-south",
        name_ar: names[1][0],
        name_en: names[1][1],
        latitude: 31.5 + index / 100,
        longitude: 35.0 + index / 100,
        created_by_user_id: admin.id
      }
    }));
  }
  const route = await prisma.serviceRoute.create({
    data: {
      id: "m7c3a_route",
      route_key: "m7c3a-hebron-bethlehem",
      route_group_key: "m7c3a-south",
      service_region_key: "palestine-south",
      direction: "outbound",
      created_by_user_id: admin.id
    }
  });
  const version = await prisma.serviceRouteVersion.create({
    data: {
      id: "m7c3a_version",
      service_route_id: route.id,
      version_number: 1,
      status: "published",
      name_ar: "الخليل إلى بيت لحم",
      name_en: "Hebron to Bethlehem",
      origin_stop_id: stops[0].id,
      destination_stop_id: stops[3].id,
      active_from: new Date("2020-01-01T00:00:00.000Z"),
      published_at: new Date("2020-01-01T00:00:00.000Z"),
      created_by_user_id: admin.id,
      published_by_user_id: admin.id
    }
  });
  for (let index = 0; index < stops.length; index += 1) {
    await prisma.routeVersionStop.create({
      data: {
        id: `m7c3a_membership_${index + 1}`,
        service_route_version_id: version.id,
        stop_id: stops[index].id,
        sequence: index + 1
      }
    });
  }
  await prisma.serviceRoute.update({ where: { id: route.id }, data: { current_version_id: version.id } });
  const availabilities = [];
  for (let index = 0; index < drivers.length; index += 1) {
    availabilities.push(await prisma.driverRoute.create({
      data: {
        id: `m7c3a_availability_${index + 1}`,
        driver_id: drivers[index].profile.id,
        origin_label: "canonical",
        origin_lat: 31.5,
        origin_lng: 35,
        destination_label: "canonical",
        destination_lat: 31.7,
        destination_lng: 35.2,
        corridor_key: "canonical",
        seats_available: 4,
        parcel_capacity_available: 10,
        status: "active",
        route_version_id: version.id,
        departure_at: new Date(departure.getTime() + index * 60_000),
        availability_window_end: until,
        total_seats: 4,
        remaining_seats: 4,
        total_parcel_capacity: 10,
        remaining_parcel_capacity: 10,
        availability_status: "active",
        canonical_availability_version: mode,
        operational_mode: mode,
        activated_at: now
      }
    }));
  }
  const passengerRequest = await prisma.passengerRequest.create({
    data: {
      id: "m7c3a_request",
      passenger_id: passenger.id,
      pickup_label: "canonical",
      pickup_lat: 31.51,
      pickup_lng: 35.01,
      destination_label: "canonical",
      destination_lat: 31.53,
      destination_lng: 35.03,
      preferred_time: from,
      passenger_count: 2,
      status: "pending",
      source: mode,
      route_version_id: version.id,
      pickup_stop_id: stops[1].id,
      dropoff_stop_id: stops[3].id,
      canonical_entry_version: mode,
      operational_mode: mode,
      requested_departure_from: from,
      requested_departure_until: until,
      canonical_created_at: now
    }
  });
  await prisma.canonicalDemandDispatch.create({
    data: {
      id: "m7c3a_passenger_dispatch",
      demand_type: "passenger",
      passenger_request_id: passengerRequest.id,
      route_version_id: version.id,
      operational_mode: mode
    }
  });
  const order = await prisma.merchantOrder.create({
    data: {
      id: "m7c3a_order",
      merchant_id: merchant.id,
      pickup_label: "canonical",
      pickup_lat: 31.51,
      pickup_lng: 35.01,
      status: "submitted",
      route_version_id: version.id,
      pickup_stop_id: stops[1].id,
      canonical_entry_version: mode,
      operational_mode: mode,
      requested_departure_from: from,
      requested_departure_until: until,
      canonical_created_at: now
    }
  });
  for (const [index, stop] of [stops[2], stops[3]].entries()) {
    await prisma.parcel.create({
      data: {
        id: `m7c3a_parcel_${index + 1}`,
        order_id: order.id,
        destination_label: "canonical",
        destination_lat: 31.52 + index / 100,
        destination_lng: 35.02 + index / 100,
        size: "S",
        priority: "normal",
        route_version_id: version.id,
        destination_stop_id: stop.id,
        canonical_entry_version: mode,
        operational_mode: mode
      }
    });
  }
  await prisma.canonicalDemandDispatch.create({
    data: {
      id: "m7c3a_merchant_dispatch",
      demand_type: "merchant_order",
      merchant_order_id: order.id,
      route_version_id: version.id,
      operational_mode: mode
    }
  });
  return { admin, passenger, merchant, drivers, stops, route, version, availabilities, passengerRequest, order };
}

try {
  check(config.multiRouteEntryEnabled, "entry gate enabled for harness");
  check(config.multiRouteMatchingEnabled, "matching gate enabled for harness");
  check(config.canonicalTripCreationEnabled, "trip gate enabled for harness");
  const fixture = await seed();
  check(await prisma.serviceRoute.count() === 1, "one canonical route");
  check(await prisma.serviceRouteVersion.count() === 1, "one exact route version");
  check(await prisma.routeVersionStop.count() === 4, "ordered stops persisted");
  check(await prisma.driverRoute.count() === 3, "three candidate availabilities");
  check(await prisma.canonicalDemandDispatch.count() === 2, "two normalized dispatches");
  check(await prisma.parcel.count({ where: { operational_mode: mode } }) === 2, "canonical parcel modes backfilled on write");

  await rejects(
    () => prisma.$executeRawUnsafe(
      "UPDATE parcels SET operational_mode = 'legacy' WHERE id = 'm7c3a_parcel_1'"
    ),
    "direct SQL parcel mode crossing rejected"
  );
  await rejects(
    () => prisma.match.create({
      data: {
        driver_route_id: fixture.availabilities[0].id,
        passenger_request_id: fixture.passengerRequest.id,
        score: "0.5000",
        method: "invalid",
        explanation: "invalid",
        scoring_breakdown: {},
        operational_mode: "legacy",
        route_version_id: fixture.version.id
      }
    }),
    "direct SQL-equivalent match mode mismatch rejected"
  );

  const matching = createCanonicalMatchingService(prisma, config);
  const passengerRun = await matching.run({ demandType: "passenger", now, requestId: "m7c3a-passenger-run" });
  check(passengerRun.offered === 1, "passenger offer created");
  check(passengerRun.failed === 0, "passenger run has no poison failure");
  check(passengerRun.offerIds.length === 1, "runner returns one safe offer ID");
  const passengerOffer = await prisma.match.findUniqueOrThrow({
    where: { id: passengerRun.offerIds[0] },
    include: { offer_reservation: true, dispatch: true }
  });
  check(passengerOffer.operational_mode === mode, "offer canonical mode");
  check(passengerOffer.route_version_id === fixture.version.id, "offer exact route");
  check(passengerOffer.driver_route_id === fixture.availabilities[0].id, "stable best candidate selected");
  check(passengerOffer.status === "sent_to_driver", "offer active status");
  check(passengerOffer.attempt_number === 1, "first attempt recorded");
  check(passengerOffer.offer_reservation?.status === "held", "one held reservation");
  check(passengerOffer.offer_reservation?.seats_reserved === 2, "passenger seats held");
  check(passengerOffer.offer_reservation?.parcel_units_reserved === 0, "passenger parcel hold zero");
  check(await prisma.capacityReservation.count({ where: { match_id: passengerOffer.id } }) === 1, "one reservation belongs to offer");
  check((await prisma.driverRoute.findUniqueOrThrow({ where: { id: fixture.availabilities[0].id } })).remaining_seats === 2, "capacity decremented once");
  check(await prisma.auditEvent.count({ where: { action: "canonical_offer_created", entity_id: passengerOffer.id } }) === 1, "one safe offer audit");
  check((await matching.run({ demandType: "passenger", now })).offered === 0, "second worker cannot claim active demand");
  check(await prisma.match.count({ where: { dispatch_id: passengerOffer.dispatch_id } }) === 1, "one active passenger offer");

  const offers = await matching.listDriverOffers(fixture.drivers[0].user.id);
  check(offers.length === 1, "selected driver sees offer");
  check((await matching.listDriverOffers(fixture.drivers[1].user.id)).length === 0, "other driver cannot see offer");

  const acceptResults = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      matching.accept(fixture.drivers[0].user.id, passengerOffer.id, {
        id: fixture.drivers[0].user.id,
        idempotencyKey: `concurrent-accept-${index}`,
        requestId: `accept-${index}`
      })
    )
  );
  check(acceptResults.length === 10, "ten concurrent accepts reconcile");
  check(new Set(acceptResults.map((result) => result.trip.id)).size === 1, "all accepts return one trip");
  const trip = await prisma.trip.findUniqueOrThrow({ where: { canonical_match_id: passengerOffer.id } });
  check(await prisma.trip.count({ where: { canonical_dispatch_id: passengerOffer.dispatch_id } }) === 1, "one canonical trip per demand");
  check(trip.operational_mode === mode, "trip canonical mode");
  check(trip.canonical_trip_version === "canonical_route_trip_v1", "trip version normalized");
  check(trip.route_snapshot_schema_version === "canonical_route_snapshot_v1", "snapshot schema version stored");
  check(Boolean(trip.route_snapshot_json), "snapshot JSON stored");
  check(/^[a-f0-9]{64}$/.test(trip.route_snapshot_checksum!), "snapshot checksum stored");
  check(await prisma.locationEvent.count({ where: { trip_id: trip.id } }) === 0, "canonical acceptance creates no location");
  check((await prisma.capacityReservation.findUniqueOrThrow({ where: { id: passengerOffer.reservation_id! } })).status === "confirmed", "reservation confirmed");
  check((await prisma.driverRoute.findUniqueOrThrow({ where: { id: fixture.availabilities[0].id } })).remaining_seats === 2, "accept does not decrement twice");
  check((await prisma.canonicalDemandDispatch.findUniqueOrThrow({ where: { id: passengerOffer.dispatch_id! } })).status === "assigned", "dispatch assigned");
  check((await prisma.passengerRequest.findUniqueOrThrow({ where: { id: fixture.passengerRequest.id } })).status === "matched", "passenger demand matched");
  const snapshotService = createCanonicalRouteSnapshotService(prisma);
  const snapshot = await snapshotService.build({
    routeVersionId: fixture.version.id,
    pickupStopId: fixture.stops[1].id,
    destinationStopIds: [fixture.stops[3].id],
    operationalMode: mode
  });
  check(snapshot.checksum === trip.route_snapshot_checksum, "snapshot checksum deterministic");
  check(!JSON.stringify(snapshot.snapshot).includes("phone"), "snapshot excludes phones");
  check(!JSON.stringify(snapshot.snapshot).includes("latitude"), "snapshot excludes coordinates");
  check(!JSON.stringify(snapshot.snapshot).includes("parcel"), "passenger snapshot excludes parcel payload");
  const passengerStatus = await matching.passengerStatus(fixture.passenger.id, fixture.passengerRequest.id, 1);
  check(passengerStatus[0]?.canonical_dispatch?.status === "assigned", "passenger owner sees assigned status");
  check(passengerStatus[0]?.canonical_dispatch?.assigned_trip?.id === trip.id, "passenger owner sees trip");
  check((await matching.passengerStatus("m7c3a_other_owner", fixture.passengerRequest.id, 1)).length === 0, "cross-owner passenger status concealed");

  const merchantRun = await matching.run({ demandType: "merchant_order", now, requestId: "m7c3a-merchant-run" });
  check(merchantRun.offered === 1, "merchant offer created");
  const merchantOffer = await prisma.match.findUniqueOrThrow({
    where: { id: merchantRun.offerIds[0] },
    include: { offer_reservation: true }
  });
  check(merchantOffer.offer_reservation?.seats_reserved === 0, "merchant seat hold zero");
  check(merchantOffer.offer_reservation?.parcel_units_reserved === 2, "merchant exact parcel hold");
  const merchantDriver = (await prisma.driverRoute.findUniqueOrThrow({
    where: { id: merchantOffer.driver_route_id },
    include: { driver: true }
  })).driver.user_id;
  await matching.reject(merchantDriver, merchantOffer.id, "schedule_conflict", {
    id: merchantDriver,
    idempotencyKey: "merchant-reject-1",
    requestId: "merchant-reject"
  });
  check((await prisma.match.findUniqueOrThrow({ where: { id: merchantOffer.id } })).status === "rejected", "offer rejected terminal");
  check((await prisma.capacityReservation.findUniqueOrThrow({ where: { id: merchantOffer.reservation_id! } })).status === "released", "reject releases hold");
  check((await prisma.driverRoute.findUniqueOrThrow({ where: { id: merchantOffer.driver_route_id } })).remaining_parcel_capacity === 10, "reject restores capacity once");
  await matching.reject(merchantDriver, merchantOffer.id, "schedule_conflict", {
    id: merchantDriver,
    idempotencyKey: "merchant-reject-1",
    requestId: "merchant-reject-replay"
  });
  check((await prisma.driverRoute.findUniqueOrThrow({ where: { id: merchantOffer.driver_route_id } })).remaining_parcel_capacity === 10, "reject replay does not inflate capacity");
  const reassigned = await matching.run({ demandType: "merchant_order", now: new Date(now.getTime() + 1_000) });
  check(reassigned.offered === 1, "reassignment creates next offer");
  const nextOffer = await prisma.match.findUniqueOrThrow({ where: { id: reassigned.offerIds[0] } });
  check(nextOffer.driver_route_id !== merchantOffer.driver_route_id, "rejected driver excluded");
  check(nextOffer.attempt_number === 2, "attempt increments");
  const expired = await matching.expire({ now: new Date(nextOffer.expires_at!.getTime() + 1), requestId: "expiry" });
  check(expired.expired === 1, "offer expiry processed");
  check((await prisma.match.findUniqueOrThrow({ where: { id: nextOffer.id } })).status === "expired", "offer expired terminal");
  check((await prisma.capacityReservation.findUniqueOrThrow({ where: { id: nextOffer.reservation_id! } })).status === "expired", "expiry marks reservation expired");
  check((await prisma.driverRoute.findUniqueOrThrow({ where: { id: nextOffer.driver_route_id } })).remaining_parcel_capacity === 10, "expiry restores capacity once");
  check((await matching.expire({ now: new Date(nextOffer.expires_at!.getTime() + 2) })).expired === 0, "second expiry worker no-ops");
  const merchantStatus = await matching.merchantStatus(fixture.merchant.id, fixture.order.id, 1);
  check(merchantStatus[0]?.canonical_dispatch?.status === "pending", "merchant owner sees pending reassignment");
  check(merchantStatus[0]?.parcels.length === 2, "merchant owner sees exact parcel count");
  check((await matching.merchantStatus("m7c3a_other_owner", fixture.order.id, 1)).length === 0, "cross-owner merchant status concealed");
  check(await prisma.match.count({ where: { operational_mode: "legacy" } }) === 0, "canonical runner creates no legacy offer");
  check(await prisma.trip.count({ where: { operational_mode: "legacy" } }) === 0, "canonical acceptance creates no legacy trip");
  check(await prisma.locationEvent.count() === 0, "harness creates no tracking state");
  check(await prisma.parcelBatch.count() === 0, "harness creates no legacy batch");
  check(await prisma.comparisonRun.count() === 0, "harness creates no comparison row");
  check(assertions >= 61, "at least 61 persistent-state assertions");
  process.stdout.write(`M7C3A MySQL integration passed: ${assertions} assertions\n`);
} finally {
  await prisma.$disconnect();
}
