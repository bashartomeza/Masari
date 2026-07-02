import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auditEvent } from "../lib/audit.js";
import { requireAuth, signAuthToken, type AuthenticatedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { AuditAction } from "../generated/prisma/enums.js";

const loginSchema = z.object({
  phone: z.string().min(5),
  password: z.string().min(1)
});

function publicUser(user: {
  id: string;
  name: string;
  phone: string;
  role: string;
  demo_account: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    demo_account: user.demo_account
  };
}

export const authRouter = Router();

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (!user) {
      throw new HttpError(401, "invalid_credentials");
    }

    const validPassword = await bcrypt.compare(input.password, user.password_hash);
    if (!validPassword) {
      throw new HttpError(401, "invalid_credentials");
    }

    await auditEvent(prisma, {
      userId: user.id,
      action: AuditAction.auth_login,
      entityType: "User",
      entityId: user.id,
      metadata: { role: user.role, demo_account: user.demo_account }
    });

    res.json({
      token: signAuthToken({ id: user.id, role: user.role }),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (!user) {
      throw new HttpError(404, "user_not_found");
    }

    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});
