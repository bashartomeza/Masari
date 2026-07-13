import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scoreDriverRoute } from "../modules/matching.js";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  auditEvent: { create: vi.fn() },
  passengerRequest: { findUnique: vi.fn(), findFirst: vi.fn() },
  merchantOrder: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  driverRoute: { findMany: vi.fn(), findFirst: vi.fn() },
  match: { create: vi.fn(), findUnique: vi.fn() },
  parcelBatch: { create: vi.fn() },
  comparisonRun: { create: vi.fn(), findUnique: vi.fn() }
}));

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

const jwtSecret = "development-jwt-secret-change-me";

const { createApp } = await import("../app.js");

type Role = "passenger" | "driver" | "merchant" | "admin";

const users: Record<string, { id: string; role: Role; name: string; phone: string; demo_account: boolean }> = {
  passenger_1: { id: "passenger_1", role: "passenger", name: "Passenger 1", phone: "+1", demo_account: true },
  passenger_2: { id: "passenger_2", role: "passenger", name: "Passenger 2", phone: "+2", demo_account: true },
  merchant_1: { id: "merchant_1", role: "merchant", name: "Merchant 1", phone: "+3", demo_account: true },
  merchant_2: { id: "merchant_2", role: "merchant", name: "Merchant 2", phone: "+4", demo_account: true },
  admin_1: { id: "admin_1", role: "admin", name: "Admin 1", phone: "+5", demo_account: true }
};

function token(id: keyof typeof users) {
  return jwt.sign({ id, role: users[id].role }, jwtSecret, { expiresIn: "1h" });
}

function auth(id: keyof typeof users) {
  return { Authorization: `Bearer ${token(id)}` };
}

const passengerRequest = {
  id: "req_1",
  passenger_id: "passenger_1",
  pickup_lat: "31.550000",
  pickup_lng: "35.100000",
  passenger_count: 1,
  preferred_time: new Date("2026-07-02T10:00:00.000Z")
};

const merchantOrder = {
  id: "order_1",
  merchant_id: "merchant_1",
  status: "submitted",
  parcels: Array.from({ length: 5 }, (_, index) => ({ id: `parcel_${index}`, status: "pending" })),
  parcel_batches: []
};

const compatibleRoute = {
  id: "route_compatible",
  origin_label: "Hebron / PPU / Bab Al-Zawiya",
  destination_label: "Bethlehem",
  origin_lat: "31.532600",
  origin_lng: "35.099800",
  seats_available: 2,
  parcel_capacity_available: 5,
  status: "active",
  corridor_key: "hebron-ppu-bab-al-zawiya-to-bethlehem",
  driver: { id: "driver_profile_1", verified: true, trust_score: 86 }
};

const wrongDirectionRoute = {
  id: "route_wrong_direction",
  origin_label: "Bethlehem",
  destination_label: "Hebron / PPU / Bab Al-Zawiya",
  origin_lat: "31.705400",
  origin_lng: "35.202400",
  seats_available: 2,
  parcel_capacity_available: 5,
  status: "active",
  corridor_key: "hebron-ppu-bab-al-zawiya-to-bethlehem",
  driver: { id: "driver_profile_2", verified: true, trust_score: 95 }
};

