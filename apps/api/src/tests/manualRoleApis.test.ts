import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), count: vi.fn() },
  auditEvent: { create: vi.fn() },
  passengerRequest: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
  driverProfile: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  driverRoute: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
  merchantOrder: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
  parcel: { count: vi.fn() }
}));

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

process.env.JWT_SECRET = "test-jwt-secret-with-length";

const { createApp } = await import("../app.js");

type Role = "passenger" | "driver" | "merchant" | "admin";

const users: Record<string, { id: string; role: Role; name: string; phone: string; demo_account: boolean }> = {
  passenger_1: { id: "passenger_1", role: "passenger", name: "Passenger 1", phone: "+1", demo_account: true },
  passenger_2: { id: "passenger_2", role: "passenger", name: "Passenger 2", phone: "+2", demo_account: true },
  driver_1: { id: "driver_1", role: "driver", name: "Driver 1", phone: "+3", demo_account: true },
  driver_2: { id: "driver_2", role: "driver", name: "Driver 2", phone: "+4", demo_account: true },
  merchant_1: { id: "merchant_1", role: "merchant", name: "Merchant 1", phone: "+5", demo_account: true },
  merchant_2: { id: "merchant_2", role: "merchant", name: "Merchant 2", phone: "+6", demo_account: true },
  admin_1: { id: "admin_1", role: "admin", name: "Admin 1", phone: "+7", demo_account: true }
};

