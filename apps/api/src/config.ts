import { z } from "zod";

export const APP_ENVIRONMENTS = ["local", "test", "demo", "staging", "production"] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

const MINIMUM_JWT_SECRET_LENGTH = 32;
const MINIMUM_REFRESH_PEPPER_LENGTH = 32;
const PRODUCTION_ACCESS_TOKEN_MIN_SECONDS = 300;
const PRODUCTION_ACCESS_TOKEN_MAX_SECONDS = 1_800;
const PRODUCTION_REFRESH_TOKEN_MAX_DAYS = 90;
const unsafeSecretMarkers = ["development-jwt-secret", "change-me", "replace-with", "placeholder"];

const rawSchema = z.object({
  APP_ENV: z.enum(APP_ENVIRONMENTS),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(MINIMUM_JWT_SECRET_LENGTH),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).optional(),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).optional(),
  REFRESH_TOKEN_PEPPER: z.string().min(MINIMUM_REFRESH_PEPPER_LENGTH).optional(),
  CORS_ORIGINS: z.string().optional(),
  APP_RELEASE: z.string().min(1).optional(),
  ENABLE_DEMO_FEATURES: z.string().optional(),
  DEMO_RESET_KEY: z.string().min(8).optional(),
  DEMO_PASSENGER_PASSWORD: z.string().min(12).optional(),
  DEMO_DRIVER_PASSWORD: z.string().min(12).optional(),
  DEMO_MERCHANT_PASSWORD: z.string().min(12).optional(),
  DEMO_ADMIN_PASSWORD: z.string().min(12).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  TRUST_PROXY: z.string().optional(),
  READINESS_TIMEOUT_MS: z.coerce.number().int().min(10).max(10_000).default(2_000),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(900_000),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1).max(10_000).optional(),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(900_000),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).max(500).optional()
});

export type AppConfig = ReturnType<typeof createConfig>;

export class ConfigurationError extends Error {
  constructor(problems: string[]) {
    super(`Invalid Masari configuration: ${problems.join("; ")}`);
    this.name = "ConfigurationError";
  }
}

function parseBoolean(name: string, value: string | undefined) {
  if (value === undefined || value === "") return false;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ConfigurationError([`${name} must be true or false`]);
}

function safeParseEnvironment(environment: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const result = rawSchema.safeParse(environment);
  if (result.success) return result.data;

  const fields = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? "configuration")))];
  throw new ConfigurationError(fields.map((field) => `${field} is missing or invalid`));
}

function parseTrustProxy(value: string | undefined, productionLike: boolean, problems: string[]) {
  if (value === undefined || value === "") {
    if (productionLike) problems.push("TRUST_PROXY must be explicit in staging and production");
    return false as const;
  }
  if (value === "none" || value === "0") return false as const;
  if (/^[1-5]$/.test(value)) return Number(value);
  problems.push("TRUST_PROXY must be none, 0, or a trusted proxy hop count from 1 through 5");
  return false as const;
}

