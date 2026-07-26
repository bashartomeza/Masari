import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig } from "../config.js";
import { canonicalMatchingSerializers } from "../modules/canonicalMatching.js";
import { canonicalScoring, createCanonicalMatchingService } from "../services/canonicalMatching.js";

const prismaMock = vi.hoisted(() => ({
  authSession: { findUnique: vi.fn(), update: vi.fn() }
}));
vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));
const { createApp } = await import("../app.js");

type Role = "passenger" | "driver" | "merchant";
const environment = {
  APP_ENV: "local",
  DATABASE_URL: "mysql://test:test@localhost:3306/masari_test",
  JWT_SECRET: "test-only-jwt-secret-with-at-least-thirty-two-characters",
  CORS_ORIGINS: "http://localhost:5173",
  LOG_LEVEL: "silent",
  MULTI_ROUTE_ENTRY_ENABLED: "true",
  MULTI_ROUTE_MATCHING_ENABLED: "true",
  CANONICAL_TRIP_CREATION_ENABLED: "true"
};
const enabled = createConfig(environment);
const disabled = createConfig({
  ...environment,
  MULTI_ROUTE_MATCHING_ENABLED: "false",
  CANONICAL_TRIP_CREATION_ENABLED: "false"
});

function auth(id: string, role: Role) {
  const token = jwt.sign({ role, sid: `session_${id}`, ver: 1 }, environment.JWT_SECRET, {
    subject: id,
    expiresIn: "1h"
  });
  return { Authorization: `Bearer ${token}` };
}

const offer = {
  id: "offer_1",
  status: "sent_to_driver",
  route_version_id: "version_1",
  attempt_number: 1,
  offered_at: new Date(),
  expires_at: new Date(Date.now() + 300_000),
  driver_route: { departure_at: new Date(), route_version_id: "version_1" },
  passenger_request: {
    passenger_count: 2,
    pickup_stop_id: "stop_1",
    dropoff_stop_id: "stop_3",
    requested_departure_from: new Date(),
    requested_departure_until: new Date(),
    phone: "must-not-leak"
  },
  merchant_order: null,
  scoring_breakdown: { must_not_leak: true },
  reservation_id: "must-not-leak"
};

function serviceMock() {
  return {
    assertDriverEligible: vi.fn().mockResolvedValue(undefined),
    listDriverOffers: vi.fn().mockResolvedValue([offer]),
    getDriverOffer: vi.fn().mockResolvedValue(offer),
    accept: vi.fn().mockResolvedValue({
      trip: { id: "trip_1", status: "accepted", route_version_id: "version_1" },
      replayed: false
    }),
    reject: vi.fn().mockResolvedValue({
      offer: { id: "offer_1", status: "rejected", reject_reason: "schedule_conflict" },
      replayed: false
    }),
    passengerStatus: vi.fn().mockResolvedValue([{
      id: "request_1",
      status: "matched",
      route_version_id: "version_1",
      pickup_stop_id: "stop_1",
      dropoff_stop_id: "stop_3",
      requested_departure_from: new Date(),
      requested_departure_until: new Date(),
      canonical_created_at: new Date(),
      passenger: { phone: "must-not-leak" },
      canonical_dispatch: {
        status: "assigned",
        updated_at: new Date(),
        assigned_trip: {
          id: "trip_1",
          status: "accepted",
          driver_route: { driver: { vehicle_type: "sedan", user: { phone: "must-not-leak" } } }
        }
      }
    }]),
    merchantStatus: vi.fn().mockResolvedValue([{
      id: "order_1",
      status: "assigned",
      route_version_id: "version_1",
      pickup_stop_id: "stop_1",
      requested_departure_from: new Date(),
      requested_departure_until: new Date(),
      canonical_created_at: new Date(),
      parcels: [{ id: "parcel_1", status: "assigned", destination_stop_id: "stop_3", destination_label: "must-not-leak" }],
      canonical_dispatch: { status: "offered", updated_at: new Date(), assigned_trip: null }
    }])
  };
}

