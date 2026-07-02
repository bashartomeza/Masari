import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: { findUnique: vi.fn() },
  auditEvent: { create: vi.fn() },
  match: { findUnique: vi.fn(), update: vi.fn() },
  trip: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  driverRoute: { update: vi.fn() },
  passengerRequest: { update: vi.fn() },
  merchantOrder: { update: vi.fn() },
  parcelBatch: { update: vi.fn() },
  parcel: { updateMany: vi.fn() },
  locationEvent: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() }
}));

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

const { createApp } = await import("../app.js");

type Role = "passenger" | "driver" | "merchant" | "admin";

const users: Record<string, { id: string; role: Role; name: string; phone: string; demo_account: boolean }> = {
  driver_1: { id: "driver_1", role: "driver", name: "Driver 1", phone: "+1", demo_account: true },
  driver_2: { id: "driver_2", role: "driver", name: "Driver 2", phone: "+2", demo_account: true },
  passenger_1: { id: "passenger_1", role: "passenger", name: "Passenger 1", phone: "+3", demo_account: true },
  passenger_2: { id: "passenger_2", role: "passenger", name: "Passenger 2", phone: "+4", demo_account: true },
  merchant_1: { id: "merchant_1", role: "merchant", name: "Merchant 1", phone: "+5", demo_account: true },
  merchant_2: { id: "merchant_2", role: "merchant", name: "Merchant 2", phone: "+6", demo_account: true },
  admin_1: { id: "admin_1", role: "admin", name: "Admin 1", phone: "+7", demo_account: true }
};

function token(id: keyof typeof users) {
  return jwt.sign({ id, role: users[id].role }, "development-jwt-secret-change-me", { expiresIn: "1h" });
}

function auth(id: keyof typeof users) {
  return { Authorization: `Bearer ${token(id)}` };
}

const baseMatch = {
  id: "match_1",
  status: "proposed",
  driver_route_id: "route_1",
  passenger_request_id: "request_1",
  merchant_order_id: "order_1",
  parcel_batch_id: "batch_1",
  driver_route: { id: "route_1", driver_id: "profile_1", driver: { id: "profile_1", user_id: "driver_1" } },
  passenger_request: { id: "request_1", passenger_id: "passenger_1" },
  merchant_order: { id: "order_1", merchant_id: "merchant_1", parcels: [{ id: "parcel_1" }] },
  parcel_batch: { id: "batch_1" }
};

function baseTrip(status = "accepted") {
  return {
    id: "trip_1",
    driver_id: "profile_1",
    driver_route_id: "route_1",
    passenger_request_id: "request_1",
    merchant_order_id: "order_1",
    parcel_batch_id: "batch_1",
    status,
    driver_route: { id: "route_1", driver_id: "profile_1", driver: { id: "profile_1", user_id: "driver_1" } },
    passenger_request: { id: "request_1", passenger_id: "passenger_1" },
    merchant_order: { id: "order_1", merchant_id: "merchant_1", parcels: [{ id: "parcel_1" }] },
    parcel_batch: { id: "batch_1" }
  };
}

