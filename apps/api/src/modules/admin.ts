import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { AuditAction } from "../generated/prisma/enums.js";

export const adminRouter = Router();

const safeUserSelect = {
  id: true,
  name: true,
  phone: true,
  role: true,
  demo_account: true,
  created_at: true
} as const;

function serializeSafeUser(user: {
  id: string;
  name: string;
  phone: string;
  role: string;
  demo_account: boolean;
  created_at: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    demo_account: user.demo_account,
    created_at: user.created_at
  };
}

adminRouter.use("/admin", requireAuth, requireRole("admin"));

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
