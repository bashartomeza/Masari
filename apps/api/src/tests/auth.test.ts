import request from "supertest";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  },
  authSession: { create: vi.fn() },
  refreshToken: { create: vi.fn() },
  auditEvent: {
    create: vi.fn()
  }
}));

const verifyGoogleIdTokenMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../lib/googleIdToken.js", async () => {
  const actual = await vi.importActual<typeof import("../lib/googleIdToken.js")>(
    "../lib/googleIdToken.js"
  );
  return { ...actual, verifyGoogleIdToken: verifyGoogleIdTokenMock };
});

const { createApp } = await import("../app.js");
const { GoogleIdTokenError } = await import("../lib/googleIdToken.js");

function passengerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    name: "Demo Passenger",
    phone: "+970590000001",
    email: "passenger@example.com",
    email_verified_at: new Date(),
    google_sub: null,
    password_hash: null as string | null,
    role: "passenger",
    account_status: "active",
    security_version: 1,
    demo_account: true,
    ...overrides
  };
}

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
    prismaMock.user.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(passengerRow(data))
    );
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.auditEvent.create.mockResolvedValue({ id: "audit_1" });
  });

  it("logs in a seeded account by email and returns a token", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      passengerRow({ password_hash: await bcrypt.hash("test-passenger-password", 4) })
    );

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ email: "passenger@example.com", password: "test-passenger-password" })
      .expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.access_token).toBe(response.body.token);
    expect(response.body.refresh_token).toEqual(expect.any(String));
    expect(response.body.session).toEqual(expect.objectContaining({ id: "session_1", is_current: true }));
    expect(response.body.user.role).toBe("passenger");
    expect(response.body.user.email).toBe("passenger@example.com");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "passenger@example.com" }
    });
    expect(prismaMock.authSession.create).toHaveBeenCalledOnce();
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "user_1",
        role: "passenger",
        account_status: "active",
        security_version: 1
      },
      data: { last_login_at: expect.any(Date) }
    });
    expect(prismaMock.refreshToken.create).toHaveBeenCalledOnce();
    expect(prismaMock.auditEvent.create).toHaveBeenCalledTimes(2);
    const storedHash = prismaMock.refreshToken.create.mock.calls[0]?.[0]?.data?.token_hash;
    expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(response.body)).not.toContain(storedHash);
  });

  it("normalises the email before lookup", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      passengerRow({ password_hash: await bcrypt.hash("test-passenger-password", 4) })
    );

    await request(createApp())
      .post("/api/v1/auth/login")
      .send({ email: "  Passenger@Example.com ", password: "test-passenger-password" })
      .expect(200);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "passenger@example.com" }
    });
  });

  it("creates the access credential before the login transaction callback resolves", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      passengerRow({ password_hash: await bcrypt.hash("test-passenger-password", 4) })
    );
    prismaMock.$transaction.mockImplementationOnce(async (callback: (tx: typeof prismaMock) => unknown) => {
      const result = await callback(prismaMock);
      expect(result).toEqual(expect.objectContaining({ kind: "success", token: expect.any(String) }));
      return result;
    });

    await request(createApp())
      .post("/api/v1/auth/login")
      .send({ email: "passenger@example.com", password: "test-passenger-password" })
      .expect(200);
  });

  it("creates an admin session without issuing a browser refresh token", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      passengerRow({
        id: "admin_1",
        name: "Admin",
        email: "admin@example.com",
        role: "admin",
        password_hash: await bcrypt.hash("test-admin-password", 4)
      })
    );
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
      .send({ email: "admin@example.com", password: "test-admin-password" })
      .expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty("refresh_token");
    expect(response.body).not.toHaveProperty("refresh_token_expires_in");
    expect(prismaMock.authSession.create).toHaveBeenCalledOnce();
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  for (const accountStatus of ["pending", "suspended", "disabled"] as const) {
    it(`blocks login for a ${accountStatus} account with a safe error`, async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        passengerRow({
          demo_account: false,
          security_version: 2,
          account_status: accountStatus,
          password_hash: await bcrypt.hash("test-passenger-password", 4)
        })
      );

      const response = await request(createApp())
        .post("/api/v1/auth/login")
        .send({ email: "passenger@example.com", password: "test-passenger-password" })
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
      .send({ email: "passenger@example.com", password: "bad" })
      .expect(401);

    prismaMock.user.findUnique.mockResolvedValue(
      passengerRow({ password_hash: await bcrypt.hash("different-password", 4) })
    );
    const wrongPassword = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ email: "passenger@example.com", password: "bad" })
      .expect(401);

    expect(missingUser.body.error).toBe("invalid_credentials");
    expect(wrongPassword.body.error).toBe("invalid_credentials");
  });

  it("rejects password login for an account that only has Google linked", async () => {
    prismaMock.user.findUnique.mockResolvedValue(passengerRow({ password_hash: null, google_sub: "g-1" }));

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ email: "passenger@example.com", password: "anything" })
      .expect(401);

    expect(response.body.error).toBe("invalid_credentials");
  });

  it("does not create a session when account eligibility changes before the transaction", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      passengerRow({ password_hash: await bcrypt.hash("test-passenger-password", 4) })
    );
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ email: "passenger@example.com", password: "test-passenger-password" })
      .expect(403);

    expect(response.body.error).toBe("account_unavailable");
    expect(prismaMock.authSession.create).not.toHaveBeenCalled();
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
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

