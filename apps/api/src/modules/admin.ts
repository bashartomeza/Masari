import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { revokeAllUserSessions } from "../lib/refreshTokens.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AccountStatus, AuditAction } from "../generated/prisma/enums.js";
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

adminRouter.use("/admin", requireAuth, requireRole("admin"));

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
