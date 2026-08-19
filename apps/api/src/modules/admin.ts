import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { revokeAllUserSessions } from "../lib/refreshTokens.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AccountStatus, AuditAction, DriverVerificationStatus } from "../generated/prisma/enums.js";
import { Prisma } from "../generated/prisma/client.js";

export const adminRouter = Router();

const safeUserSelect = {
  id: true,
  name: true,
  phone: true,
  role: true,
  account_status: true,
  status_reason: true,
  status_updated_at: true,
  last_login_at: true,
  demo_account: true,
  created_at: true
} as const;

function serializeSafeUser(user: {
  id: string;
  name: string;
  phone: string;
  role: string;
  account_status: string;
  status_reason: string | null;
  status_updated_at: Date;
  last_login_at: Date | null;
  demo_account: boolean;
  created_at: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    account_status: user.account_status,
    status_reason: user.status_reason,
    status_updated_at: user.status_updated_at,
    last_login_at: user.last_login_at,
    demo_account: user.demo_account,
    created_at: user.created_at
  };
}

const driverVerificationInclude = {
  user: { select: { ...safeUserSelect, driver_profile: true } },
  reviewed_by: { select: { id: true, name: true } }
} as const;

type DriverVerificationRecord = Prisma.DriverVerificationGetPayload<{
  include: typeof driverVerificationInclude;
}>;

function serializeDriverVerification(verification: DriverVerificationRecord) {
  const { driver_profile: driverProfile, ...candidate } = verification.user;
  return {
    id: verification.id,
    revision: verification.revision,
    status: verification.status,
    rejection_reason: verification.rejection_reason,
    submitted_at: verification.submitted_at,
    reviewed_at: verification.reviewed_at,
    reviewer: verification.reviewed_by,
    candidate: serializeSafeUser(candidate),
    driver_profile: driverProfile,
    evidence: { status: "not_collected" as const }
  };
}

