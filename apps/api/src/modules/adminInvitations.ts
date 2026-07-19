import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { AuditAction, OnboardingRole } from "../generated/prisma/enums.js";
import { consumeAbuseCounter } from "../lib/abuseCounters.js";
import { auditEvent } from "../lib/audit.js";
import { abuseSubjectDigest } from "../lib/keyedDigest.js";
import { createInvitation } from "../lib/invitations.js";
import { normalizePhoneToE164 } from "../lib/phone.js";
import { phoneDigest } from "../lib/keyedDigest.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";

const cleanOptional = (maximum: number) =>
  z.string().trim().min(1).max(maximum).regex(/^[^\u0000-\u001f\u007f]+$/).optional();

const createSchema = z.strictObject({
  role: z.enum([OnboardingRole.passenger, OnboardingRole.driver, OnboardingRole.merchant]),
  phone: z.string().trim().min(7).max(32),
  region: z.literal("PS"),
  campaign: cleanOptional(100),
  source: cleanOptional(100),
  expires_in_days: z.number().int().min(1).max(30).optional()
});

const listSchema = z.object({
  status: z.enum(["unused", "used", "expired", "revoked"]).optional(),
  role: z.enum([OnboardingRole.passenger, OnboardingRole.driver, OnboardingRole.merchant]).optional(),
  campaign: cleanOptional(100),
  source: cleanOptional(100),
  phone: z.string().trim().min(7).max(32).optional(),
  region: z.literal("PS").optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25)
});

const revokeSchema = z.object({
  reason: z.string().trim().min(3).max(500).regex(/^[^\u0000-\u001f\u007f]+$/)
});

function invitationStatus(invitation: { used_count: number; revoked_at: Date | null; expires_at: Date }, now = new Date()) {
  if (invitation.revoked_at) return "revoked";
  if (invitation.used_count > 0) return "used";
  if (invitation.expires_at <= now) return "expired";
  return "unused";
}

function serializeInvitation(invitation: {
  id: string;
  intended_role: string;
  phone_last4: string | null;
  campaign: string | null;
  source: string | null;
  max_uses: number;
  used_count: number;
  expires_at: Date;
  revoked_at: Date | null;
  revoke_reason: string | null;
  created_by_id: string;
  revoked_by_id: string | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: invitation.id,
    role: invitation.intended_role,
    phone: invitation.phone_last4 ? `+970 ••• •• ${invitation.phone_last4}` : null,
    campaign: invitation.campaign,
    source: invitation.source,
    max_uses: invitation.max_uses,
    used_count: invitation.used_count,
    status: invitationStatus(invitation),
    expires_at: invitation.expires_at,
    revoked_at: invitation.revoked_at,
    revoke_reason: invitation.revoke_reason,
    created_by_id: invitation.created_by_id,
    revoked_by_id: invitation.revoked_by_id,
    created_at: invitation.created_at,
    updated_at: invitation.updated_at
  };
}

export function createAdminInvitationRouter(appConfig: AppConfig) {
  const onboarding = appConfig.onboarding;
  if (!appConfig.invitationsEnabled || !onboarding) throw new Error("invitation_router_requires_enabled_configuration");
  const router = Router();
  router.use("/admin/invitations", requireAuth, requireRole("admin"));

  router.post("/admin/invitations", async (req: AuthenticatedRequest, res, next) => {
    try {
      const input = createSchema.parse(req.body);
      const abuseKey = onboarding.keys.abuse;
      const rate = await consumeAbuseCounter(prisma, {
        bucketType: "admin_invitation_create",
        subjectDigest: abuseSubjectDigest("admin_invitation_create", req.user!.id, abuseKey),
        digestVersion: abuseKey.version,
        windowSeconds: 3_600,
        limit: onboarding.adminInvitationMaxPerHour
      });
      if (!rate.allowed) throw new HttpError(429, "invitation_rate_limit_exceeded");

      const expiresInDays = input.expires_in_days ?? onboarding.invitationExpiryDays;
      const result = await prisma.$transaction(async (tx) => {
        const created = await createInvitation(tx, {
          createdById: req.user!.id,
          intendedRole: input.role,
          intendedPhone: input.phone,
          phoneRegion: input.region,
          campaign: input.campaign,
          source: input.source,
          expiresAt: new Date(Date.now() + expiresInDays * 86_400_000),
          keys: { code: onboarding.keys.invitationCode, phone: onboarding.keys.phoneDigest }
        });
        await auditEvent(tx, {
          userId: req.user!.id,
          action: AuditAction.invitation_created,
          entityType: "Invitation",
          entityId: created.invitation.id,
          metadata: { intended_role: input.role, request_id: req.requestId }
        });
        return created;
      });
      res.status(201).json({ invitation: serializeInvitation(result.invitation), code: result.code });
    } catch (error) {
      next(error instanceof Error && error.name === "PhoneNormalizationError" ? new HttpError(400, "invalid_phone") : error);
    }
  });

  router.get("/admin/invitations", async (req, res, next) => {
    try {
      const input = listSchema.parse(req.query);
      const now = new Date();
      if (input.phone && !input.region) throw new HttpError(400, "phone_region_required");
      const exactPhoneDigest = input.phone
        ? phoneDigest(normalizePhoneToE164(input.phone, { region: input.region }), onboarding.keys.phoneDigest)
        : undefined;
      const statusWhere =
        input.status === "revoked" ? { revoked_at: { not: null } } :
        input.status === "used" ? { used_count: { gt: 0 } } :
        input.status === "expired" ? { revoked_at: null, used_count: 0, expires_at: { lte: now } } :
        input.status === "unused" ? { revoked_at: null, used_count: 0, expires_at: { gt: now } } : {};
      const where = {
        ...statusWhere,
        ...(input.role ? { intended_role: input.role } : {}),
        ...(input.campaign ? { campaign: input.campaign } : {}),
        ...(input.source ? { source: input.source } : {}),
        ...(exactPhoneDigest ? { intended_phone_digest: exactPhoneDigest, phone_digest_version: onboarding.keys.phoneDigest.version } : {})
      };
      const [invitations, total] = await Promise.all([
        prisma.invitation.findMany({ where, orderBy: [{ created_at: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.limit, take: input.limit }),
        prisma.invitation.count({ where })
      ]);
      res.json({ invitations: invitations.map(serializeInvitation), page: input.page, limit: input.limit, total });
    } catch (error) {
      next(error instanceof Error && error.name === "PhoneNormalizationError" ? new HttpError(400, "invalid_phone") : error);
    }
  });

  router.post("/admin/invitations/:id/revoke", async (req: AuthenticatedRequest, res, next) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = revokeSchema.parse(req.body);
      const invitation = await prisma.$transaction(async (tx) => {
        const current = await tx.invitation.findUnique({ where: { id } });
        if (!current) throw new HttpError(404, "invitation_not_found");
        if (current.revoked_at) return current;
        if (current.used_count > 0) throw new HttpError(409, "invitation_not_revocable");
        const updated = await tx.invitation.updateMany({
          where: { id, revoked_at: null, used_count: 0 },
          data: { revoked_at: new Date(), revoked_by_id: req.user!.id, revoke_reason: input.reason }
        });
        if (updated.count !== 1) {
          throw new HttpError(409, "invitation_revoke_conflict");
        }
        const result = await tx.invitation.findUniqueOrThrow({ where: { id } });
        await auditEvent(tx, {
          userId: req.user!.id,
          action: AuditAction.invitation_revoked,
          entityType: "Invitation",
          entityId: id,
          metadata: { request_id: req.requestId }
        });
        return result;
      });
      res.json({ invitation: serializeInvitation(invitation) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
