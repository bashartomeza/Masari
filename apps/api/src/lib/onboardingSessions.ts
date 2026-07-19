import { randomBytes } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { OnboardingSessionPurpose } from "../generated/prisma/enums.js";
import { onboardingSessionDigest, type VersionedKey } from "./keyedDigest.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { auditEvent } from "./audit.js";

export async function createOnboardingSession(
  db: PrismaClient,
  input: {
    attemptId: string;
    userId?: string;
    purpose?: OnboardingSessionPurpose;
    key: VersionedKey;
    ttlSeconds: number;
    now?: Date;
  }
) {
  const token = generateOnboardingToken();
  const now = input.now ?? new Date();
  const session = await db.$transaction(async (tx) => {
    const attempt = await tx.onboardingAttempt.findUnique({
      where: { id: input.attemptId },
      select: {
        status: true,
        expires_at: true,
        completed_user_id: true,
        completed_user: { select: { id: true, role: true, account_status: true } }
      }
    });
    const purpose = input.purpose ?? "onboarding_completion";
    const eligible =
      purpose === "continuation"
        ? !input.userId &&
          attempt?.completed_user_id === null &&
          ["created", "otp_dispatching", "otp_sent", "phone_verified"].includes(attempt?.status ?? "") &&
          attempt.expires_at > now
        : purpose === "pending_status"
          ? Boolean(
              input.userId &&
                attempt?.status === "completed" &&
                attempt.completed_user_id === input.userId &&
                attempt.completed_user?.id === input.userId &&
                ["driver", "merchant"].includes(attempt.completed_user.role) &&
                attempt.completed_user.account_status === "pending"
            )
          : !input.userId &&
            attempt?.status === "phone_verified" &&
            attempt.completed_user_id === null &&
            attempt.expires_at > now;
    if (!attempt || !eligible) {
      throw new Error("onboarding_session_attempt_unavailable");
    }
    const requestedExpiry = new Date(now.getTime() + input.ttlSeconds * 1000);
    const expiresAt = purpose === "pending_status"
      ? requestedExpiry
      : new Date(Math.min(requestedExpiry.getTime(), attempt.expires_at.getTime()));
    const created = await tx.onboardingSession.create({
      data: {
        onboarding_attempt_id: input.attemptId,
        user_id: input.userId,
        token_digest: onboardingSessionDigest(token, input.key),
        token_key_version: input.key.version,
        purpose,
        expires_at: expiresAt
      }
    });
    await auditEvent(tx, { action: AuditAction.onboarding_session_created, entityType: "OnboardingSession", entityId: created.id });
    return created;
  });
  return { session, token };
}

export function generateOnboardingToken() {
  return randomBytes(32).toString("base64url");
}

export function onboardingSessionTokenData(input: {
  token: string;
  key: VersionedKey;
  attemptId: string;
  userId?: string;
  purpose: OnboardingSessionPurpose;
  expiresAt: Date;
}) {
  return {
    onboarding_attempt_id: input.attemptId,
    user_id: input.userId,
    token_digest: onboardingSessionDigest(input.token, input.key),
    token_key_version: input.key.version,
    purpose: input.purpose,
    expires_at: input.expiresAt
  };
}