export function createConfig(environment: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const raw = safeParseEnvironment(environment);
  const isLocal = raw.APP_ENV === "local";
  const isTest = raw.APP_ENV === "test";
  const isDemo = raw.APP_ENV === "demo";
  const isStaging = raw.APP_ENV === "staging";
  const isProduction = raw.APP_ENV === "production";
  const productionLike = isStaging || isProduction;
  const explicitlyEnabled = parseBoolean("ENABLE_DEMO_FEATURES", raw.ENABLE_DEMO_FEATURES);
  const demoFeaturesEnabled = isDemo || isTest || (isLocal && explicitlyEnabled);
  const problems: string[] = [];

  if (productionLike && explicitlyEnabled) {
    problems.push("ENABLE_DEMO_FEATURES cannot be enabled in staging or production");
  }

  if (unsafeSecretMarkers.some((marker) => raw.JWT_SECRET.toLowerCase().includes(marker))) {
    problems.push("JWT_SECRET uses a known placeholder or default value");
  }
  if (raw.REFRESH_TOKEN_PEPPER && unsafeSecretMarkers.some((marker) => raw.REFRESH_TOKEN_PEPPER!.toLowerCase().includes(marker))) {
    problems.push("REFRESH_TOKEN_PEPPER uses a known placeholder or default value");
  }
  if (productionLike && !raw.REFRESH_TOKEN_PEPPER) {
    problems.push("REFRESH_TOKEN_PEPPER is required in staging and production");
  }

  const accessTokenTtlSeconds = raw.ACCESS_TOKEN_TTL_SECONDS ?? (productionLike ? 900 : 28_800);
  const refreshTokenTtlDays = raw.REFRESH_TOKEN_TTL_DAYS ?? 30;
  if (
    productionLike &&
    (accessTokenTtlSeconds < PRODUCTION_ACCESS_TOKEN_MIN_SECONDS ||
      accessTokenTtlSeconds > PRODUCTION_ACCESS_TOKEN_MAX_SECONDS)
  ) {
    problems.push("ACCESS_TOKEN_TTL_SECONDS must be between 300 and 1800 in staging and production");
  }
  if (productionLike && refreshTokenTtlDays > PRODUCTION_REFRESH_TOKEN_MAX_DAYS) {
    problems.push("REFRESH_TOKEN_TTL_DAYS must be between 1 and 90 in staging and production");
  }

  const corsOrigins = (raw.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (productionLike && corsOrigins.length === 0) {
    problems.push("CORS_ORIGINS is required in staging and production");
  }
  if (productionLike && !raw.APP_RELEASE) {
    problems.push("APP_RELEASE is required in staging and production");
  }
  if (productionLike && corsOrigins.includes("*")) {
    problems.push("CORS_ORIGINS cannot contain a wildcard in staging or production");
  }
  if (
    isProduction &&
    corsOrigins.some((origin) => {
      try {
        const hostname = new URL(origin).hostname;
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
      } catch {
        return true;
      }
    })
  ) {
    problems.push("CORS_ORIGINS must contain valid non-local origins in production");
  }

  const demoValues = {
    resetKey: raw.DEMO_RESET_KEY,
    passengerPassword: raw.DEMO_PASSENGER_PASSWORD,
    driverPassword: raw.DEMO_DRIVER_PASSWORD,
    merchantPassword: raw.DEMO_MERCHANT_PASSWORD,
    adminPassword: raw.DEMO_ADMIN_PASSWORD
  };
  if (demoFeaturesEnabled) {
    for (const [name, value] of Object.entries(demoValues)) {
      if (!value) problems.push(`demo configuration ${name} is required when demo features are enabled`);
    }
  }

  const trustProxy = parseTrustProxy(raw.TRUST_PROXY, productionLike, problems);
  const globalRateLimitMax = raw.RATE_LIMIT_GLOBAL_MAX ?? (productionLike ? 300 : 5_000);
  const loginRateLimitMax = raw.RATE_LIMIT_LOGIN_MAX ?? (productionLike ? 10 : 500);
  if (productionLike && globalRateLimitMax < 50) {
    problems.push("RATE_LIMIT_GLOBAL_MAX is too low for staging or production");
  }
  if (productionLike && globalRateLimitMax > 1_000) {
    problems.push("RATE_LIMIT_GLOBAL_MAX is too high for staging or production");
  }
  if (productionLike && loginRateLimitMax < 3) {
    problems.push("RATE_LIMIT_LOGIN_MAX is too low for staging or production");
  }
  if (productionLike && loginRateLimitMax > 50) {
    problems.push("RATE_LIMIT_LOGIN_MAX is too high for staging or production");
  }
  if (productionLike && (raw.RATE_LIMIT_GLOBAL_WINDOW_MS < 60_000 || raw.RATE_LIMIT_LOGIN_WINDOW_MS < 60_000)) {
    problems.push("rate-limit windows must be at least 60000ms in staging or production");
  }
  if (productionLike && raw.READINESS_TIMEOUT_MS < 100) {
    problems.push("READINESS_TIMEOUT_MS is too low for staging or production");
  }

  if (problems.length > 0) throw new ConfigurationError(problems);

  return {
    appEnv: raw.APP_ENV,
    databaseUrl: raw.DATABASE_URL,
    jwtSecret: raw.JWT_SECRET,
    accessTokenTtlSeconds,
    refreshTokenTtlDays,
    refreshTokenPepper: raw.REFRESH_TOKEN_PEPPER ?? `masari-non-production:${raw.JWT_SECRET}`,
    corsOrigins,
    appRelease: raw.APP_RELEASE ?? "unreleased",
    port: raw.PORT,
    isLocal,
    isTest,
    isDemo,
    isStaging,
    isProduction,
    demoFeaturesEnabled,
    logLevel: raw.LOG_LEVEL ?? (isTest ? "silent" : "info"),
    trustProxy,
    readinessTimeoutMs: raw.READINESS_TIMEOUT_MS,
    rateLimits: {
      global: { windowMs: raw.RATE_LIMIT_GLOBAL_WINDOW_MS, max: globalRateLimitMax },
      login: { windowMs: raw.RATE_LIMIT_LOGIN_WINDOW_MS, max: loginRateLimitMax }
    },
    demo: demoFeaturesEnabled
      ? {
          resetKey: demoValues.resetKey!,
          passengerPassword: demoValues.passengerPassword!,
          driverPassword: demoValues.driverPassword!,
          merchantPassword: demoValues.merchantPassword!,
          adminPassword: demoValues.adminPassword!
        }
      : undefined
  } as const;
}

export const config = createConfig(process.env);
