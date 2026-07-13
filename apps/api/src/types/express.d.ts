import type { Logger } from "pino";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      operationalLog: Logger;
      user?: {
        id: string;
        role: "passenger" | "driver" | "merchant" | "admin";
      };
    }
  }
}

export {};
