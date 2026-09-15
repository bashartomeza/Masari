import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import type { AuthActionPurpose } from "../generated/prisma/enums.js";
import { keyedDigest, type VersionedKey } from "./keyedDigest.js";

type ActionDatabase = PrismaClient | Prisma.TransactionClient;

const AUTH_ACTION_TTL_SECONDS: Record<AuthActionPurpose, number> = {
  email_verification: 24 * 60 * 60,
  password_reset: 30 * 60,
  password_set: 15 * 60,
  email_change: 30 * 60,
  google_registration: 15 * 60,
  phone_verification: 10 * 60
};

const SECRET_FIELD_NAMES = new Set([
  "password",
  "password_hash",
  "credential",
  "id_token",
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "token"
]);

export class AuthActionError extends Error {
  constructor(message = "auth_action_invalid") {
    super(message);
    this.name = "AuthActionError";
  }
}

function actionTokenDigest(rawToken: string, key: VersionedKey) {
  return keyedDigest("masari:auth-action-token", rawToken, key);
}

function actionSubjectDigest(subject: string, key: VersionedKey) {
  return keyedDigest("masari:auth-action-subject", subject, key);
}

function isSafePayload(value: unknown): value is Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(isSafePayload);
  if (typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).every(([name, child]) => !SECRET_FIELD_NAMES.has(name.toLowerCase()) && isSafePayload(child));
}

function assertSafePayload(payload: unknown) {
  if (!isSafePayload(payload) || (payload !== undefined && JSON.stringify(payload).length > 4_096)) {
    throw new AuthActionError("auth_action_payload_invalid");
  }
}

function assertRawToken(rawToken: unknown): rawToken is string {
  return typeof rawToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(rawToken);
}

export function generateAuthActionToken() {
  return randomBytes(32).toString("base64url");
}

export async function issueAuthAction(
  db: ActionDatabase,
  input: {
    purpose: AuthActionPurpose;
    key: VersionedKey;
    userId?: string;
    subject?: string;
    payload?: Prisma.InputJsonValue;
    now?: Date;
  }
) {
  assertSafePayload(input.payload);
  const rawToken = generateAuthActionToken();
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + AUTH_ACTION_TTL_SECONDS[input.purpose] * 1_000);
  const action = await db.authActionToken.create({
    data: {
      purpose: input.purpose,
      user_id: input.userId,
      subject_digest: input.subject ? actionSubjectDigest(input.subject, input.key) : undefined,
      token_digest: actionTokenDigest(rawToken, input.key),
      token_key_version: input.key.version,
      payload: input.payload,
      expires_at: expiresAt
    }
  });
  return { action, rawToken, expiresAt };
}

export async function consumeAuthAction(
  db: ActionDatabase,
  rawToken: unknown,
  purpose: AuthActionPurpose,
  input: { key: VersionedKey; now?: Date }
) {
  if (!assertRawToken(rawToken)) throw new AuthActionError();
  const now = input.now ?? new Date();
  const tokenDigest = actionTokenDigest(rawToken, input.key);
  return db.$transaction(async (tx) => {
    const action = await tx.authActionToken.findUnique({ where: { token_digest: tokenDigest } });
    if (
      !action ||
      action.purpose !== purpose ||
      action.token_key_version !== input.key.version ||
      action.consumed_at ||
      action.expires_at <= now
    ) throw new AuthActionError();
    const consumed = await tx.authActionToken.updateMany({
      where: {
        id: action.id,
        token_digest: tokenDigest,
        token_key_version: input.key.version,
        purpose,
        consumed_at: null,
        expires_at: { gt: now }
      },
      data: { consumed_at: now }
    });
    if (consumed.count !== 1) throw new AuthActionError();
    return action;
  });
}

export async function revokeAuthActions(
  db: ActionDatabase,
  input: { userId?: string; subject?: string; purpose?: AuthActionPurpose; key?: VersionedKey; reason: string; now?: Date }
) {
  if (!input.userId && !input.subject) throw new AuthActionError("auth_action_subject_required");
  if (input.subject && !input.key) throw new AuthActionError("auth_action_key_required");
  const now = input.now ?? new Date();
  const revoked = await db.authActionToken.updateMany({
    where: {
      ...(input.userId ? { user_id: input.userId } : {}),
      ...(input.subject ? { subject_digest: actionSubjectDigest(input.subject, input.key!) } : {}),
      ...(input.purpose ? { purpose: input.purpose } : {}),
      consumed_at: null
    },
    // AuthActionToken deliberately has no revocation metadata: consumption makes a
    // stale proof unusable without recording operationally sensitive reason text.
    data: { consumed_at: now }
  });
  return revoked.count;
}