export async function authenticateOnboardingSession(
  db: PrismaClient,
  input: {
    token: string;
    key: VersionedKey;
    purposes: readonly OnboardingSessionPurpose[];
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  const digest = onboardingSessionDigest(input.token, input.key);
  const session = await db.onboardingSession.findUnique({
    where: { token_digest: digest },
    include: { onboarding_attempt: true, user: true }
  });
  if (
    !session ||
    session.token_key_version !== input.key.version ||
    !input.purposes.includes(session.purpose) ||
    session.consumed_at ||
    session.revoked_at ||
    session.expires_at <= now
  ) return null;

  const continuationEligible =
    session.purpose === "continuation" &&
    !session.user_id &&
    session.onboarding_attempt.completed_user_id === null &&
    ["created", "otp_dispatching", "otp_sent", "phone_verified"].includes(session.onboarding_attempt.status) &&
    session.onboarding_attempt.expires_at > now;
  const completionEligible =
    session.purpose === "onboarding_completion" &&
    !session.user_id &&
    session.onboarding_attempt.status === "phone_verified" &&
    session.onboarding_attempt.expires_at > now;
  const pendingEligible =
    session.purpose === "pending_status" &&
    session.user_id &&
    session.user?.id === session.user_id &&
    session.onboarding_attempt.status === "completed" &&
    session.onboarding_attempt.completed_user_id === session.user_id &&
    ["driver", "merchant"].includes(session.user.role) &&
    ["pending", "active", "suspended", "disabled"].includes(session.user.account_status);
  if (!continuationEligible && !completionEligible && !pendingEligible) return null;

  const touched = await db.onboardingSession.updateMany({
    where: {
      id: session.id,
      token_digest: digest,
      token_key_version: input.key.version,
      consumed_at: null,
      revoked_at: null,
      expires_at: { gt: now }
    },
    data: { last_used_at: now }
  });
  return touched.count === 1 ? session : null;
}

export async function consumeOnboardingSession(
  db: PrismaClient,
  input: { token: string; key: VersionedKey; now?: Date }
) {
  const now = input.now ?? new Date();
  const digest = onboardingSessionDigest(input.token, input.key);
  return db.$transaction(async (tx) => {
    const session = await tx.onboardingSession.findUnique({
      where: { token_digest: digest },
      include: { onboarding_attempt: true }
    });
    if (
      !session ||
      session.token_key_version !== input.key.version ||
      session.consumed_at ||
      session.revoked_at ||
      session.expires_at <= now ||
      session.onboarding_attempt.expires_at <= now ||
      session.purpose !== "onboarding_completion"
    ) return false;
    const attemptWhere = session.user_id
      ? { id: session.onboarding_attempt_id, status: "completed" as const, completed_user_id: session.user_id }
      : { id: session.onboarding_attempt_id, status: "phone_verified" as const, completed_user_id: null };
    const eligibleAttempt = await tx.onboardingAttempt.updateMany({
      where: { ...attemptWhere, expires_at: { gt: now } },
      data: { status: attemptWhere.status }
    });
    if (eligibleAttempt.count !== 1) return false;
    const consumed = await tx.onboardingSession.updateMany({
      where: {
        id: session.id,
        token_digest: digest,
        token_key_version: input.key.version,
        consumed_at: null,
        revoked_at: null,
        expires_at: { gt: now }
      },
      data: { consumed_at: now, last_used_at: now }
    });
    return consumed.count === 1;
  });
}

export async function revokeOnboardingSessions(
  db: PrismaClient,
  input: {
    attemptId?: string;
    userId?: string;
    purpose?: OnboardingSessionPurpose;
    reason: string;
    now?: Date;
  }
) {
  if (!input.attemptId && !input.userId) throw new Error("onboarding_session_subject_required");
  const now = input.now ?? new Date();
  const sessions = await db.onboardingSession.findMany({
    where: {
      ...(input.attemptId ? { onboarding_attempt_id: input.attemptId } : {}),
      ...(input.userId ? { user_id: input.userId } : {}),
      ...(input.purpose ? { purpose: input.purpose } : {}),
      revoked_at: null
    },
    select: { id: true }
  });
  await db.$transaction(async (tx) => {
    await tx.onboardingSession.updateMany({
      where: { id: { in: sessions.map((session) => session.id) }, revoked_at: null },
      data: { revoked_at: now, revoke_reason: input.reason }
    });
    for (const session of sessions) {
      await auditEvent(tx, {
        action: AuditAction.onboarding_session_revoked,
        entityType: "OnboardingSession",
        entityId: session.id,
        metadata: { reason_recorded: true }
      });
    }
  });
  return sessions.length;
}
