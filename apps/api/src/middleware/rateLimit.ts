import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { AppConfig } from "../config.js";

function safeIpKey(req: Request) {
  return ipKeyGenerator(req.ip ?? "unknown", 56);
}

function loginKey(req: Request) {
  const normalizedPhone = typeof req.body?.phone === "string" ? req.body.phone.trim().replace(/\s+/g, "") : "missing";
  const phoneDigest = createHash("sha256").update(normalizedPhone).digest("hex").slice(0, 24);
  return `${safeIpKey(req)}:${phoneDigest}`;
}

function handler(req: Request, res: Response) {
  res.status(429).json({
    error: "rate_limited",
    message: "Too many requests. Try again later.",
    request_id: req.requestId
  });
}

function sharedOptions(windowMs: number, max: number) {
  return {
    windowMs,
    limit: max,
    standardHeaders: "draft-8" as const,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    skip: (req: Request) => req.method === "OPTIONS",
    handler
  };
}

export function createGlobalRateLimiter(appConfig: AppConfig) {
  return rateLimit({
    ...sharedOptions(appConfig.rateLimits.global.windowMs, appConfig.rateLimits.global.max),
    identifier: "masari-global-api",
    keyGenerator: safeIpKey
  });
}

export function createLoginRateLimiter(appConfig: AppConfig) {
  return rateLimit({
    ...sharedOptions(appConfig.rateLimits.login.windowMs, appConfig.rateLimits.login.max),
    identifier: "masari-login",
    keyGenerator: loginKey
  });
}
