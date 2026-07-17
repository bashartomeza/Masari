import { randomBytes } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client.js";
import { onboardingSessionDigest, type VersionedKey } from "./keyedDigest.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { auditEvent } from "./audit.js";

export async function createOnboardingSession(
  db: PrismaClient,
  input: { attemptId: string; userId?: string; key: VersionedKey; ttlSeconds: number; now?: Date }
) {
  const token = randomBytes(32).toString("base64url");
  const now = input.now ?? new Date();
  const session = await db.$transaction(async (tx) => {
    const created = await tx.onboardingSession.create({
      data: {
        onboarding_attempt_id: input.attemptId,
        user_id: input.userId,
        token_digest: onboardingSessionDigest(token, input.key),
        token_key_version: input.key.version,
        expires_at: new Date(now.getTime() + input.ttlSeconds * 1000)
      }
    });
    await auditEvent(tx, { action: AuditAction.onboarding_session_created, entityType: "OnboardingSession", entityId: created.id });
    return created;
  });
  return { session, token };
}

export async function consumeOnboardingSession(
  db: PrismaClient,
  input: { token: string; key: VersionedKey; now?: Date }
) {
  const now = input.now ?? new Date();
  const digest = onboardingSessionDigest(input.token, input.key);
  const consumed = await db.onboardingSession.updateMany({
    where: {
      token_digest: digest,
      token_key_version: input.key.version,
      consumed_at: null,
      revoked_at: null,
      expires_at: { gt: now }
    },
    data: { consumed_at: now, last_used_at: now }
  });
  return consumed.count === 1;
}

export async function revokeOnboardingSessions(
  db: PrismaClient,
  input: { attemptId?: string; userId?: string; reason: string; now?: Date }
) {
  if (!input.attemptId && !input.userId) throw new Error("onboarding_session_subject_required");
  const now = input.now ?? new Date();
  const sessions = await db.onboardingSession.findMany({
    where: {
      ...(input.attemptId ? { onboarding_attempt_id: input.attemptId } : {}),
      ...(input.userId ? { user_id: input.userId } : {}),
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
        metadata: { reason: input.reason }
      });
    }
  });
  return sessions.length;
}
