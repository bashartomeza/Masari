import type { PrismaClient } from "../generated/prisma/client.js";
import type { OnboardingRole } from "../generated/prisma/enums.js";
import { AuditAction } from "../generated/prisma/enums.js";
import { auditEvent } from "./audit.js";
import { phoneDigest, type VersionedKey } from "./keyedDigest.js";
import { normalizePhoneToE164, phoneLast4 } from "./phone.js";

export async function createOnboardingAttempt(
  db: PrismaClient,
  input: {
    invitationId: string;
    intendedRole: OnboardingRole;
    phone: string;
    region?: "PS";
    phoneKey: VersionedKey;
    expiresAt: Date;
    requestIpDigest?: string;
    requestIpDigestVersion?: number;
    requestId?: string;
  }
) {
  const phoneE164 = normalizePhoneToE164(input.phone, { region: input.region });
  return db.$transaction(async (tx) => {
    const attempt = await tx.onboardingAttempt.create({
      data: {
        invitation_id: input.invitationId,
        intended_role: input.intendedRole,
        phone_e164: phoneE164,
        phone_digest: phoneDigest(phoneE164, input.phoneKey),
        phone_digest_version: input.phoneKey.version,
        phone_last4: phoneLast4(phoneE164),
        request_ip_digest: input.requestIpDigest,
        request_ip_digest_version: input.requestIpDigestVersion,
        created_request_id: input.requestId,
        expires_at: input.expiresAt
      }
    });
    await auditEvent(tx, {
      action: AuditAction.onboarding_attempt_created,
      entityType: "OnboardingAttempt",
      entityId: attempt.id,
      metadata: { invitation_id: input.invitationId, intended_role: input.intendedRole, request_id: input.requestId ?? null }
    });
    return attempt;
  });
}
