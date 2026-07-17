import pino, { type DestinationStream, type Logger } from "pino";
import type { AppConfig } from "../config.js";

const REDACTED_PATHS = [
  "authorization",
  "cookie",
  "token",
  "access_token",
  "refresh_token",
  "token_hash",
  "refresh_token_hash",
  "refresh_token_pepper",
  "password",
  "password_hash",
  "database_url",
  "reset_key",
  "phone",
  "lat",
  "lng",
  "latitude",
  "longitude",
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body",
  "res.body"
];

export function createOperationalLogger(appConfig: AppConfig, destination?: DestinationStream): Logger {
  const options = {
    level: appConfig.logLevel,
    base: {
      service: "masari-api",
      app_env: appConfig.appEnv,
      release: appConfig.appRelease
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" }
  } as const;

  return pino(options, destination ?? pino.destination({ sync: false }));
}
