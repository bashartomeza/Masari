import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { AppConfig } from "../config.js";
import { normalizePhoneToE164 } from "../lib/phone.js";

function safeIpKey(req: Request) {
  return ipKeyGenerator(req.ip ?? "unknown", 56);
}

function loginKey(req: Request) {
  let phoneIdentity = "invalid";
  if (typeof req.body?.phone === "string") {
    try {
      phoneIdentity = normalizePhoneToE164(req.body.phone, {
        ...(typeof req.body?.region === "string" ? { region: req.body.region } : {})
      });
    } catch {
      // Invalid inputs share one per-IP bucket instead of creating bypassable raw variants.
    }
  }
  const phoneDigest = createHash("sha256").update(phoneIdentity).digest("hex").slice(0, 24);
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