describe("trip acceptance, status, and tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockImplementation(({ where }: { where: { id?: string } }) => {
      if (!where.id) return null;
      return users[where.id] ?? null;
    });
    prismaMock.auditEvent.create.mockResolvedValue({ id: "audit_1" });
    prismaMock.$transaction.mockImplementation((callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
  });

  it("driver can accept own match and creates exactly one trip", async () => {
    prismaMock.match.findUnique.mockResolvedValue(baseMatch);
    prismaMock.trip.findFirst.mockResolvedValue(null);
    prismaMock.trip.create.mockResolvedValue({ id: "trip_1", status: "accepted" });
    prismaMock.match.update.mockResolvedValue({ ...baseMatch, status: "accepted" });

    const response = await request(createApp()).post("/api/v1/matches/match_1/accept").set(auth("driver_1")).expect(201);

    expect(response.body.trip.status).toBe("accepted");
    expect(prismaMock.trip.create).toHaveBeenCalledOnce();
  });

  it("driver cannot accept another driver route match", async () => {
    prismaMock.match.findUnique.mockResolvedValue({ ...baseMatch, driver_route: { ...baseMatch.driver_route, driver: { user_id: "driver_2" } } });

    await request(createApp()).post("/api/v1/matches/match_1/accept").set(auth("driver_1")).expect(403);
  });

  it("admin can accept demo match", async () => {
    prismaMock.match.findUnique.mockResolvedValue(baseMatch);
    prismaMock.trip.findFirst.mockResolvedValue(null);
    prismaMock.trip.create.mockResolvedValue({ id: "trip_1", status: "accepted" });
    prismaMock.match.update.mockResolvedValue({ ...baseMatch, status: "accepted" });

    await request(createApp()).post("/api/v1/matches/match_1/accept").set(auth("admin_1")).expect(201);
  });

  it("rejecting a match does not create a trip", async () => {
    prismaMock.match.findUnique.mockResolvedValue(baseMatch);
    prismaMock.match.update.mockResolvedValue({ ...baseMatch, status: "rejected" });

    const response = await request(createApp()).post("/api/v1/matches/match_1/reject").set(auth("driver_1")).expect(200);

    expect(response.body.match.status).toBe("rejected");
    expect(prismaMock.trip.create).not.toHaveBeenCalled();
  });

  it("already accepted or rejected match cannot be accepted", async () => {
    prismaMock.match.findUnique.mockResolvedValue({ ...baseMatch, status: "accepted" });
    await request(createApp()).post("/api/v1/matches/match_1/accept").set(auth("driver_1")).expect(409);

    prismaMock.match.findUnique.mockResolvedValue({ ...baseMatch, status: "rejected" });
    await request(createApp()).post("/api/v1/matches/match_1/accept").set(auth("driver_1")).expect(409);
  });

  it("driver, passenger, merchant, and admin can see connected trip", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(baseTrip());

    await request(createApp()).get("/api/v1/trips/trip_1").set(auth("driver_1")).expect(200);
    await request(createApp()).get("/api/v1/trips/trip_1").set(auth("passenger_1")).expect(200);
    await request(createApp()).get("/api/v1/trips/trip_1").set(auth("merchant_1")).expect(200);
    await request(createApp()).get("/api/v1/trips/trip_1").set(auth("admin_1")).expect(200);
  });

  it("unrelated user cannot see trip", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(baseTrip());

    await request(createApp()).get("/api/v1/trips/trip_1").set(auth("passenger_2")).expect(403);
  });

  it("valid status sequence works", async () => {
    const statuses = ["accepted", "pickup_started", "picked_up", "in_transit", "delivered"];
    prismaMock.trip.findUnique.mockImplementation(() => baseTrip(statuses.shift() ?? "completed"));
    prismaMock.trip.update.mockImplementation(({ data }) => ({ ...baseTrip(data.status), status: data.status }));

    await request(createApp()).post("/api/v1/trips/trip_1/status").set(auth("driver_1")).send({ status: "pickup_started" }).expect(200);
    await request(createApp()).post("/api/v1/trips/trip_1/status").set(auth("driver_1")).send({ status: "picked_up" }).expect(200);
    await request(createApp()).post("/api/v1/trips/trip_1/status").set(auth("driver_1")).send({ status: "in_transit" }).expect(200);
    await request(createApp()).post("/api/v1/trips/trip_1/status").set(auth("driver_1")).send({ status: "delivered" }).expect(200);
    await request(createApp()).post("/api/v1/trips/trip_1/status").set(auth("driver_1")).send({ status: "completed" }).expect(200);
  });

  it("invalid status jump is rejected", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(baseTrip("accepted"));

    await request(createApp()).post("/api/v1/trips/trip_1/status").set(auth("driver_1")).send({ status: "delivered" }).expect(409);
  });

  it("picked_up updates related request, batch, and parcels", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(baseTrip("pickup_started"));
    prismaMock.trip.update.mockResolvedValue(baseTrip("picked_up"));

    await request(createApp()).post("/api/v1/trips/trip_1/status").set(auth("driver_1")).send({ status: "picked_up" }).expect(200);

    expect(prismaMock.passengerRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "picked_up" } }));
    expect(prismaMock.parcelBatch.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "picked_up" } }));
    expect(prismaMock.parcel.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "picked_up" } }));
  });

  it("simulate step creates deterministic location events", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(baseTrip());
    prismaMock.locationEvent.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ sequence: 0 });
    prismaMock.locationEvent.create.mockImplementation(({ data }) => ({ id: `loc_${data.sequence}`, ...data }));

    const first = await request(createApp()).post("/api/v1/trips/trip_1/simulate/step").set(auth("driver_1")).expect(201);
    const second = await request(createApp()).post("/api/v1/trips/trip_1/simulate/step").set(auth("driver_1")).expect(201);

    expect(first.body.location.sequence).toBe(0);
    expect(second.body.location.sequence).toBe(1);
  });

  it("latest location endpoint returns latest event", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(baseTrip());
    prismaMock.locationEvent.findFirst.mockResolvedValue({ id: "loc_2", sequence: 2, lat: "31.585000", lng: "35.123000" });

    const response = await request(createApp()).get("/api/v1/trips/trip_1/location").set(auth("passenger_1")).expect(200);

    expect(response.body.location.sequence).toBe(2);
  });

  it("unauthorized user cannot read unrelated trip location", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(baseTrip());

    await request(createApp()).get("/api/v1/trips/trip_1/location").set(auth("merchant_2")).expect(403);
  });
});
