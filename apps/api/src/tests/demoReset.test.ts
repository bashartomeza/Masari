import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  auditEvent: {
    create: vi.fn()
  }
}));

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

process.env.JWT_SECRET = "test-jwt-secret-with-length";
process.env.DEMO_RESET_KEY = "test-reset-key";

const { createApp } = await import("../app.js");

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
});
