import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import {
  createRefreshToken,
  isRefreshTokenRole,
  parseRefreshToken,
  refreshTokenExpiresAt,
  refreshTokenHashMatches,
  revokeAllUserSessions,
  revokeSessionRecords
} from "../lib/refreshTokens.js";
import {
  requireAuth,
  requireLogoutAuth,
  signAuthToken,
  type AuthUser,
  type AuthenticatedRequest
} from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AuditAction, Prisma } from "../generated/prisma/client.js";
import { normalizePhoneToE164 } from "../lib/phone.js";

const loginSchema = z.object({
  phone: z.string().min(5),
  region: z.literal("PS").optional(),
  password: z.string().min(1),
  device_name: z.string().trim().min(1).max(120).optional()
});
const refreshSchema = z.object({ refresh_token: z.string().min(1).max(160) });

function publicUser(user: {
  id: string;
  name: string;
  phone: string;
  role: string;
  account_status: string;
  demo_account: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    account_status: user.account_status,
    demo_account: user.demo_account
  };
}

function safeSession(
  session: {
    id: string;
    client_type: string;
    device_name: string | null;
    created_at: Date;
    last_used_at: Date;
    expires_at: Date;
    revoked_at: Date | null;
  },
  currentSessionId?: string
) {
  return {
    id: session.id,
    client_type: session.client_type,
    device_name: session.device_name,
    created_at: session.created_at,
    last_used_at: session.last_used_at,
    expires_at: session.expires_at,
    is_current: session.id === currentSessionId,
    revoked: session.revoked_at !== null
  };
}

function accessToken(user: { id: string; role: AuthUser["role"]; security_version: number }, sessionId: string) {
  return signAuthToken({
    id: user.id,
    role: user.role,
    sessionId,
    securityVersion: user.security_version
  });
}

function refreshFailure(status: number, error: string): never {
  throw new HttpError(status, error);
}

async function markRefreshReuse(
  tx: Prisma.TransactionClient,
  input: { sessionId: string; userId: string }
) {
  await revokeSessionRecords(tx, { sessionId: input.sessionId, reason: "refresh_token_reuse" });
  await auditEvent(tx, {
    userId: input.userId,
    action: AuditAction.refresh_token_reuse_detected,
    entityType: "AuthSession",
    entityId: input.sessionId,
    metadata: { detection: "used_refresh_token" }
  });
}

