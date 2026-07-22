import type { RequestHandler } from "express";
import { config, type AppConfig } from "../config.js";

export function createCors(appConfig: AppConfig = config): RequestHandler {
  const allowedOrigins = new Set(appConfig.corsOrigins);
  return (req, res, next) => {
    const origin = req.header("origin");
    if (origin && allowedOrigins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,X-Request-Id,Idempotency-Key,x-demo-reset-key"
      );
      res.header("Access-Control-Expose-Headers", "X-Request-Id,Retry-After");
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  };
}

export const localDevCors = createCors();
