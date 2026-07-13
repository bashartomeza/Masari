import helmet from "helmet";
import type { AppConfig } from "../config.js";

export function securityHeaders(appConfig: AppConfig) {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    strictTransportSecurity:
      appConfig.isStaging || appConfig.isProduction
        ? { maxAge: 15_552_000, includeSubDomains: true, preload: false }
        : false
  });
}
