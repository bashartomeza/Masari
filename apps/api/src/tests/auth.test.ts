import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn()
  },
  auditEvent: {
    create: vi.fn()
  }
}));

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

process.env.JWT_SECRET = "test-jwt-secret-with-length";

const { createApp } = await import("../app.js");

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in a seeded demo account and returns a token", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_1",
      name: "Demo Passenger",
      phone: "+970590000001",
      password_hash: await bcrypt.hash("demo-passenger-123", 4),
      role: "passenger",
      demo_account: true
    });

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ phone: "+970590000001", password: "demo-passenger-123" })
      .expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.role).toBe("passenger");
    expect(prismaMock.auditEvent.create).toHaveBeenCalledOnce();
  });

  it("rejects invalid login credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await request(createApp())
      .post("/api/v1/auth/login")
      .send({ phone: "+970590000001", password: "bad" })
      .expect(401);
  });
});