describe("retired immediate registration", () => {
  it("returns registration_flow_required and never creates a user or session", async () => {
    vi.clearAllMocks();
    const response = await request(createApp()).post("/api/v1/auth/register")
      .send({ name: "Sara", email: "sara@example.com", password: "supersecret1" }).expect(410);
    expect(response.body.error).toBe("registration_flow_required");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.authSession.create).not.toHaveBeenCalled();
  });
});

describe("auth google", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyGoogleIdTokenMock.mockReset();
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
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(passengerRow(data))
    );
    prismaMock.auditEvent.create.mockResolvedValue({ id: "audit_1" });
  });

  it("returns 501 when Google is not configured", async () => {
    verifyGoogleIdTokenMock.mockRejectedValue(new GoogleIdTokenError("google_auth_not_configured"));

    const response = await request(createApp())
      .post("/api/v1/auth/google")
      .send({ id_token: "x" })
      .expect(501);

    expect(response.body.error).toBe("google_auth_not_configured");
  });

  it("creates a passenger on first Google sign-in", async () => {
    verifyGoogleIdTokenMock.mockResolvedValue({
      sub: "google-123",
      email: "gmailuser@example.com",
      emailVerified: true,
      name: "Gmail User",
      picture: null
    });
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(
      passengerRow({
        id: "g_new",
        email: "gmailuser@example.com",
        google_sub: "google-123",
        name: "Gmail User"
      })
    );

    const response = await request(createApp())
      .post("/api/v1/auth/google")
      .send({ id_token: "valid-token" })
      .expect(201);

    expect(response.body.user.email).toBe("gmailuser@example.com");
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ google_sub: "google-123", role: "passenger", account_status: "active" })
    });
  });

  it("links Google to an existing email account", async () => {
    verifyGoogleIdTokenMock.mockResolvedValue({
      sub: "google-777",
      email: "passenger@example.com",
      emailVerified: true,
      name: "Demo Passenger",
      picture: null
    });
    prismaMock.user.findFirst.mockResolvedValue(passengerRow({ google_sub: null }));

    await request(createApp())
      .post("/api/v1/auth/google")
      .send({ id_token: "valid-token" })
      .expect(200);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { google_sub: "google-777" }
    });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects an unverified Google email", async () => {
    verifyGoogleIdTokenMock.mockResolvedValue({
      sub: "google-1",
      email: "spoof@example.com",
      emailVerified: false,
      name: null,
      picture: null
    });

    const response = await request(createApp())
      .post("/api/v1/auth/google")
      .send({ id_token: "valid-token" })
      .expect(401);

    expect(response.body.error).toBe("google_email_unverified");
  });

  it("rejects an invalid Google token", async () => {
    verifyGoogleIdTokenMock.mockRejectedValue(new GoogleIdTokenError("google_token_invalid"));

    const response = await request(createApp())
      .post("/api/v1/auth/google")
      .send({ id_token: "bad" })
      .expect(401);

    expect(response.body.error).toBe("invalid_google_token");
  });
});