describe("M7C3A canonical matching APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.authSession.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      const id = where.id.replace("session_", "");
      const role = id.startsWith("driver") ? "driver" : id.startsWith("merchant") ? "merchant" : "passenger";
      return {
        id: where.id,
        user_id: id,
        user: { id, role, account_status: "active", security_version: 1 },
        security_version_at_issue: 1,
        expires_at: new Date(Date.now() + 60_000),
        revoked_at: null
      };
    });
    prismaMock.authSession.update.mockResolvedValue({});
  });

  it("hides the entire assignment surface unless all canonical gates are enabled", async () => {
    const app = createApp(disabled, { canonicalMatchingService: serviceMock() as never });
    await request(app).get("/api/v1/driver/canonical-match-offers").set(auth("driver_1", "driver")).expect(404);
    await request(app).get("/api/v1/passenger/route-requests").set(auth("passenger_1", "passenger")).expect(404);
    await request(app).get("/api/v1/merchant/route-orders").set(auth("merchant_1", "merchant")).expect(404);
  });

  it("requires authentication, the driver role, and verified-driver eligibility", async () => {
    const service = serviceMock();
    const app = createApp(enabled, { canonicalMatchingService: service as never });
    await request(app).get("/api/v1/driver/canonical-match-offers").expect(401);
    await request(app).get("/api/v1/driver/canonical-match-offers").set(auth("passenger_1", "passenger")).expect(403);
    await request(app).get("/api/v1/driver/canonical-match-offers").set(auth("driver_1", "driver")).expect(200);
    expect(service.assertDriverEligible).toHaveBeenCalledWith("driver_1");
    expect(service.listDriverOffers).toHaveBeenCalledWith("driver_1", { limit: 25 });
  });

  it("returns bounded driver summaries without score, reservation, phone, or profile data", async () => {
    const app = createApp(enabled, { canonicalMatchingService: serviceMock() as never });
    const response = await request(app)
      .get("/api/v1/driver/canonical-match-offers/offer_1")
      .set(auth("driver_1", "driver"))
      .expect(200);
    const encoded = JSON.stringify(response.body);
    expect(response.body.offer).toEqual(expect.objectContaining({ id: "offer_1", demand_type: "passenger" }));
    for (const forbidden of ["must-not-leak", "reservation_id", "scoring_breakdown", "phone"]) {
      expect(encoded).not.toContain(forbidden);
    }
  });

  it("requires idempotency and forwards exact accept/reject scopes", async () => {
    const service = serviceMock();
    const app = createApp(enabled, { canonicalMatchingService: service as never });
    await request(app)
      .post("/api/v1/driver/canonical-match-offers/offer_1/accept")
      .set(auth("driver_1", "driver"))
      .expect(400);
    await request(app)
      .post("/api/v1/driver/canonical-match-offers/offer_1/accept")
      .set(auth("driver_1", "driver"))
      .set("idempotency-key", "accept-key-1")
      .expect(200);
    await request(app)
      .post("/api/v1/driver/canonical-match-offers/offer_1/reject")
      .set(auth("driver_1", "driver"))
      .set("idempotency-key", "reject-key-1")
      .send({ reason: "schedule_conflict" })
      .expect(200);
    expect(service.accept).toHaveBeenCalledWith("driver_1", "offer_1", expect.objectContaining({ idempotencyKey: "accept-key-1" }));
    expect(service.reject).toHaveBeenCalledWith("driver_1", "offer_1", "schedule_conflict", expect.objectContaining({ idempotencyKey: "reject-key-1" }));
  });

  it("rejects free-form rejection reasons", async () => {
    const app = createApp(enabled, { canonicalMatchingService: serviceMock() as never });
    await request(app)
      .post("/api/v1/driver/canonical-match-offers/offer_1/reject")
      .set(auth("driver_1", "driver"))
      .set("idempotency-key", "reject-key-1")
      .send({ reason: "because this contains arbitrary private text" })
      .expect(400);
  });

  it("returns owner assignment status without candidate, phone, or parcel-description disclosure", async () => {
    const service = serviceMock();
    const app = createApp(enabled, { canonicalMatchingService: service as never });
    const passenger = await request(app).get("/api/v1/passenger/route-requests/request_1").set(auth("passenger_1", "passenger")).expect(200);
    const merchant = await request(app).get("/api/v1/merchant/route-orders/order_1").set(auth("merchant_1", "merchant")).expect(200);
    expect(passenger.body.request).toEqual(expect.objectContaining({ assigned: true, trip: { id: "trip_1", status: "accepted", vehicle_type: "sedan" } }));
    expect(merchant.body.order).toEqual(expect.objectContaining({ offer_pending: true, assigned: false }));
    const encoded = JSON.stringify({ passenger: passenger.body, merchant: merchant.body });
    for (const forbidden of ["must-not-leak", "phone", "destination_label", "attempt_count", "score"]) {
      expect(encoded).not.toContain(forbidden);
    }
  });

  it("keeps owner status routes role-scoped", async () => {
    const app = createApp(enabled, { canonicalMatchingService: serviceMock() as never });
    await request(app).get("/api/v1/passenger/route-requests").set(auth("merchant_1", "merchant")).expect(403);
    await request(app).get("/api/v1/merchant/route-orders").set(auth("passenger_1", "passenger")).expect(403);
  });

  it("scores deterministically and applies documented component weights", () => {
    const input = {
      departureAt: new Date("2026-07-26T10:30:00.000Z"),
      departureFrom: new Date("2026-07-26T10:00:00.000Z"),
      departureUntil: new Date("2026-07-26T12:00:00.000Z"),
      requestedCapacity: 2,
      availableCapacity: 4,
      trustScore: 80,
      recentAssignments: 1
    };
    expect(canonicalScoring.scoreCandidate(input)).toEqual(canonicalScoring.scoreCandidate(input));
    expect(canonicalScoring.scoreCandidate(input)).toEqual({
      score: 0.6725,
      departureDeltaSeconds: 1800,
      trust: 0.8,
      fairness: 0.5
    });
  });

  it("serializers remain explicit allowlists", () => {
    const summary = canonicalMatchingSerializers.offerResponse(offer);
    expect(summary).not.toHaveProperty("reservation_id");
    expect(summary).not.toHaveProperty("scoring_breakdown");
  });

  it("keeps the internal runner unavailable in production-like configuration", async () => {
    const production = createConfig({
      APP_ENV: "production",
      DATABASE_URL: "mysql://database-user:database-password@db.internal:3306/masari",
      JWT_SECRET: "production-jwt-secret-with-more-than-thirty-two-characters",
      REFRESH_TOKEN_PEPPER: "production-refresh-secret-with-more-than-thirty-two-characters",
      CORS_ORIGINS: "https://admin.masari.example",
      APP_RELEASE: "m7c3a-test",
      TRUST_PROXY: "none"
    });
    const service = createCanonicalMatchingService({} as never, production);
    await expect(service.run()).rejects.toMatchObject({ status: 404 });
    await expect(service.expire()).rejects.toMatchObject({ status: 404 });
  });
});
