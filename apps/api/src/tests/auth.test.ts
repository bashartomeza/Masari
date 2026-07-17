import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  authSession: { create: vi.fn() },
  refreshToken: { create: vi.fn() },
  auditEvent: {
    create: vi.fn()
  }
}));

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

const { createApp } = await import("../app.js");

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
    prismaMock.authSession.create.mockResolvedValue({
      id: "session_1",
      client_type: "mobile",
      device_name: null,
      created_at: new Date(),
      last_used_at: new Date(),
      expires_at: new Date(Date.now() + 86_400_000),
      revoked_at: null
    });
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.auditEvent.create.mockResolvedValue({ id: "audit_1" });
  });

  it("logs in a seeded demo account and returns a token", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_1",
      name: "Demo Passenger",
      phone: "+970590000001",
      password_hash: await bcrypt.hash("test-passenger-password", 4),
      role: "passenger",
      account_status: "active",
      security_version: 1,
      demo_account: true
    });

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ phone: "+970590000001", password: "test-passenger-password" })
      .expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.access_token).toBe(response.body.token);
    expect(response.body.refresh_token).toEqual(expect.any(String));
    expect(response.body.session).toEqual(expect.objectContaining({ id: "session_1", is_current: true }));
    expect(response.body.user.role).toBe("passenger");
    expect(prismaMock.authSession.create).toHaveBeenCalledOnce();
    expect(prismaMock.refreshToken.create).toHaveBeenCalledOnce();
    expect(prismaMock.auditEvent.create).toHaveBeenCalledTimes(2);
    const storedHash = prismaMock.refreshToken.create.mock.calls[0]?.[0]?.data?.token_hash;
    expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(response.body)).not.toContain(storedHash);
  });

  it("creates an admin session without issuing a browser refresh token", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "admin_1",
      name: "Admin",
      phone: "+970590000005",
      password_hash: await bcrypt.hash("test-admin-password", 4),
      role: "admin",
      account_status: "active",
      security_version: 1,
      demo_account: true
    });
    prismaMock.authSession.create.mockResolvedValue({
      id: "session_admin",
      client_type: "admin",
      device_name: null,
      created_at: new Date(),
      last_used_at: new Date(),
      expires_at: new Date(Date.now() + 3_600_000),
      revoked_at: null
    });

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ phone: "+970590000005", password: "test-admin-password" })
      .expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty("refresh_token");
    expect(response.body).not.toHaveProperty("refresh_token_expires_in");
    expect(prismaMock.authSession.create).toHaveBeenCalledOnce();
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  for (const accountStatus of ["pending", "suspended", "disabled"] as const) {
    it(`blocks login for a ${accountStatus} account with a safe error`, async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "user_1",
        name: "Unavailable User",
        phone: "+970590000001",
        password_hash: await bcrypt.hash("test-passenger-password", 4),
        role: "passenger",
        account_status: accountStatus,
        security_version: 2,
        demo_account: false
      });

      const response = await request(createApp())
        .post("/api/v1/auth/login")
        .send({ phone: "+970590000001", password: "test-passenger-password" })
        .expect(403);

      expect(response.body).toEqual(
        expect.objectContaining({ error: "account_unavailable", request_id: expect.any(String) })
      );
      expect(response.body).not.toHaveProperty("reason");
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.authSession.create).not.toHaveBeenCalled();
      expect(prismaMock.auditEvent.create).toHaveBeenCalledOnce();
    });
  }

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
      account_status: "active",
      security_version: 1,
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
