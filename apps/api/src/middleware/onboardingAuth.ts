import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "../config.js";
import type { OnboardingSessionPurpose } from "../generated/prisma/enums.js";
import { authenticateOnboardingSession } from "../lib/onboardingSessions.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./error.js";

export type OnboardingAuthContext = {
  sessionId: string;
  attemptId: string;
  userId?: string;
  purpose: OnboardingSessionPurpose;
  attemptStatus: string;
  userRole?: string;
  userStatus?: string;
};

export type OnboardingAuthenticatedRequest = Request & {
  onboarding?: OnboardingAuthContext;
};

export function requireOnboardingToken(
  appConfig: AppConfig,
  purposes: readonly OnboardingSessionPurpose[]
) {
  return async (req: OnboardingAuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const onboarding = appConfig.onboarding;
      const header = req.header("authorization");
      const match = header?.match(/^Onboarding ([A-Za-z0-9_-]{43})$/);
      if (!onboarding || !match) throw new HttpError(401, "onboarding_unavailable");
      const session = await authenticateOnboardingSession(prisma, {
        token: match[1],
        key: onboarding.keys.onboardingSession,
        purposes
      });
      if (!session) throw new HttpError(401, "onboarding_unavailable");
      req.onboarding = {
        sessionId: session.id,
        attemptId: session.onboarding_attempt_id,
        userId: session.user_id ?? undefined,
        purpose: session.purpose,
        attemptStatus: session.onboarding_attempt.status,
        userRole: session.user?.role,
        userStatus: session.user?.account_status
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
