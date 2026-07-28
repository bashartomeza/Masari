import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationError, createConfig } from "../config.js";
import { canonicalSharedSerializers } from "../modules/canonicalSharedMatching.js";

const prismaMock = vi.hoisted(() => ({
  authSession: { findUnique: vi.fn(), update: vi.fn() }
}));
vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));
const { createApp } = await import("../app.js");

const environment = {
  APP_ENV: "local",
  DATABASE_URL: "mysql://test:test@localhost:3306/masari_test",
  JWT_SECRET: "test-only-jwt-secret-with-at-least-thirty-two-characters",
  CORS_ORIGINS: "http://localhost:5173",
  LOG_LEVEL: "silent",
  MULTI_ROUTE_ENTRY_ENABLED: "true",
  MULTI_ROUTE_MATCHING_ENABLED: "true",
  CANONICAL_TRIP_CREATION_ENABLED: "true",
  CANONICAL_SHARED_TRIPS_ENABLED: "true"
};

function auth(id: string, role: "driver" | "passenger") {
  const token = jwt.sign({ role, sid: `session_${id}`, ver: 1 }, environment.JWT_SECRET, {
    subject: id,
    expiresIn: "1h"
  });
  return { Authorization: `Bearer ${token}` };
}

const offer = {
  id: "shared_offer_1",
  canonical_match_version: "canonical_shared_trip_match_v1",
  status: "sent_to_driver",
  route_version_id: "version_1",
  created_at: new Date(),
  offered_at: new Date(),
  expires_at: new Date(Date.now() + 300_000),
  driver_route: { departure_at: new Date(), driver: { user: { phone: "must-not-leak" } } },
  route_version: {
    id: "version_1",
    name_ar: "مسار",
    name_en: "Route",
    service_route: { direction: "outbound" },
    stops: [
      { sequence: 1, stop: { id: "stop_1", name_ar: "أ", name_en: "A" } },
      { sequence: 2, stop: { id: "stop_2", name_ar: "ب", name_en: "B" } }
    ]
  },
  canonical_manifest: {
    passenger_request_count: 1,
    passenger_seat_count: 2,
    merchant_order_count: 1,
    parcel_unit_count: 2,
    manifest_fingerprint: "must-not-leak",
    members: [
      {
        demand_type: "passenger",
        passenger_seats: 2,
        parcel_units: 0,
        pickup_stop_id: "stop_1",
        drop_off_stop_id: "stop_2",
        demand_fingerprint: "must-not-leak",
        dispatch_id: "must-not-leak"
      },
      {
        demand_type: "merchant_order",
        passenger_seats: 0,
        parcel_units: 2,
        pickup_stop_id: "stop_1",
        drop_off_stop_id: null,
        destination_summary_json: { stop_ids: ["stop_2", "stop_2"] },
        merchant_order: { merchant: { phone: "must-not-leak" } }
      }
    ],
    assigned_trip: null
  },
  reservation_id: "must-not-leak",
  scoring_breakdown: { must_not_leak: true }
};

function serviceMock() {
  return {
    run: vi.fn(),
    listDriverOffers: vi.fn().mockResolvedValue([offer]),
    getDriverOffer: vi.fn().mockResolvedValue(offer),
    accept: vi.fn().mockResolvedValue({
      trip: { id: "trip_1", status: "accepted", route_version_id: "version_1" },
      replayed: false
    }),
    reject: vi.fn().mockResolvedValue({ offer: { id: offer.id }, replayed: false }),
    expire: vi.fn()
  };
}

