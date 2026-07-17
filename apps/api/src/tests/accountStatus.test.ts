import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
  authSession: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  refreshToken: { updateMany: vi.fn() },
  auditEvent: { create: vi.fn() }
}));

vi.mock("../lib/prisma.js", () => ({ prisma: prismaMock }));

const { createApp } = await import("../app.js");
const { signAuthToken } = await import("../middleware/auth.js");

const now = new Date("2026-07-17T09:00:00.000Z");
const admin = {
  id: "admin_1",
  name: "Admin",
  phone: "+970590000005",
  role: "admin" as const,
  account_status: "active",
  security_version: 1,
  demo_account: false
};
const passenger = {
  id: "passenger_1",
  name: "Passenger",
  phone: "+970590000001",
  role: "passenger" as const,
  account_status: "active",
  security_version: 1,
  status_reason: null,
  status_updated_at: now,
  last_login_at: now,
  demo_account: false,
  created_at: now
};

function sessionFor(user: typeof admin | typeof passenger) {
  return {
    id: `session_${user.id}`,
    user_id: user.id,
    user,
    security_version_at_issue: user.security_version,
    expires_at: new Date(Date.now() + 60_000),
    revoked_at: null
  };
}

function authorization(user: typeof admin | typeof passenger = admin) {
  const token = signAuthToken({
    id: user.id,
    role: user.role,
    sessionId: `session_${user.id}`,
    securityVersion: user.security_version
  });
  return { Authorization: `Bearer ${token}` };
}

describe("admin account status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
    prismaMock.authSession.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      where.id === "session_admin_1" ? sessionFor(admin) : sessionFor(passenger)
    );
    prismaMock.authSession.findMany.mockResolvedValue([{ id: "session_passenger_1" }]);
    prismaMock.authSession.update.mockResolvedValue({});
    prismaMock.authSession.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.findUnique.mockResolvedValue(passenger);
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.update.mockImplementation(({ data }: { data: { account_status: string; status_reason: string | null } }) => ({
      ...passenger,
      account_status: data.account_status,
      status_reason: data.status_reason,
      status_updated_at: new Date()
    }));
    prismaMock.auditEvent.create.mockResolvedValue({ id: "audit_1" });
  });

  it("suspends a user, revokes sessions, bumps security version, and audits the safe reason", async () => {
    const response = await request(createApp())
      .patch("/api/v1/admin/users/passenger_1/status")
      .set(authorization())
      .send({ status: "suspended", reason: "  Policy   violation  " })
      .expect(200);

    expect(response.body.user).toEqual(
      expect.objectContaining({ id: passenger.id, account_status: "suspended", status_reason: "Policy violation" })
    );
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash|security_version|refresh_token|token_hash/);
    expect(prismaMock.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revoke_reason: "account_suspended" }) })
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ security_version: { increment: 1 } }) })
    );
    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user_id: admin.id,
          action: "account_status_changed",
          metadata: expect.objectContaining({
            target_user_id: passenger.id,
            previous_status: "active",
            new_status: "suspended",
            reason: "Policy violation",
            request_id: expect.any(String)
          })
        })
      })
    );
  });

  it("requires a valid reason for suspension or disablement", async () => {
    await request(createApp())
      .patch("/api/v1/admin/users/passenger_1/status")
      .set(authorization())
      .send({ status: "disabled", reason: "  " })
      .expect(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("reactivates without restoring revoked sessions", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...passenger, account_status: "suspended", status_reason: "Policy violation" });
    await request(createApp())
      .patch("/api/v1/admin/users/passenger_1/status")
      .set(authorization())
      .send({ status: "active" })
      .expect(200);
    expect(prismaMock.authSession.findMany).not.toHaveBeenCalled();
    expect(prismaMock.authSession.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a non-admin before the status transaction", async () => {
    await request(createApp())
      .patch("/api/v1/admin/users/passenger_1/status")
      .set(authorization(passenger))
      .send({ status: "suspended", reason: "Policy violation" })
      .expect(403);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("prevents current-admin self-suspension", async () => {
    await request(createApp())
      .patch("/api/v1/admin/users/admin_1/status")
      .set(authorization())
      .send({ status: "suspended", reason: "Administrative rotation" })
      .expect(409);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("prevents suspending the last active admin", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...passenger,
      id: "admin_2",
      role: "admin",
      name: "Other Admin"
    });
    prismaMock.user.count.mockResolvedValue(0);
    await request(createApp())
      .patch("/api/v1/admin/users/admin_2/status")
      .set(authorization())
      .send({ status: "disabled", reason: "Access decommissioned" })
      .expect(409);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