export const authRouter = Router();

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    let phone: string;
    try {
      phone = normalizePhoneToE164(input.phone, { region: input.region });
    } catch {
      throw new HttpError(401, "invalid_credentials");
    }
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw new HttpError(401, "invalid_credentials");

    const validPassword = await bcrypt.compare(input.password, user.password_hash);
    if (!validPassword) throw new HttpError(401, "invalid_credentials");
    if (user.account_status !== "active") {
      await auditEvent(prisma, {
        userId: user.id,
        action: AuditAction.login_blocked_by_status,
        entityType: "User",
        entityId: user.id,
        metadata: { account_status: user.account_status }
      });
      throw new HttpError(403, "account_unavailable");
    }

    const now = new Date();
    const refreshMaterial = isRefreshTokenRole(user.role) ? createRefreshToken(user.role) : null;
    const clientType = refreshMaterial ? "mobile" : "admin";
    const refreshExpiresAt = refreshMaterial ? refreshTokenExpiresAt(now) : null;
    const sessionExpiresAt =
      refreshExpiresAt ?? new Date(now.getTime() + config.accessTokenTtlSeconds * 1_000);

    const result = await prisma.$transaction(async (tx) => {
      const eligible = await tx.user.updateMany({
        where: {
          id: user.id,
          role: user.role,
          account_status: "active",
          security_version: user.security_version
        },
        data: { last_login_at: now }
      });
      if (eligible.count !== 1) return { kind: "account_unavailable" } as const;

      const created = await tx.authSession.create({
        data: {
          user_id: user.id,
          client_type: clientType,
          device_name: input.device_name?.replace(/\s+/g, " "),
          created_at: now,
          last_used_at: now,
          expires_at: sessionExpiresAt,
          security_version_at_issue: user.security_version
        }
      });
      if (refreshMaterial && refreshExpiresAt) {
        await tx.refreshToken.create({
          data: {
            id: refreshMaterial.id,
            session_id: created.id,
            token_hash: refreshMaterial.tokenHash,
            created_at: now,
            expires_at: refreshExpiresAt
          }
        });
      }
      await auditEvent(tx, {
        userId: user.id,
        action: AuditAction.auth_login,
        entityType: "User",
        entityId: user.id,
        metadata: { role: user.role, demo_account: user.demo_account }
      });
      await auditEvent(tx, {
        userId: user.id,
        action: AuditAction.session_created,
        entityType: "AuthSession",
        entityId: created.id,
        metadata: { client_type: clientType }
      });
      const token = accessToken(user, created.id);
      return { kind: "success", session: created, token } as const;
    });

    if (result.kind === "account_unavailable") {
      await auditEvent(prisma, {
        userId: user.id,
        action: AuditAction.login_blocked_by_status,
        entityType: "User",
        entityId: user.id,
        metadata: { account_status: "changed_during_login" }
      });
      throw new HttpError(403, "account_unavailable");
    }

    res.json({
      token: result.token,
      access_token: result.token,
      access_token_expires_in: config.accessTokenTtlSeconds,
      ...(refreshMaterial
        ? {
            refresh_token: refreshMaterial.rawToken,
            refresh_token_expires_in: config.refreshTokenTtlDays * 24 * 60 * 60
          }
        : {}),
      session: safeSession(result.session, result.session.id),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/refresh", async (req, res, next) => {
  try {
    const input = refreshSchema.parse(req.body);
    const parsed = parseRefreshToken(input.refresh_token);
    if (!parsed) refreshFailure(401, "invalid_refresh_token");

    const now = new Date();
    const result = await prisma.$transaction(
      async (tx) => {
        const current = await tx.refreshToken.findUnique({
          where: { id: parsed.id },
          include: { session: { include: { user: true } } }
        });
        if (!current || !refreshTokenHashMatches(parsed.rawToken, current.token_hash)) {
          return { kind: "invalid" } as const;
        }
        if (
          current.session.client_type !== "mobile" ||
          current.session.user.role === "admin" ||
          current.session.user.role !== parsed.roleAtIssue
        ) {
          await revokeSessionRecords(tx, {
            sessionId: current.session_id,
            reason: "refresh_role_or_client_changed",
            now
          });
          await auditEvent(tx, {
            userId: current.session.user_id,
            action: AuditAction.session_revoked,
            entityType: "AuthSession",
            entityId: current.session_id,
            metadata: { reason: "refresh_role_or_client_changed" }
          });
          return { kind: "invalid_session" } as const;
        }
        if (current.used_at) {
          await markRefreshReuse(tx, {
            sessionId: current.session_id,
            userId: current.session.user_id
          });
          return { kind: "reused" } as const;
        }
        if (current.revoked_at || current.expires_at.getTime() <= now.getTime()) return { kind: "invalid" } as const;
        if (current.session.revoked_at) return { kind: "session_revoked" } as const;
        if (current.session.expires_at.getTime() <= now.getTime()) return { kind: "session_expired" } as const;
        if (current.session.user.account_status !== "active") return { kind: "account_unavailable" } as const;
        if (
          current.session.security_version_at_issue !== current.session.user.security_version
        ) return { kind: "invalid_session" } as const;

        const replacement = createRefreshToken(parsed.roleAtIssue);
        const configuredReplacementExpiry = refreshTokenExpiresAt(now);
        const replacementExpiresAt = new Date(
          Math.min(configuredReplacementExpiry.getTime(), current.session.expires_at.getTime())
        );

        const consumed = await tx.refreshToken.updateMany({
          where: { id: current.id, used_at: null, revoked_at: null, expires_at: { gt: now } },
          data: { used_at: now }
        });
        if (consumed.count !== 1) {
          const raced = await tx.refreshToken.findUnique({ where: { id: current.id } });
          if (raced?.used_at) {
            await markRefreshReuse(tx, {
              sessionId: current.session_id,
              userId: current.session.user_id
            });
            return { kind: "reused" } as const;
          }
          return { kind: "invalid" } as const;
        }

        await tx.refreshToken.create({
          data: {
            id: replacement.id,
            session_id: current.session_id,
            token_hash: replacement.tokenHash,
            created_at: now,
            expires_at: replacementExpiresAt
          }
        });
        await tx.refreshToken.update({
          where: { id: current.id },
          data: { replaced_by_id: replacement.id }
        });
        const session = await tx.authSession.update({
          where: { id: current.session_id },
          data: { last_used_at: now }
        });
        await auditEvent(tx, {
          userId: current.session.user_id,
          action: AuditAction.session_refreshed,
          entityType: "AuthSession",
          entityId: current.session_id,
          metadata: { rotation: "one_time" }
        });
        const token = accessToken(current.session.user, session.id);
        return {
          kind: "success",
          session,
          user: current.session.user,
          token,
          refreshToken: replacement.rawToken,
          refreshTokenExpiresIn: Math.max(0, Math.floor((replacementExpiresAt.getTime() - now.getTime()) / 1_000))
        } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    );

    if (result.kind === "invalid") refreshFailure(401, "invalid_refresh_token");
    if (result.kind === "reused") refreshFailure(401, "refresh_token_reused");
    if (result.kind === "session_revoked") refreshFailure(401, "session_revoked");
    if (result.kind === "session_expired") refreshFailure(401, "session_expired");
    if (result.kind === "account_unavailable") refreshFailure(403, "account_unavailable");
    if (result.kind === "invalid_session") refreshFailure(401, "invalid_session");

    res.json({
      token: result.token,
      access_token: result.token,
      access_token_expires_in: config.accessTokenTtlSeconds,
      refresh_token: result.refreshToken,
      refresh_token_expires_in: result.refreshTokenExpiresIn,
      session: safeSession(result.session, result.session.id),
      user: publicUser(result.user)
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(404, "user_not_found");
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/auth/sessions", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const sessions = await prisma.authSession.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: "desc" }
    });
    res.json({ sessions: sessions.map((session) => safeSession(session, req.user!.sessionId)) });
  } catch (error) {
    next(error);
  }
});

authRouter.delete("/auth/sessions/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const session = await prisma.authSession.findFirst({ where: { id, user_id: req.user!.id } });
    if (!session) throw new HttpError(404, "session_not_found");
    await prisma.$transaction(async (tx) => {
      await revokeSessionRecords(tx, { sessionId: session.id, reason: "user_revoked" });
      if (!session.revoked_at) {
        await auditEvent(tx, {
          userId: req.user!.id,
          action: AuditAction.session_revoked,
          entityType: "AuthSession",
          entityId: session.id,
          metadata: { current: session.id === req.user!.sessionId }
        });
      }
    });
    res.json({ ok: true, session: { id: session.id, revoked: true } });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/logout", requireLogoutAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const session = await prisma.authSession.findUnique({ where: { id: req.user!.sessionId } });
    await prisma.$transaction(async (tx) => {
      await revokeSessionRecords(tx, { sessionId: req.user!.sessionId, reason: "logout" });
      if (session && !session.revoked_at) {
        await auditEvent(tx, {
          userId: req.user!.id,
          action: AuditAction.session_revoked,
          entityType: "AuthSession",
          entityId: req.user!.sessionId,
          metadata: { source: "logout" }
        });
      }
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/logout-all", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      await revokeAllUserSessions(tx, { userId: req.user!.id, reason: "logout_all" });
      await tx.user.update({ where: { id: req.user!.id }, data: { security_version: { increment: 1 } } });
      await auditEvent(tx, {
        userId: req.user!.id,
        action: AuditAction.logout_all,
        entityType: "User",
        entityId: req.user!.id,
        metadata: { request_id: req.requestId }
      });
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
