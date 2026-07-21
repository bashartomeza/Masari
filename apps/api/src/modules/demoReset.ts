import { Router } from "express";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient, UserRole } from "../generated/prisma/client.js";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { authenticateAuthToken } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { DEMO_ROUTE_POINTS } from "../lib/geo.js";

export const LOCKED_CORRIDOR_KEY = "hebron-ppu-bab-al-zawiya-to-bethlehem";
export const LOCKED_CORRIDOR_LABEL = "Hebron / PPU / Bab Al-Zawiya -> Bethlehem";
export const DEMO_SERVICE_ROUTE_KEY = LOCKED_CORRIDOR_KEY;
export const DEMO_STOP_KEYS = {
  origin: "demo-bab-al-zawiya",
  passengerPickup: "demo-ppu-main-gate",
  destination: "demo-bethlehem-center"
} as const;

export const DEMO_ACCOUNTS = {
  passenger: { name: "Demo Passenger", phone: "+970590000001" },
  driver1: { name: "Demo Driver Hebron Route", phone: "+970590000002" },
  driver2: { name: "Demo Driver Alternate", phone: "+970590000003" },
  merchant: { name: "Demo Merchant", phone: "+970590000004" },
  admin: { name: "Demo Admin", phone: "+970590000005" }
} as const;

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function createDemoUser(
  tx: Prisma.TransactionClient,
  input: { name: string; phone: string; password: string; role: UserRole }
) {
  return tx.user.create({
    data: {
      name: input.name,
      phone: input.phone,
      password_hash: await hashPassword(input.password),
      role: input.role,
      account_status: "active",
      security_version: 1,
      demo_account: true
    }
  });
}

