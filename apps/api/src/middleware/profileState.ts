import type { NextFunction, Response } from "express";
import { authenticateAuthToken, type AuthenticatedRequest } from "./auth.js";
import { HttpError } from "./error.js";

const completionSafePaths = new Set([
  "/api/v1/capabilities",
  "/api/v1/onboarding/consents"
]);

function pathname(req: AuthenticatedRequest) {
  return new URL(req.originalUrl, "http://masari.local").pathname;
}

export function isProfileCompletionSafePath(req: AuthenticatedRequest) {
  const path = pathname(req);
  return path.startsWith("/api/v1/auth/") ||
    path.startsWith("/api/v1/phone-verification") ||
    completionSafePaths.has(path);
}

/**
 * Globally mounted before product routers so an authenticated account cannot
 * reach a newly added operational router before its verified phone profile is
 * complete. Public and account-completion routes are deliberately exempt.
 */
export async function requireCompleteProfile(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    if (isProfileCompletionSafePath(req)) return next();

    if (req.user) {
      if (req.user.profileState !== "complete") throw new HttpError(403, "profile_incomplete");
      return next();
    }

    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
    if (!token) return next();

    const user = await authenticateAuthToken(token);
    req.user = user;
    if (user.profileState !== "complete") throw new HttpError(403, "profile_incomplete");

    next();
  } catch (error) {
    next(error);
  }
}
