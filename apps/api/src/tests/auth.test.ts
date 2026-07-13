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
      password_hash: await bcrypt.hash("test-passenger-password", 4),
      role: "passenger",
      demo_account: true
    });

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ phone: "+970590000001", password: "test-passenger-password" })
      .expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.role).toBe("passenger");
    expect(prismaMock.auditEvent.create).toHaveBeenCalledOnce();
  });

  it("rejects invalid login credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const missingUser = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ phone: "+970590000001", password: "bad" })
      .expect(401);

    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_1",
      name: "Demo Passenger",
      phone: "+970590000001",
      password_hash: await bcrypt.hash("different-password", 4),
      role: "passenger",
      demo_account: true
    });
    const wrongPassword = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ phone: "+970590000001", password: "bad" })
      .expect(401);

    expect(missingUser.body.error).toBe("invalid_credentials");
    expect(wrongPassword.body.error).toBe("invalid_credentials");
  });

  it("allows local admin console CORS preflight", async () => {
    const response = await request(createApp())
      .options("/api/v1/auth/login")
      .set("Origin", "http://localhost:5175")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type")
      .expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5175");
  });
});