describe("M7C3C1 shared canonical APIs and gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.authSession.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) => {
        const id = where.id.replace("session_", "");
        const role = id.startsWith("driver") ? "driver" : "passenger";
        return {
          id: where.id,
          user_id: id,
          user: { id, role, account_status: "active", security_version: 1 },
          security_version_at_issue: 1,
          expires_at: new Date(Date.now() + 60_000),
          revoked_at: null
        };
      }
    );
    prismaMock.authSession.update.mockResolvedValue({});
  });

  it("fails closed when the shared gate is disabled", async () => {
    const app = createApp(createConfig({
      ...environment,
      CANONICAL_SHARED_TRIPS_ENABLED: "false"
    }), { canonicalSharedMatchingService: serviceMock() as never });
    await request(app)
      .get("/api/v1/driver/canonical-shared-match-offers")
      .set(auth("driver_1", "driver"))
      .expect(404);
  });

  it("rejects dependency-gate and production enablement", () => {
    expect(() => createConfig({
      ...environment,
      MULTI_ROUTE_MATCHING_ENABLED: "false"
    })).toThrow(ConfigurationError);
    expect(() => createConfig({
      ...environment,
      APP_ENV: "production",
      CORS_ORIGINS: "https://admin.masari.example",
      APP_RELEASE: "test",
      REFRESH_TOKEN_PEPPER: "distinct-refresh-pepper-with-thirty-two-characters",
      TRUST_PROXY: "1"
    })).toThrow(ConfigurationError);
    expect(() => createConfig({
      ...environment,
      APP_ENV: "staging",
      CORS_ORIGINS: "https://admin.staging.masari.example",
      APP_RELEASE: "test",
      REFRESH_TOKEN_PEPPER: "distinct-refresh-pepper-with-thirty-two-characters",
      TRUST_PROXY: "1"
    })).toThrow(ConfigurationError);
    expect(() => createConfig({
      ...environment,
      CANONICAL_SHARED_TRIPS_ENABLED: "yes"
    })).toThrow(ConfigurationError);
  });

  it("requires authentication and driver role", async () => {
    const app = createApp(createConfig(environment), {
      canonicalSharedMatchingService: serviceMock() as never
    });
    await request(app).get("/api/v1/driver/canonical-shared-match-offers").expect(401);
    await request(app)
      .get("/api/v1/driver/canonical-shared-match-offers")
      .set(auth("passenger_1", "passenger"))
      .expect(403);
  });

  it("returns only aggregate-safe driver information", async () => {
    const app = createApp(createConfig(environment), {
      canonicalSharedMatchingService: serviceMock() as never
    });
    const response = await request(app)
      .get("/api/v1/driver/canonical-shared-match-offers")
      .set(auth("driver_1", "driver"))
      .expect(200);
    expect(response.body.offers[0]).toMatchObject({
      offer_version: "canonical_shared_trip_match_v1",
      passenger_request_count: 1,
      passenger_seat_count: 2,
      merchant_order_count: 1,
      parcel_unit_count: 2
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /must-not-leak|fingerprint|dispatch|reservation|phone|scoring_breakdown/i
    );
  });

  it("keeps aggregate capability unadvertised to Flutter", async () => {
    const app = createApp(createConfig(environment), {
      canonicalSharedMatchingService: serviceMock() as never
    });
    const response = await request(app)
      .get("/api/v1/capabilities")
      .set(auth("driver_1", "driver"))
      .expect(200);
    expect(response.body).not.toHaveProperty("canonical_shared_trips_available");
  });

  it("binds accept and reject to driver, offer, and idempotency key", async () => {
    const service = serviceMock();
    const app = createApp(createConfig(environment), {
      canonicalSharedMatchingService: service as never
    });
    await request(app)
      .post(`/api/v1/driver/canonical-shared-match-offers/${offer.id}/accept`)
      .set(auth("driver_1", "driver"))
      .set("idempotency-key", "shared-accept-key")
      .send({})
      .expect(200);
    await request(app)
      .post(`/api/v1/driver/canonical-shared-match-offers/${offer.id}/reject`)
      .set(auth("driver_1", "driver"))
      .set("idempotency-key", "shared-reject-key")
      .send({ reason: "schedule_conflict" })
      .expect(200);
    expect(service.accept).toHaveBeenCalledWith(
      "driver_1",
      offer.id,
      expect.objectContaining({ idempotencyKey: "shared-accept-key" })
    );
    expect(service.reject).toHaveBeenCalledWith(
      "driver_1",
      offer.id,
      "schedule_conflict",
      expect.objectContaining({ idempotencyKey: "shared-reject-key" })
    );
  });

  it("rejects a legacy offer passed to the aggregate serializer", () => {
    expect(() => canonicalSharedSerializers.aggregateOfferResponse({
      ...offer,
      canonical_match_version: "canonical_route_match_v1"
    })).toThrow("canonical_shared_offer_version_mismatch");
  });
});
