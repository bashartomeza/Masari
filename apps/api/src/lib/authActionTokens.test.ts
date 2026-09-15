import { describe, expect, it, vi } from "vitest";
import { createConfig } from "../config.js";
import {
  consumeAuthAction,
  issueAuthAction,
  revokeAuthActions
} from "./authActionTokens.js";

const key = { secret: "auth-action-test-pepper-with-at-least-thirty-two-characters", version: 7 };
const now = new Date("2026-09-15T10:00:00.000Z");

function action(overrides: Record<string, unknown> = {}) {
  return {
    id: "action_1",
    purpose: "google_registration",
    user_id: null,
    subject_digest: "a".repeat(64),
    token_digest: "b".repeat(64),
    token_key_version: key.version,
    payload: { registration: "google" },
    expires_at: new Date(now.getTime() + 10 * 60 * 1_000),
    consumed_at: null,
    created_at: now,
    ...overrides
  };
}

function database(stored = action()) {
  const db = {
    authActionToken: {
      create: vi.fn().mockResolvedValue(stored),
      findUnique: vi.fn().mockResolvedValue(stored),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([{ id: stored.id }])
    },
    $transaction: vi.fn(async (work: (transaction: typeof db) => unknown) => work(db))
  };
  return db;
}

describe("one-time auth actions", () => {
  it("issues a purpose-bound Google registration token without persisting raw token material", async () => {
    const db = database();
    const issued = await issueAuthAction(db as never, {
      purpose: "google_registration",
      subject: "google-subject-123",
      payload: { registration: "google" },
      key,
      now
    });

    expect(issued.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const persisted = db.authActionToken.create.mock.calls[0][0].data;
    expect(persisted).toEqual(expect.objectContaining({
      purpose: "google_registration",
      subject_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
      token_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
      token_key_version: key.version
    }));
    expect(JSON.stringify(persisted)).not.toContain(issued.rawToken);
    expect(JSON.stringify(persisted)).not.toContain("google-subject-123");
  });

  it("consumes an action exactly once with its fixed purpose", async () => {
    const db = database();
    const issued = await issueAuthAction(db as never, {
      purpose: "google_registration",
      key,
      now
    });

    const consumed = await consumeAuthAction(db as never, issued.rawToken, "google_registration", { key, now });
    expect(consumed).toMatchObject({ purpose: "google_registration" });
    await expect(consumeAuthAction(db as never, issued.rawToken, "email_verification", { key, now }))
      .rejects.toThrow("auth_action_invalid");

    db.authActionToken.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(consumeAuthAction(db as never, issued.rawToken, "google_registration", { key, now }))
      .rejects.toThrow("auth_action_invalid");
  });

  it("rejects expired or revoked actions and atomically permits only one concurrent consumer", async () => {
    const db = database(action({ expires_at: new Date(now.getTime() - 1) }));
    await expect(consumeAuthAction(db as never, "x".repeat(43), "google_registration", { key, now }))
      .rejects.toThrow("auth_action_invalid");

    db.authActionToken.findUnique.mockResolvedValue(action());
    db.authActionToken.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const results = await Promise.allSettled([
      consumeAuthAction(db as never, "y".repeat(43), "google_registration", { key, now }),
      consumeAuthAction(db as never, "y".repeat(43), "google_registration", { key, now })
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("revokes matching unconsumed actions without revealing raw token material", async () => {
    const db = database();
    await expect(revokeAuthActions(db as never, {
      userId: "user_1",
      purpose: "password_reset",
      reason: "password_changed",
      now
    })).resolves.toBe(1);
    expect(db.authActionToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ user_id: "user_1", purpose: "password_reset", consumed_at: null })
    }));
  });

  it("requires a distinct, strong production action-token pepper while allowing an injected test key", () => {
    const production = {
      APP_ENV: "production",
      DATABASE_URL: "mysql://test:test@localhost:3306/masari_test",
      JWT_SECRET: "production-jwt-secret-with-at-least-thirty-two-characters",
      REFRESH_TOKEN_PEPPER: "production-refresh-pepper-with-at-least-thirty-two-characters",
      CORS_ORIGINS: "https://admin.masari.example",
      APP_RELEASE: "auth-actions-test",
      TRUST_PROXY: "none"
    };
    expect(createConfig(production).authActions).toBeUndefined();
    expect(() => createConfig({ ...production, AUTH_ACTION_TOKEN_PEPPER: "short" })).toThrow(/AUTH_ACTION_TOKEN_PEPPER is missing or invalid/);
    expect(() => createConfig({ ...production, AUTH_ACTION_TOKEN_PEPPER: production.JWT_SECRET })).toThrow(/distinct/);
    const parsed = createConfig({ ...production, AUTH_ACTION_TOKEN_PEPPER: key.secret, AUTH_ACTION_TOKEN_KEY_VERSION: "7" });
    expect(parsed.authActions?.key).toEqual(key);
  });
});
