import { randomInt, randomUUID } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client.js";
import { otpCodeDigest, keyedDigestMatches, type VersionedKey } from "./keyedDigest.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { auditEvent } from "./audit.js";

export type OtpDeliveryResult =
  | { status: "accepted"; providerMessageId: string }
  | { status: "rejected" | "unknown"; providerMessageId?: string };

export interface OtpProvider {
  readonly name: string;
  send(input: { phoneE164: string; code: string; locale: "ar" | "en"; expiresAt: Date; idempotencyKey: string }): Promise<OtpDeliveryResult>;
}

export class FakeOtpProvider implements OtpProvider {
  readonly name = "fake";
  readonly outbox = new Map<string, string>();
  constructor(private readonly result: "accepted" | "rejected" | "unknown" = "accepted") {}

  async send(input: { phoneE164: string; code: string }): Promise<OtpDeliveryResult> {
    if (this.result !== "accepted") return { status: this.result };
    const id = randomUUID();
    this.outbox.set(id, input.code);
    return { status: "accepted", providerMessageId: id };
  }
}

export function generateOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function dispatchOtpChallenge(
  db: PrismaClient,
  provider: OtpProvider,
  input: { attemptId: string; key: VersionedKey; ttlSeconds: number; maxAttempts: number; maxResends?: number; resendCooldownSeconds?: number; locale?: "ar" | "en"; requestId?: string; now?: Date }
) {
  const now = input.now ?? new Date();
  const attempt = await db.onboardingAttempt.findUniqueOrThrow({ where: { id: input.attemptId } });
  const latest = await db.otpChallenge.findFirst({
    where: { onboarding_attempt_id: attempt.id },
    orderBy: { generation: "desc" },
    select: { generation: true, created_at: true, delivery_status: true }
  });
  if (input.maxResends !== undefined && (latest?.generation ?? 0) >= input.maxResends + 1) throw new Error("otp_resend_limit");
  if (
    latest?.delivery_status === "accepted" &&
    input.resendCooldownSeconds &&
    latest.created_at.getTime() + input.resendCooldownSeconds * 1000 > now.getTime()
  ) throw new Error("otp_resend_cooldown");
  const code = generateOtpCode();
  const challengeId = randomUUID();
  const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000);
  const challenge = await db.otpChallenge.create({
    data: {
      id: challengeId,
      onboarding_attempt_id: attempt.id,
      generation: (latest?.generation ?? 0) + 1,
      provider: provider.name,
      code_digest: otpCodeDigest(challengeId, code, input.key),
      code_key_version: input.key.version,
      max_attempts: input.maxAttempts,
      expires_at: expiresAt,
      delivery_updated_at: now,
      request_id: input.requestId
    }
  });
  await auditEvent(db, {
    action: AuditAction.otp_challenge_created,
    entityType: "OtpChallenge",
    entityId: challenge.id,
    metadata: { provider: provider.name, request_id: input.requestId ?? null }
  });
  await db.onboardingAttempt.update({ where: { id: attempt.id }, data: { status: "otp_dispatching" } });

  let delivery: OtpDeliveryResult;
  try {
    delivery = await provider.send({
      phoneE164: attempt.phone_e164,
      code,
      locale: input.locale ?? "ar",
      expiresAt,
      idempotencyKey: challenge.id
    });
  } catch {
    delivery = { status: "unknown" };
  }

  if (delivery.status !== "accepted") {
    await db.$transaction([
      db.otpChallenge.update({ where: { id: challenge.id }, data: { delivery_status: delivery.status, delivery_updated_at: new Date() } }),
      db.onboardingAttempt.update({
        where: { id: attempt.id },
        data: { status: attempt.current_challenge_id ? "otp_sent" : "created" }
      })
    ]);
    await auditEvent(db, {
      action: AuditAction.otp_dispatch_rejected,
      entityType: "OtpChallenge",
      entityId: challenge.id,
      metadata: { provider: provider.name, delivery_status: delivery.status, request_id: input.requestId ?? null }
    });
    return { accepted: false as const, challengeId: challenge.id, deliveryStatus: delivery.status };
  }

  await db.$transaction(async (tx) => {
    await tx.otpChallenge.updateMany({
      where: { onboarding_attempt_id: attempt.id, id: { not: challenge.id }, superseded_at: null, consumed_at: null },
      data: { superseded_at: now }
    });
    await tx.otpChallenge.update({
      where: { id: challenge.id },
      data: { delivery_status: "accepted", provider_message_id: delivery.providerMessageId, last_sent_at: now, delivery_updated_at: now }
    });
    await tx.onboardingAttempt.update({
      where: { id: attempt.id },
      data: { current_challenge_id: challenge.id, status: "otp_sent" }
    });
    await auditEvent(tx, {
      action: AuditAction.otp_dispatch_accepted,
      entityType: "OtpChallenge",
      entityId: challenge.id,
      metadata: { provider: provider.name, request_id: input.requestId ?? null }
    });
  });
  return { accepted: true as const, challengeId: challenge.id, deliveryStatus: delivery.status };
}

export async function verifyOtpChallenge(
  db: PrismaClient,
  input: { attemptId: string; code: string; key: VersionedKey; now?: Date }
) {
  const now = input.now ?? new Date();
  const attempt = await db.onboardingAttempt.findUnique({
    where: { id: input.attemptId },
    include: { current_challenge: true }
  });
  const challenge = attempt?.current_challenge;
  if (
    !attempt ||
    !challenge ||
    challenge.delivery_status !== "accepted" ||
    challenge.superseded_at ||
    challenge.consumed_at ||
    challenge.expires_at <= now ||
    challenge.attempt_count >= challenge.max_attempts ||
    challenge.code_key_version !== input.key.version
  ) return { verified: false as const, reason: "unavailable" as const };

  const matches = keyedDigestMatches(challenge.code_digest, `masari:otp:${challenge.id}`, input.code, input.key);
  if (!matches) {
    const incremented = await db.otpChallenge.updateMany({
      where: { id: challenge.id, consumed_at: null, superseded_at: null, attempt_count: { lt: challenge.max_attempts } },
      data: { attempt_count: { increment: 1 } }
    });
    if (incremented.count === 1) {
      const current = await db.otpChallenge.findUniqueOrThrow({ where: { id: challenge.id } });
      if (current.attempt_count >= current.max_attempts) {
        await db.$transaction([
          db.otpChallenge.update({ where: { id: challenge.id }, data: { locked_until: challenge.expires_at } }),
          db.onboardingAttempt.updateMany({ where: { id: attempt.id, current_challenge_id: challenge.id }, data: { status: "locked" } })
        ]);
      }
    }
    await auditEvent(db, {
      action: AuditAction.otp_verification_failed,
      entityType: "OtpChallenge",
      entityId: challenge.id,
      metadata: { reason: "invalid" }
    });
    return { verified: false as const, reason: "invalid" as const };
  }

  const consumed = await db.otpChallenge.updateMany({
    where: { id: challenge.id, consumed_at: null, superseded_at: null, attempt_count: { lt: challenge.max_attempts }, expires_at: { gt: now } },
    data: { consumed_at: now, attempt_count: { increment: 1 } }
  });
  if (consumed.count !== 1) return { verified: false as const, reason: "unavailable" as const };
  await db.onboardingAttempt.updateMany({
    where: { id: attempt.id, current_challenge_id: challenge.id },
    data: { status: "phone_verified", verified_at: now }
  });
  await auditEvent(db, { action: AuditAction.otp_verified, entityType: "OtpChallenge", entityId: challenge.id });
  return { verified: true as const };
}
