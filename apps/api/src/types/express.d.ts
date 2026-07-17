import type { Logger } from "pino";
import type { AuthUser } from "../middleware/auth.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      operationalLog: Logger;
      user?: AuthUser;
    }
  }
}

export {};