function token(id: keyof typeof users) {
  return jwt.sign({ id, role: users[id].role }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

function auth(id: keyof typeof users) {
  return { Authorization: `Bearer ${token(id)}` };
}

const passengerBody = {
  pickup_label: "PPU Main Gate",
  pickup_lat: 31.55,
  pickup_lng: 35.1,
  destination_label: "Bethlehem Center",
  destination_lat: 31.7054,
  destination_lng: 35.2024,
  preferred_time: "2026-07-02T09:00:00.000Z",
  passenger_count: 1
};

const merchantBody = {
  pickup_label: "Hebron Merchant Pickup",
  pickup_lat: 31.5326,
  pickup_lng: 35.0998,
  parcels: [
    { destination_label: "Bethlehem Market", destination_lat: 31.7054, destination_lng: 35.2024, size: "S", priority: "normal" }
  ]
};

describe("manual role APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockImplementation(({ where }: { where: { id?: string } }) => {
      if (!where.id) return null;
      return users[where.id] ?? null;
    });
    prismaMock.auditEvent.create.mockResolvedValue({ id: "audit_1" });
  });

  it("passenger can create request", async () => {
    prismaMock.passengerRequest.create.mockResolvedValue({ id: "req_1", status: "pending", passenger_id: "passenger_1" });

    const response = await request(createApp())
      .post("/api/v1/passenger/requests")
      .set(auth("passenger_1"))
      .send(passengerBody)
      .expect(201);

    expect(response.body.request.status).toBe("pending");
    expect(prismaMock.passengerRequest.create).toHaveBeenCalledOnce();
  });

  it("non-passenger cannot create request", async () => {
    await request(createApp()).post("/api/v1/passenger/requests").set(auth("driver_1")).send(passengerBody).expect(403);
  });

  it("passenger cannot read another passenger request", async () => {
    prismaMock.passengerRequest.findFirst.mockResolvedValue(null);

    await request(createApp()).get("/api/v1/passenger/requests/req_other").set(auth("passenger_1")).expect(404);
  });

  it("passenger can cancel own pending request", async () => {
    prismaMock.passengerRequest.findFirst.mockResolvedValue({ id: "req_1", status: "pending", passenger_id: "passenger_1" });
    prismaMock.passengerRequest.update.mockResolvedValue({ id: "req_1", status: "cancelled", passenger_id: "passenger_1" });

    const response = await request(createApp())
      .patch("/api/v1/passenger/requests/req_1/cancel")
      .set(auth("passenger_1"))
      .expect(200);

    expect(response.body.request.status).toBe("cancelled");
  });

  it("invalid cancel state is rejected", async () => {
    prismaMock.passengerRequest.findFirst.mockResolvedValue({ id: "req_1", status: "accepted", passenger_id: "passenger_1" });

    await request(createApp()).patch("/api/v1/passenger/requests/req_1/cancel").set(auth("passenger_1")).expect(409);
  });

  it("driver can create locked corridor route", async () => {
    prismaMock.driverProfile.findUnique.mockResolvedValue({ id: "profile_1", user_id: "driver_1" });
    prismaMock.driverRoute.create.mockResolvedValue({ id: "route_1", corridor_key: "hebron-ppu-bab-al-zawiya-to-bethlehem", status: "active" });

    const response = await request(createApp())
      .post("/api/v1/driver/routes")
      .set(auth("driver_1"))
      .send({ seats_available: 2, parcel_capacity_available: 5 })
      .expect(201);

    expect(response.body.route.status).toBe("active");
  });

  it("non-driver cannot create route", async () => {
    await request(createApp()).post("/api/v1/driver/routes").set(auth("passenger_1")).send({}).expect(403);
  });

  it("route outside corridor is rejected", async () => {
    await request(createApp())
      .post("/api/v1/driver/routes")
      .set(auth("driver_1"))
      .send({ origin_label: "Ramallah", destination_label: "Nablus" })
      .expect(400);
  });

  it("driver can deactivate own active route", async () => {
    prismaMock.driverRoute.findFirst.mockResolvedValue({ id: "route_1", status: "active" });
    prismaMock.driverRoute.update.mockResolvedValue({ id: "route_1", status: "inactive" });

    const response = await request(createApp()).patch("/api/v1/driver/routes/route_1/deactivate").set(auth("driver_1")).expect(200);
    expect(response.body.route.status).toBe("inactive");
  });

  it("driver cannot deactivate another driver route", async () => {
    prismaMock.driverRoute.findFirst.mockResolvedValue(null);

    await request(createApp()).patch("/api/v1/driver/routes/route_other/deactivate").set(auth("driver_1")).expect(404);
  });

  it("merchant can create order with parcels", async () => {
    prismaMock.merchantOrder.create.mockResolvedValue({ id: "order_1", status: "submitted", parcels: [{ id: "parcel_1", status: "pending" }] });

    const response = await request(createApp()).post("/api/v1/merchant/orders").set(auth("merchant_1")).send(merchantBody).expect(201);
    expect(response.body.order.parcels).toHaveLength(1);
  });

  it("non-merchant cannot create order", async () => {
    await request(createApp()).post("/api/v1/merchant/orders").set(auth("driver_1")).send(merchantBody).expect(403);
  });

  it("merchant cannot view another merchant order", async () => {
    prismaMock.merchantOrder.findFirst.mockResolvedValue(null);

    await request(createApp()).get("/api/v1/merchant/orders/order_other").set(auth("merchant_1")).expect(404);
  });

  it("merchant order reads include safe persisted batch summaries", async () => {
    const order = {
      id: "order_1",
      merchant_id: "merchant_1",
      status: "batched",
      parcels: [{ id: "parcel_1", status: "pending" }],
      parcel_batches: [
        {
          id: "batch_1",
          status: "created",
          estimated_distance_saved: "43.06",
          explanation: "Three parcels share one corridor trip.",
          created_at: new Date("2026-07-13T08:00:00.000Z"),
          driver_route: {
            id: "route_1",
            origin_label: "Hebron / PPU / Bab Al-Zawiya",
            destination_label: "Bethlehem",
            corridor_key: "hebron-ppu-bab-al-zawiya-to-bethlehem",
            status: "active",
            parcel_capacity_available: 5
          }
        }
      ]
    };
    prismaMock.merchantOrder.findMany.mockResolvedValue([order]);
    prismaMock.merchantOrder.findFirst.mockResolvedValue(order);

    const list = await request(createApp()).get("/api/v1/merchant/orders").set(auth("merchant_1")).expect(200);
    const detail = await request(createApp()).get("/api/v1/merchant/orders/order_1").set(auth("merchant_1")).expect(200);

    expect(list.body.orders[0].parcel_batches[0]).toEqual(
      expect.objectContaining({ id: "batch_1", status: "created", estimated_distance_saved: "43.06" })
    );
    expect(detail.body.order.parcel_batches[0].driver_route).toEqual(
      expect.objectContaining({ id: "route_1", destination_label: "Bethlehem" })
    );
    expect(JSON.stringify(detail.body)).not.toContain("driver_id");
  });

  it("invalid parcel count is rejected", async () => {
    await request(createApp())
      .post("/api/v1/merchant/orders")
      .set(auth("merchant_1"))
      .send({ ...merchantBody, parcels: [] })
      .expect(400);
  });

  it("admin can read dashboard", async () => {
    prismaMock.user.count.mockResolvedValue(5);
    prismaMock.driverProfile.count.mockResolvedValue(2);
    prismaMock.driverRoute.count.mockResolvedValue(2);
    prismaMock.passengerRequest.count.mockResolvedValue(1);
    prismaMock.merchantOrder.count.mockResolvedValue(1);
    prismaMock.parcel.count.mockResolvedValue(5);
    prismaMock.passengerRequest.findMany.mockResolvedValue([{ id: "req_1" }]);
    prismaMock.merchantOrder.findMany.mockResolvedValue([{ id: "order_1", parcels: [] }]);
    prismaMock.driverRoute.findMany.mockResolvedValue([{ id: "route_1" }]);

    const response = await request(createApp()).get("/api/v1/admin/dashboard").set(auth("admin_1")).expect(200);
    expect(response.body.counts.users).toBe(5);
  });

  it("non-admin cannot read dashboard", async () => {
    await request(createApp()).get("/api/v1/admin/dashboard").set(auth("driver_1")).expect(403);
  });

  it("admin endpoints return records", async () => {
    prismaMock.driverProfile.findMany.mockResolvedValue([{ id: "profile_1" }]);
    prismaMock.passengerRequest.findMany.mockResolvedValue([{ id: "req_1" }]);
    prismaMock.merchantOrder.findMany.mockResolvedValue([{ id: "order_1" }]);
    prismaMock.driverRoute.findMany.mockResolvedValue([{ id: "route_1" }]);

    await request(createApp()).get("/api/v1/admin/drivers").set(auth("admin_1")).expect(200);
    await request(createApp()).get("/api/v1/admin/requests").set(auth("admin_1")).expect(200);
    await request(createApp()).get("/api/v1/admin/orders").set(auth("admin_1")).expect(200);
    await request(createApp()).get("/api/v1/admin/routes").set(auth("admin_1")).expect(200);
  });
});
