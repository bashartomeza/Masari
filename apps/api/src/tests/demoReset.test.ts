import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  auditEvent: {
    create: vi.fn()
  }
}));

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

const { createApp } = await import("../app.js");
const { resetDemoData } = await import("../modules/demoReset.js");

describe("demo reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects reset without admin token or reset key", async () => {
    await request(createApp()).post("/api/v1/demo/reset").expect(403);
  });

  it("accepts reset with the demo reset key", async () => {
    prismaMock.$transaction.mockResolvedValue({
      corridor: "Hebron / PPU / Bab Al-Zawiya -> Bethlehem",
      users: { passenger: "+970590000001", drivers: ["+970590000002"], merchant: "+970590000004", admin: "+970590000005" },
      parcels: 5,
      scenarios: 3
    });

    const response = await request(createApp())
      .post("/api/v1/demo/reset")
      .set("x-demo-reset-key", "test-reset-key")
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.auditEvent.create).toHaveBeenCalledOnce();
  });

  it("clears session state and recreates deterministic active users", async () => {
    const userCreate = vi
      .fn()
      .mockResolvedValueOnce({ id: "passenger", phone: "+970590000001" })
      .mockResolvedValueOnce({ id: "driver_1", phone: "+970590000002" })
      .mockResolvedValueOnce({ id: "driver_2", phone: "+970590000003" })
      .mockResolvedValueOnce({ id: "merchant", phone: "+970590000004" })
      .mockResolvedValueOnce({ id: "admin", phone: "+970590000005" });
    const tx = {
      auditEvent: { deleteMany: vi.fn(), create: vi.fn() },
      userConsent: { deleteMany: vi.fn() },
      onboardingSession: { deleteMany: vi.fn() },
      invitationRedemption: { deleteMany: vi.fn() },
      onboardingAttempt: { updateMany: vi.fn(), deleteMany: vi.fn() },
      otpChallenge: { deleteMany: vi.fn() },
      invitation: { deleteMany: vi.fn() },
      consentDocument: { deleteMany: vi.fn() },
      abuseCounter: { deleteMany: vi.fn() },
      idempotencyRecord: { deleteMany: vi.fn() },
      refreshToken: { deleteMany: vi.fn() },
      authSession: { deleteMany: vi.fn() },
      locationEvent: { deleteMany: vi.fn() },
      trip: { deleteMany: vi.fn() },
      match: { deleteMany: vi.fn() },
      comparisonRun: { deleteMany: vi.fn() },
      parcelBatch: { deleteMany: vi.fn() },
      parcel: { deleteMany: vi.fn(), create: vi.fn() },
      merchantOrder: { deleteMany: vi.fn(), create: vi.fn().mockResolvedValue({ id: "order_1" }) },
      passengerRequest: { deleteMany: vi.fn(), create: vi.fn() },
      driverRoute: { deleteMany: vi.fn(), create: vi.fn() },
      driverProfile: {
        deleteMany: vi.fn(),
        create: vi.fn().mockResolvedValueOnce({ id: "profile_1" }).mockResolvedValueOnce({ id: "profile_2" })
      },
      demoScenario: { deleteMany: vi.fn(), createMany: vi.fn() },
      user: { deleteMany: vi.fn(), create: userCreate }
    };
    const db = { $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) };

    await resetDemoData(db as never);

    expect(tx.refreshToken.deleteMany).toHaveBeenCalledOnce();
    expect(tx.authSession.deleteMany).toHaveBeenCalledOnce();
    expect(tx.invitation.deleteMany).toHaveBeenCalledOnce();
    expect(tx.otpChallenge.deleteMany).toHaveBeenCalledOnce();
    expect(tx.refreshToken.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.authSession.deleteMany.mock.invocationCallOrder[0]
    );
    expect(tx.authSession.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.user.deleteMany.mock.invocationCallOrder[0]
    );
    expect(userCreate).toHaveBeenCalledTimes(5);
    for (const call of userCreate.mock.calls) {
      expect(call[0].data).toEqual(expect.objectContaining({ account_status: "active", security_version: 1 }));
    }
  });
});