describe("matching, batching, comparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockImplementation(({ where }: { where: { id?: string } }) => {
      if (!where.id) return null;
      return users[where.id] ?? null;
    });
    prismaMock.auditEvent.create.mockResolvedValue({ id: "audit_1" });
  });

  it("route-compatible driver scores higher than nearest wrong-direction driver", () => {
    const compatible = scoreDriverRoute({ route: compatibleRoute, passengerRequest, parcelCount: 0 });
    const wrongDirection = scoreDriverRoute({ route: wrongDirectionRoute, passengerRequest, parcelCount: 0 });

    expect(compatible.finalScore).toBeGreaterThan(wrongDirection.finalScore);
  });

  it("inactive and unverified routes are ignored by candidate query", async () => {
    prismaMock.passengerRequest.findUnique.mockResolvedValue(passengerRequest);
    prismaMock.driverRoute.findMany.mockResolvedValue([compatibleRoute]);
    prismaMock.match.create.mockImplementation(({ data }) => ({ id: "match_1", ...data, driver_route: compatibleRoute }));

    await request(createApp())
      .post("/api/v1/matches/run")
      .set(auth("passenger_1"))
      .send({ passengerRequestId: "req_1" })
      .expect(201);

    expect(prismaMock.driverRoute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "active", driver: { verified: true } })
      })
    );
  });

  it("capacity mismatch is rejected", async () => {
    prismaMock.passengerRequest.findUnique.mockResolvedValue({ ...passengerRequest, passenger_count: 9 });
    prismaMock.driverRoute.findMany.mockResolvedValue([compatibleRoute]);

    await request(createApp())
      .post("/api/v1/matches/run")
      .set(auth("passenger_1"))
      .send({ passengerRequestId: "req_1" })
      .expect(404);
  });

  it("non-owner cannot run match for another user's request", async () => {
    prismaMock.passengerRequest.findUnique.mockResolvedValue({ ...passengerRequest, passenger_id: "passenger_2" });

    await request(createApp())
      .post("/api/v1/matches/run")
      .set(auth("passenger_1"))
      .send({ passengerRequestId: "req_1" })
      .expect(403);
  });

  it("matching persists and returns scoring breakdown", async () => {
    prismaMock.passengerRequest.findUnique.mockResolvedValue(passengerRequest);
    prismaMock.merchantOrder.findUnique.mockResolvedValue(null);
    prismaMock.driverRoute.findMany.mockResolvedValue([wrongDirectionRoute, compatibleRoute]);
    prismaMock.match.create.mockImplementation(({ data }) => ({ id: "match_1", ...data, driver_route: compatibleRoute }));

    const response = await request(createApp())
      .post("/api/v1/matches/run")
      .set(auth("passenger_1"))
      .send({ passengerRequestId: "req_1" })
      .expect(201);

    expect(response.body.match.driver_route_id).toBe("route_compatible");
    expect(response.body.scoringBreakdown.finalScore).toEqual(expect.any(Number));
  });

  it("combined matching links the merchant's persisted parcel batch", async () => {
    prismaMock.passengerRequest.findUnique.mockResolvedValue(passengerRequest);
    prismaMock.merchantOrder.findUnique.mockResolvedValue({
      ...merchantOrder,
      status: "batched",
      parcel_batches: [{ id: "batch_1" }]
    });
    prismaMock.driverRoute.findMany.mockResolvedValue([compatibleRoute]);
    prismaMock.match.create.mockImplementation(({ data }) => ({ id: "match_1", ...data, driver_route: compatibleRoute }));

    await request(createApp())
      .post("/api/v1/matches/run")
      .set(auth("admin_1"))
      .send({ passengerRequestId: "req_1", merchantOrderId: "order_1" })
      .expect(201);

    expect(prismaMock.merchantOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          parcel_batches: expect.objectContaining({ orderBy: { created_at: "desc" }, take: 1 })
        })
      })
    );
    expect(prismaMock.match.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parcel_batch_id: "batch_1" }) })
    );
  });

  it("GET match returns saved result for owner", async () => {
    prismaMock.match.findUnique.mockResolvedValue({
      id: "match_1",
      scoring_breakdown: { finalScore: 0.9 },
      passenger_request: passengerRequest,
      merchant_order: null,
      driver_route: compatibleRoute,
      parcel_batch: null
    });

    const response = await request(createApp()).get("/api/v1/matches/match_1").set(auth("passenger_1")).expect(200);
    expect(response.body.scoringBreakdown.finalScore).toBe(0.9);
  });

  it("merchant can batch own order into one batch", async () => {
    prismaMock.merchantOrder.findUnique.mockResolvedValue(merchantOrder);
    prismaMock.driverRoute.findFirst.mockResolvedValue(compatibleRoute);
    prismaMock.parcelBatch.create.mockResolvedValue({ id: "batch_1", status: "created", explanation: "5 parcels are compatible" });
    prismaMock.merchantOrder.update.mockResolvedValue({ ...merchantOrder, status: "batched" });

    const response = await request(createApp())
      .post("/api/v1/merchant/orders/order_1/batch")
      .set(auth("merchant_1"))
      .expect(201);

    expect(response.body.batch.id).toBe("batch_1");
  });

  it("non-merchant cannot batch order unless admin", async () => {
    await request(createApp()).post("/api/v1/merchant/orders/order_1/batch").set(auth("passenger_1")).expect(403);
  });

  it("merchant cannot batch another merchant's order", async () => {
    prismaMock.merchantOrder.findUnique.mockResolvedValue({ ...merchantOrder, merchant_id: "merchant_2" });

    await request(createApp()).post("/api/v1/merchant/orders/order_1/batch").set(auth("merchant_1")).expect(403);
  });

  it("invalid order state is rejected for batching", async () => {
    prismaMock.merchantOrder.findUnique.mockResolvedValue({ ...merchantOrder, status: "completed" });

    await request(createApp()).post("/api/v1/merchant/orders/order_1/batch").set(auth("merchant_1")).expect(409);
  });

  it("an already batched order cannot create a duplicate batch", async () => {
    prismaMock.merchantOrder.findUnique.mockResolvedValue({
      ...merchantOrder,
      status: "batched",
      parcel_batches: [{ id: "batch_existing" }]
    });

    const response = await request(createApp())
      .post("/api/v1/merchant/orders/order_1/batch")
      .set(auth("merchant_1"))
      .expect(409);

    expect(response.body.error).toBe("order_already_batched");
    expect(prismaMock.parcelBatch.create).not.toHaveBeenCalled();
  });

  it("admin can run comparison and Masari wins seeded scenario", async () => {
    prismaMock.merchantOrder.findFirst.mockResolvedValue(merchantOrder);
    prismaMock.passengerRequest.findFirst.mockResolvedValue(passengerRequest);
    prismaMock.comparisonRun.create.mockImplementation(({ data }) => ({ id: "comparison_1", ...data }));

    const response = await request(createApp())
      .post("/api/v1/compare/run")
      .set(auth("admin_1"))
      .send({ scenarioKey: "masari_batch_wins" })
      .expect(201);

    expect(response.body.comparison.winner).toBe("masari");
    expect(response.body.comparison.masari_trips).toBe(1);
    expect(response.body.comparison.nearest_driver_trips).toBeGreaterThan(1);
  });

  it("non-admin cannot run comparison", async () => {
    await request(createApp()).post("/api/v1/compare/run").set(auth("merchant_1")).send({}).expect(403);
  });

  it("GET comparison run returns saved result", async () => {
    prismaMock.comparisonRun.findUnique.mockResolvedValue({ id: "comparison_1", winner: "masari" });

    const response = await request(createApp()).get("/api/v1/compare/runs/comparison_1").set(auth("admin_1")).expect(200);
    expect(response.body.comparison.winner).toBe("masari");
  });
});