const verificationListSchema = z.object({
  status: z
    .enum([
      DriverVerificationStatus.pending,
      DriverVerificationStatus.approved,
      DriverVerificationStatus.rejected
    ])
    .default(DriverVerificationStatus.pending),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

const profileInputSchema = z.object({
  vehicle_type: z
    .string()
    .min(2)
    .max(80)
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .refine((value) => value.length >= 2 && !/[\u0000-\u001f\u007f]/.test(value), "Invalid value"),
  seats_total: z.number().int().min(1).max(8),
  parcel_capacity: z.number().int().min(0).max(20)
});

const approveVerificationSchema = z.object({
  expected_revision: z.number().int().min(1),
  profile: profileInputSchema.optional()
});

const rejectVerificationSchema = z.object({
  expected_revision: z.number().int().min(1),
  reason: z
    .string()
    .min(3)
    .max(500)
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .refine((value) => value.length >= 3 && !/[\u0000-\u001f\u007f]/.test(value), "Invalid value")
});

function requestParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

adminRouter.use("/admin", requireAuth, requireRole("admin"));

adminRouter.get("/admin/driver-verifications", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = verificationListSchema.parse(req.query);
    const where = { status: input.status };
    const [verifications, total] = await Promise.all([
      prisma.driverVerification.findMany({
        where,
        include: driverVerificationInclude,
        orderBy: [{ submitted_at: "asc" }, { id: "asc" }],
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      prisma.driverVerification.count({ where })
    ]);
    res.json({
      verifications: verifications.map(serializeDriverVerification),
      page: input.page,
      limit: input.limit,
      total
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/admin/driver-verifications/:userId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = requestParam(req.params.userId);
    const verification = await prisma.driverVerification.findUnique({
      where: { user_id: userId },
      include: driverVerificationInclude
    });
    if (!verification) throw new HttpError(404, "driver_verification_not_found");
    res.json({ verification: serializeDriverVerification(verification) });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/admin/driver-verifications/:userId/approve", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = requestParam(req.params.userId);
    const input = approveVerificationSchema.parse(req.body);
    const result = await prisma.$transaction(
      async (tx) => {
        const current = await tx.driverVerification.findUnique({
          where: { user_id: userId },
          include: driverVerificationInclude
        });
        if (!current) throw new HttpError(404, "driver_verification_not_found");
        if (current.user.role !== "driver") throw new HttpError(409, "driver_verification_role_conflict");
        if (current.user.account_status !== AccountStatus.pending && current.user.account_status !== AccountStatus.active) {
          throw new HttpError(409, "driver_account_status_conflict");
        }
        if (current.status !== DriverVerificationStatus.pending || current.revision !== input.expected_revision) {
          throw new HttpError(409, "driver_verification_state_conflict");
        }
        if (!current.user.driver_profile && !input.profile) throw new HttpError(400, "driver_profile_required");
        if (current.user.driver_profile && input.profile) throw new HttpError(409, "driver_profile_already_exists");

        const now = new Date();
        const transitioned = await tx.driverVerification.updateMany({
          where: {
            id: current.id,
            status: DriverVerificationStatus.pending,
            revision: input.expected_revision
          },
          data: {
            status: DriverVerificationStatus.approved,
            rejection_reason: null,
            reviewed_at: now,
            reviewed_by_id: req.user!.id,
            revision: { increment: 1 }
          }
        });
        if (transitioned.count !== 1) throw new HttpError(409, "driver_verification_state_conflict");

        if (current.user.driver_profile) {
          await tx.driverProfile.update({ where: { id: current.user.driver_profile.id }, data: { verified: true } });
        } else {
          await tx.driverProfile.create({
            data: {
              user_id: current.user_id,
              vehicle_type: input.profile!.vehicle_type,
              seats_total: input.profile!.seats_total,
              parcel_capacity: input.profile!.parcel_capacity,
              verified: true
            }
          });
        }
        if (current.user.account_status === AccountStatus.pending) {
          await tx.user.update({
            where: { id: current.user_id },
            data: { account_status: AccountStatus.active, status_reason: null, status_updated_at: now }
          });
        }
        await auditEvent(tx, {
          userId: req.user!.id,
          action: AuditAction.admin_action,
          entityType: "DriverVerification",
          entityId: current.id,
          metadata: {
            action: "driver_verification_approved",
            target_user_id: current.user_id,
            previous_status: current.status,
            new_status: DriverVerificationStatus.approved,
            previous_revision: current.revision,
            request_id: req.requestId
          }
        });
        return tx.driverVerification.findUniqueOrThrow({
          where: { id: current.id },
          include: driverVerificationInclude
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    res.json({ verification: serializeDriverVerification(result) });
  } catch (error) {
    next(isTransactionWriteConflict(error) ? new HttpError(409, "driver_verification_state_conflict") : error);
  }
});

adminRouter.post("/admin/driver-verifications/:userId/reject", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = requestParam(req.params.userId);
    const input = rejectVerificationSchema.parse(req.body);
    const result = await prisma.$transaction(
      async (tx) => {
        const current = await tx.driverVerification.findUnique({
          where: { user_id: userId },
          include: driverVerificationInclude
        });
        if (!current) throw new HttpError(404, "driver_verification_not_found");
        if (current.user.role !== "driver") throw new HttpError(409, "driver_verification_role_conflict");
        if (current.status !== DriverVerificationStatus.pending || current.revision !== input.expected_revision) {
          throw new HttpError(409, "driver_verification_state_conflict");
        }

        const now = new Date();
        const transitioned = await tx.driverVerification.updateMany({
          where: {
            id: current.id,
            status: DriverVerificationStatus.pending,
            revision: input.expected_revision
          },
          data: {
            status: DriverVerificationStatus.rejected,
            rejection_reason: input.reason,
            reviewed_at: now,
            reviewed_by_id: req.user!.id,
            revision: { increment: 1 }
          }
        });
        if (transitioned.count !== 1) throw new HttpError(409, "driver_verification_state_conflict");
        if (current.user.driver_profile) {
          await tx.driverProfile.update({ where: { id: current.user.driver_profile.id }, data: { verified: false } });
        }
        await auditEvent(tx, {
          userId: req.user!.id,
          action: AuditAction.admin_action,
          entityType: "DriverVerification",
          entityId: current.id,
          metadata: {
            action: "driver_verification_rejected",
            target_user_id: current.user_id,
            previous_status: current.status,
            new_status: DriverVerificationStatus.rejected,
            reason: input.reason,
            previous_revision: current.revision,
            request_id: req.requestId
          }
        });
        return tx.driverVerification.findUniqueOrThrow({
          where: { id: current.id },
          include: driverVerificationInclude
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    res.json({ verification: serializeDriverVerification(result) });
  } catch (error) {
    next(isTransactionWriteConflict(error) ? new HttpError(409, "driver_verification_state_conflict") : error);
  }
});

const accountStatusSchema = z
  .object({
    status: z.enum([AccountStatus.active, AccountStatus.suspended, AccountStatus.disabled]),
    reason: z
      .string()
      .max(500)
      .transform((value) => value.trim().replace(/\s+/g, " "))
      .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Invalid value")
      .optional()
  })
  .superRefine((value, context) => {
    if (value.status !== AccountStatus.active && (!value.reason || value.reason.length < 3)) {
      context.addIssue({ code: "custom", path: ["reason"], message: "Invalid value" });
    }
  });

function isTransactionWriteConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2034");
}

adminRouter.patch("/admin/users/:id/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const input = accountStatusSchema.parse(req.body);
    if (targetId === req.user!.id && input.status !== AccountStatus.active) {
      throw new HttpError(409, "cannot_suspend_current_admin");
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id: targetId }, select: safeUserSelect });
        if (!target) throw new HttpError(404, "user_not_found");
        if (target.account_status === input.status) return target;

        if (target.role === "admin" && input.status !== AccountStatus.active) {
          const otherActiveAdmins = await tx.user.count({
            where: { role: "admin", account_status: AccountStatus.active, id: { not: target.id } }
          });
          if (otherActiveAdmins === 0) throw new HttpError(409, "last_active_admin_required");
        }

        const now = new Date();
        if (input.status !== AccountStatus.active) {
          await revokeAllUserSessions(tx, { userId: target.id, reason: `account_${input.status}`, now });
          await tx.onboardingSession.updateMany({
            where: { user_id: target.id, purpose: "pending_status", revoked_at: null },
            data: { revoked_at: now, revoke_reason: `account_${input.status}` }
          });
        }
        const updated = await tx.user.update({
          where: { id: target.id },
          data: {
            account_status: input.status,
            status_reason: input.reason ?? null,
            status_updated_at: now,
            ...(input.status !== AccountStatus.active ? { security_version: { increment: 1 } } : {})
          },
          select: safeUserSelect
        });
        await auditEvent(tx, {
          userId: req.user!.id,
          action: AuditAction.account_status_changed,
          entityType: "User",
          entityId: target.id,
          metadata: {
            target_user_id: target.id,
            previous_status: target.account_status,
            new_status: input.status,
            reason: input.reason ?? null,
            request_id: req.requestId
          }
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    res.json({ user: serializeSafeUser(result) });
  } catch (error) {
    next(isTransactionWriteConflict(error) ? new HttpError(409, "account_status_conflict") : error);
  }
});

adminRouter.get("/admin/dashboard", async (req: AuthenticatedRequest, res, next) => {
  try {
    const [users, drivers, routes, requests, orders, parcels, recentRequests, recentOrders, recentRoutes] =
      await Promise.all([
        prisma.user.count(),
        prisma.driverProfile.count(),
        prisma.driverRoute.count(),
        prisma.passengerRequest.count(),
        prisma.merchantOrder.count(),
        prisma.parcel.count(),
        prisma.passengerRequest.findMany({ orderBy: { created_at: "desc" }, take: 5 }),
        prisma.merchantOrder.findMany({ orderBy: { created_at: "desc" }, take: 5, include: { parcels: true } }),
        prisma.driverRoute.findMany({ orderBy: { activated_at: "desc" }, take: 5 })
      ]);

    await auditEvent(prisma, {
      userId: req.user!.id,
      action: AuditAction.admin_action,
      entityType: "AdminDashboard",
      metadata: { action: "dashboard_viewed" }
    });

    res.json({
      counts: { users, drivers, routes, passenger_requests: requests, merchant_orders: orders, parcels },
      recent: { passenger_requests: recentRequests, merchant_orders: recentOrders, routes: recentRoutes }
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/admin/drivers", async (_req, res, next) => {
  try {
    const drivers = await prisma.driverProfile.findMany({
      include: { user: { select: safeUserSelect }, routes: true }
    });
    res.json({ drivers: drivers.map((driver) => ({ ...driver, user: serializeSafeUser(driver.user) })) });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/admin/requests", async (_req, res, next) => {
  try {
    const requests = await prisma.passengerRequest.findMany({
      include: { passenger: { select: safeUserSelect } }
    });
    res.json({ requests: requests.map((request) => ({ ...request, passenger: serializeSafeUser(request.passenger) })) });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/admin/orders", async (_req, res, next) => {
  try {
    const orders = await prisma.merchantOrder.findMany({
      include: { merchant: { select: safeUserSelect }, parcels: true }
    });
    res.json({ orders: orders.map((order) => ({ ...order, merchant: serializeSafeUser(order.merchant) })) });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/admin/routes", async (_req, res, next) => {
  try {
    const routes = await prisma.driverRoute.findMany({
      include: { driver: { include: { user: { select: safeUserSelect } } } }
    });
    res.json({
      routes: routes.map((route) => ({
        ...route,
        driver: { ...route.driver, user: serializeSafeUser(route.driver.user) }
      }))
    });
  } catch (error) {
    next(error);
  }
});
