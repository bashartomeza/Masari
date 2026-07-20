import type { Logger } from "pino";
import type { AuthUser } from "../middleware/auth.js";
import type { OnboardingAuthContext } from "../middleware/onboardingAuth.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      operationalLog: Logger;
      user?: AuthUser;
      onboarding?: OnboardingAuthContext;
    }
  }
}

export {};
