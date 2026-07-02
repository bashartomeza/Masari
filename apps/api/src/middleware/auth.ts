import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./error.js";

export type AuthUser = {
  id: string;
  role: "passenger" | "driver" | "merchant" | "admin";
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

export function signAuthToken(user: AuthUser) {
  return jwt.sign(user, config.JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAuthToken(token: string): AuthUser {
  const payload = jwt.verify(token, config.JWT_SECRET);
  if (!payload || typeof payload !== "object" || typeof payload.id !== "string") {
    throw new HttpError(401, "invalid_token");
  }

  const role = payload.role;
  if (role !== "passenger" && role !== "driver" && role !== "merchant" && role !== "admin") {
    throw new HttpError(401, "invalid_token");
  }

  return { id: payload.id, role };
}

export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
    if (!token) {
      throw new HttpError(401, "missing_token");
    }

    const authUser = verifyAuthToken(token);
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      throw new HttpError(401, "invalid_token");
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "missing_auth_user");
      }

      if (!roles.includes(req.user.role)) {
        throw new HttpError(403, "forbidden");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