export async function resetDemoData(db: PrismaClient = prisma) {
  const demoConfig = config.demo;
  if (!config.demoFeaturesEnabled || !demoConfig) {
    throw new HttpError(404, "not_found");
  }
  return db.$transaction(async (tx) => {
    const onboardedUsers = await tx.onboardingAttempt.findMany({
      where: { completed_user_id: { not: null } },
      select: { completed_user_id: true }
    });
    const onboardedUserIds = onboardedUsers.flatMap((attempt) =>
      attempt.completed_user_id ? [attempt.completed_user_id] : []
    );
    await tx.auditEvent.deleteMany();
    await tx.userConsent.deleteMany();
    await tx.onboardingSession.deleteMany();
    await tx.invitationRedemption.deleteMany();
    await tx.onboardingAttempt.updateMany({ data: { current_challenge_id: null } });
    await tx.otpChallenge.deleteMany();
    await tx.onboardingAttempt.deleteMany();
    await tx.invitation.deleteMany();
    await tx.consentDocument.deleteMany();
    await tx.abuseCounter.deleteMany();
    await tx.idempotencyRecord.deleteMany();
    await tx.refreshToken.deleteMany();
    await tx.authSession.deleteMany();
    await tx.locationEvent.deleteMany();
    await tx.trip.deleteMany();
    await tx.match.deleteMany();
    await tx.comparisonRun.deleteMany();
    await tx.parcelBatch.deleteMany();
    await tx.parcel.deleteMany();
    await tx.merchantOrder.deleteMany();
    await tx.passengerRequest.deleteMany();
    await tx.driverRoute.deleteMany();
    await tx.driverProfile.deleteMany();
    await tx.demoScenario.deleteMany();
    await tx.serviceRoute.updateMany({ data: { current_version_id: null } });
    await tx.routeVersionStop.deleteMany();
    await tx.serviceRouteVersion.deleteMany();
    await tx.serviceRoute.deleteMany();
    await tx.stop.deleteMany();
    await tx.user.deleteMany({
      where: {
        OR: [
          { demo_account: true },
          ...(onboardedUserIds.length > 0 ? [{ id: { in: onboardedUserIds } }] : [])
        ]
      }
    });

    const passenger = await createDemoUser(tx, {
      ...DEMO_ACCOUNTS.passenger,
      password: demoConfig.passengerPassword,
      role: "passenger"
    });
    const driver1User = await createDemoUser(tx, {
      ...DEMO_ACCOUNTS.driver1,
      password: demoConfig.driverPassword,
      role: "driver"
    });
    const driver2User = await createDemoUser(tx, {
      ...DEMO_ACCOUNTS.driver2,
      password: demoConfig.driverPassword,
      role: "driver"
    });
    const merchant = await createDemoUser(tx, {
      ...DEMO_ACCOUNTS.merchant,
      password: demoConfig.merchantPassword,
      role: "merchant"
    });
    const admin = await createDemoUser(tx, {
      ...DEMO_ACCOUNTS.admin,
      password: demoConfig.adminPassword,
      role: "admin"
    });

    const driver1 = await tx.driverProfile.create({
      data: {
        user_id: driver1User.id,
        vehicle_type: "sedan",
        seats_total: 3,
        parcel_capacity: 5,
        verified: true,
        trust_score: 86
      }
    });

    const driver2 = await tx.driverProfile.create({
      data: {
        user_id: driver2User.id,
        vehicle_type: "van",
        seats_total: 2,
        parcel_capacity: 8,
        verified: true,
        trust_score: 74
      }
    });

    const [originStop, passengerPickupStop, destinationStop] = await Promise.all([
      tx.stop.create({
        data: {
          stop_key: DEMO_STOP_KEYS.origin,
          service_region_key: "south-west-bank",
          name_ar: "باب الزاوية",
          name_en: "Bab Al-Zawiya",
          latitude: "31.532600",
          longitude: "35.099800",
          created_by_user_id: admin.id
        }
      }),
      tx.stop.create({
        data: {
          stop_key: DEMO_STOP_KEYS.passengerPickup,
          service_region_key: "south-west-bank",
          name_ar: "بوابة جامعة بوليتكنك فلسطين",
          name_en: "PPU Main Gate",
          latitude: "31.550000",
          longitude: "35.100000",
          created_by_user_id: admin.id
        }
      }),
      tx.stop.create({
        data: {
          stop_key: DEMO_STOP_KEYS.destination,
          service_region_key: "south-west-bank",
          name_ar: "وسط بيت لحم",
          name_en: "Bethlehem Center",
          latitude: "31.705400",
          longitude: "35.202400",
          created_by_user_id: admin.id
        }
      })
    ]);

    const serviceRoute = await tx.serviceRoute.create({
      data: {
        route_key: DEMO_SERVICE_ROUTE_KEY,
        route_group_key: "hebron-bethlehem",
        service_region_key: "south-west-bank",
        direction: "outbound",
        created_by_user_id: admin.id
      }
    });
    const encodedGeometry = JSON.stringify(DEMO_ROUTE_POINTS);
    const routeVersion = await tx.serviceRouteVersion.create({
      data: {
        service_route_id: serviceRoute.id,
        version_number: 1,
        status: "published",
        name_ar: "الخليل / جامعة بوليتكنك فلسطين / باب الزاوية ← بيت لحم",
        name_en: LOCKED_CORRIDOR_LABEL,
        description_ar: "مسار العرض التجريبي الثابت لمساري.",
        description_en: "Masari's deterministic demo corridor.",
        origin_stop_id: originStop.id,
        destination_stop_id: destinationStop.id,
        encoded_geometry: encodedGeometry,
        geometry_encoding: "demo-json-v1",
        geometry_provider: "masari-demo",
        geometry_checksum: createHash("sha256").update(encodedGeometry).digest("hex"),
        geometry_precision: 6,
        estimated_distance_meters: 21_530,
        geometry_status: "available",
        created_by_user_id: admin.id,
        published_by_user_id: admin.id,
        published_at: new Date("2026-07-02T00:00:00.000Z")
      }
    });
    await tx.routeVersionStop.createMany({
      data: [
        {
          service_route_version_id: routeVersion.id,
          stop_id: originStop.id,
          sequence: 1,
          passenger_pickup: true,
          passenger_dropoff: false,
          parcel_pickup: true,
          parcel_dropoff: false,
          distance_from_origin_meters: 0
        },
        {
          service_route_version_id: routeVersion.id,
          stop_id: passengerPickupStop.id,
          sequence: 2,
          passenger_pickup: true,
          passenger_dropoff: false,
          parcel_pickup: false,
          parcel_dropoff: false
        },
        {
          service_route_version_id: routeVersion.id,
          stop_id: destinationStop.id,
          sequence: 3,
          passenger_pickup: false,
          passenger_dropoff: true,
          parcel_pickup: false,
          parcel_dropoff: true
        }
      ]
    });
    await tx.serviceRoute.update({
      where: { id: serviceRoute.id },
      data: { current_version_id: routeVersion.id }
    });

    await tx.driverRoute.create({
      data: {
        driver_id: driver1.id,
        origin_label: "Hebron / PPU / Bab Al-Zawiya",
        origin_lat: "31.532600",
        origin_lng: "35.099800",
        destination_label: "Bethlehem",
        destination_lat: "31.705400",
        destination_lng: "35.202400",
        corridor_key: LOCKED_CORRIDOR_KEY,
        seats_available: 2,
        parcel_capacity_available: 5,
        route_version_id: routeVersion.id,
        departure_at: new Date("2026-07-02T09:00:00.000Z"),
        availability_window_end: new Date("2026-07-02T09:30:00.000Z"),
        total_seats: 3,
        remaining_seats: 2,
        total_parcel_capacity: 5,
        remaining_parcel_capacity: 5,
        availability_status: "active",
        status: "active",
        activated_at: new Date()
      }
    });

    await tx.driverRoute.create({
      data: {
        driver_id: driver2.id,
        origin_label: "Bethlehem",
        origin_lat: "31.705400",
        origin_lng: "35.202400",
        destination_label: "Hebron / PPU / Bab Al-Zawiya",
        destination_lat: "31.532600",
        destination_lng: "35.099800",
        corridor_key: LOCKED_CORRIDOR_KEY,
        seats_available: 1,
        parcel_capacity_available: 8,
        status: "inactive"
      }
    });

    await tx.passengerRequest.create({
      data: {
        passenger_id: passenger.id,
        pickup_label: "PPU Main Gate",
        pickup_lat: "31.550000",
        pickup_lng: "35.100000",
        destination_label: "Bethlehem Center",
        destination_lat: "31.705400",
        destination_lng: "35.202400",
        preferred_time: new Date("2026-07-02T09:00:00.000Z"),
        passenger_count: 1,
        status: "pending",
        source: "seed"
      }
    });

    const order = await tx.merchantOrder.create({
      data: {
        merchant_id: merchant.id,
        pickup_label: "Hebron Merchant Pickup",
        pickup_lat: "31.532600",
        pickup_lng: "35.099800",
        status: "submitted"
      }
    });

    const parcelDestinations = [
      "Bethlehem Market",
      "Bethlehem University Area",
      "Manger Street",
      "Beit Jala Junction",
      "Bethlehem Center"
    ];

    for (const [index, destination] of parcelDestinations.entries()) {
      await tx.parcel.create({
        data: {
          order_id: order.id,
          destination_label: destination,
          destination_lat: "31.705400",
          destination_lng: "35.202400",
          size: index === 0 ? "M" : "S",
          priority: index < 2 ? "high" : "normal",
          status: "pending"
        }
      });
    }

    await tx.demoScenario.createMany({
      data: [
        {
          scenario_key: "masari_batch_wins",
          corridor_key: LOCKED_CORRIDOR_KEY,
          description: "Masari batches five parcels into one compatible corridor trip.",
          seed_version: "m1"
        },
        {
          scenario_key: "nearest_wrong_direction",
          corridor_key: LOCKED_CORRIDOR_KEY,
          description: "Nearest driver is not the best route fit because direction is wrong.",
          seed_version: "m1"
        },
        {
          scenario_key: "driver_utilization_wins",
          corridor_key: LOCKED_CORRIDOR_KEY,
          description: "Masari improves utilization by combining passenger and parcel demand.",
          seed_version: "m1"
        }
      ]
    });

    await tx.auditEvent.create({
      data: {
        user_id: admin.id,
        action: AuditAction.demo_reset,
        entity_type: "DemoScenario",
        metadata: {
          corridor_key: LOCKED_CORRIDOR_KEY,
          corridor_label: LOCKED_CORRIDOR_LABEL,
          seed_version: "m1"
        }
      }
    });

    return {
      corridor: LOCKED_CORRIDOR_LABEL,
      users: {
        passenger: passenger.phone,
        drivers: [driver1User.phone, driver2User.phone],
        merchant: merchant.phone,
        admin: admin.phone
      },
      parcels: parcelDestinations.length,
      scenarios: 3
    };
  });
}

async function canReset(req: { header(name: string): string | undefined }) {
  const resetKey = req.header("x-demo-reset-key");
  if (config.demo && resetKey === config.demo.resetKey) {
    return true;
  }

  const authHeader = req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  if (!token) {
    return false;
  }

  try {
    const user = await authenticateAuthToken(token);
    return user.role === "admin";
  } catch {
    return false;
  }
}

export const demoRouter = Router();

demoRouter.post("/demo/reset", async (req, res, next) => {
  try {
    if (!(await canReset(req))) {
      throw new HttpError(403, "demo_reset_forbidden");
    }

    const result = await resetDemoData(prisma);
    await auditEvent(prisma, {
      action: AuditAction.demo_reset,
      entityType: "DemoScenario",
      metadata: { source: "api", corridor: LOCKED_CORRIDOR_LABEL }
    });

    res.json({ ok: true, seed: result });
  } catch (error) {
    next(error);
  }
});
