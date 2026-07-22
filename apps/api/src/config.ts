import { z } from "zod";

export const APP_ENVIRONMENTS = ["local", "test", "demo", "staging", "production"] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

const MINIMUM_JWT_SECRET_LENGTH = 32;
const MINIMUM_REFRESH_PEPPER_LENGTH = 32;
const MINIMUM_ONBOARDING_PEPPER_LENGTH = 32;
const PRODUCTION_ACCESS_TOKEN_MIN_SECONDS = 300;
const PRODUCTION_ACCESS_TOKEN_MAX_SECONDS = 1_800;
const PRODUCTION_REFRESH_TOKEN_MAX_DAYS = 90;
const unsafeSecretMarkers = ["development-jwt-secret", "change-me", "replace-with", "placeholder"];

function isUnsafeSecret(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    unsafeSecretMarkers.some((marker) => normalized.includes(marker)) ||
    (normalized.startsWith("<") && normalized.endsWith(">"))
  );
}

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
  ROUTE_MANAGEMENT_ENABLED: z.string().optional(),
  MULTI_ROUTE_ENTRY_ENABLED: z.string().optional(),
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
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).max(500).optional(),
  INVITATIONS_ENABLED: z.string().optional(),
  PUBLIC_ONBOARDING_ENABLED: z.string().optional(),
  OTP_PROVIDER: z.enum(["disabled", "fake"]).default("disabled"),
  SUPPORTED_PHONE_REGIONS: z.string().default("PS"),
  INVITATION_CODE_PEPPER: z.string().min(MINIMUM_ONBOARDING_PEPPER_LENGTH).optional(),
  INVITATION_CODE_KEY_VERSION: z.coerce.number().int().positive().default(1),
  PHONE_DIGEST_PEPPER: z.string().min(MINIMUM_ONBOARDING_PEPPER_LENGTH).optional(),
  PHONE_DIGEST_KEY_VERSION: z.coerce.number().int().positive().default(1),
  OTP_CODE_PEPPER: z.string().min(MINIMUM_ONBOARDING_PEPPER_LENGTH).optional(),
  OTP_CODE_KEY_VERSION: z.coerce.number().int().positive().default(1),
  ONBOARDING_SESSION_PEPPER: z.string().min(MINIMUM_ONBOARDING_PEPPER_LENGTH).optional(),
  ONBOARDING_SESSION_KEY_VERSION: z.coerce.number().int().positive().default(1),
  IDEMPOTENCY_KEY_PEPPER: z.string().min(MINIMUM_ONBOARDING_PEPPER_LENGTH).optional(),
  IDEMPOTENCY_KEY_VERSION: z.coerce.number().int().positive().default(1),
  IDEMPOTENCY_PAYLOAD_PEPPER: z.string().min(MINIMUM_ONBOARDING_PEPPER_LENGTH).optional(),
  IDEMPOTENCY_PAYLOAD_KEY_VERSION: z.coerce.number().int().positive().default(1),
  ABUSE_KEY_PEPPER: z.string().min(MINIMUM_ONBOARDING_PEPPER_LENGTH).optional(),
  ABUSE_KEY_VERSION: z.coerce.number().int().positive().default(1),
  INVITATION_EXPIRY_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(600).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(10).max(600).default(60),
  OTP_MAX_RESENDS: z.coerce.number().int().min(0).max(10).default(3),
  OTP_MAX_SENDS_PER_PHONE_DAY: z.coerce.number().int().min(1).max(20).default(5),
  ADMIN_INVITATION_MAX_PER_HOUR: z.coerce.number().int().min(1).max(500).default(20),
  ONBOARDING_ATTEMPT_TTL_SECONDS: z.coerce.number().int().min(600).max(3_600).default(1_800),
  ONBOARDING_REGISTRATION_GRANT_TTL_SECONDS: z.coerce.number().int().min(300).max(1_800).default(900),
  ONBOARDING_CONTINUATION_TTL_SECONDS: z.coerce.number().int().min(300).max(3_600).default(1_800),
  ONBOARDING_PENDING_STATUS_TTL_DAYS: z.coerce.number().int().min(1).max(7).default(7),
  ONBOARDING_TEST_LEGAL_FIXTURES_ENABLED: z.string().optional()
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
  const routeManagementEnabled = parseBoolean("ROUTE_MANAGEMENT_ENABLED", raw.ROUTE_MANAGEMENT_ENABLED);
  const multiRouteEntryEnabled = parseBoolean("MULTI_ROUTE_ENTRY_ENABLED", raw.MULTI_ROUTE_ENTRY_ENABLED);
  const invitationsEnabled = parseBoolean("INVITATIONS_ENABLED", raw.INVITATIONS_ENABLED);
  const publicOnboardingEnabled = parseBoolean("PUBLIC_ONBOARDING_ENABLED", raw.PUBLIC_ONBOARDING_ENABLED);
  const testLegalFixturesEnabled = parseBoolean(
    "ONBOARDING_TEST_LEGAL_FIXTURES_ENABLED",
    raw.ONBOARDING_TEST_LEGAL_FIXTURES_ENABLED
  );
  const problems: string[] = [];

  if (productionLike && explicitlyEnabled) {
    problems.push("ENABLE_DEMO_FEATURES cannot be enabled in staging or production");
  }
  if (multiRouteEntryEnabled) {
    problems.push("MULTI_ROUTE_ENTRY_ENABLED cannot be enabled before M7C");
  }
  if (publicOnboardingEnabled && productionLike) {
    problems.push("PUBLIC_ONBOARDING_ENABLED cannot be enabled in staging or production without an approved provider");
  }
  if (publicOnboardingEnabled && !invitationsEnabled) {
    problems.push("PUBLIC_ONBOARDING_ENABLED requires INVITATIONS_ENABLED");
  }
  if (publicOnboardingEnabled && raw.OTP_PROVIDER !== "fake") {
    problems.push("PUBLIC_ONBOARDING_ENABLED requires the fake provider in local, test, or demo");
  }
  if (productionLike && testLegalFixturesEnabled) {
    problems.push("ONBOARDING_TEST_LEGAL_FIXTURES_ENABLED is forbidden in staging and production");
  }
  if (productionLike && raw.OTP_PROVIDER === "fake") {
    problems.push("OTP_PROVIDER=fake is forbidden in staging and production");
  }

  const supportedRegions = raw.SUPPORTED_PHONE_REGIONS.split(",")
    .map((region) => region.trim().toUpperCase())
    .filter(Boolean);
  if (supportedRegions.length !== 1 || supportedRegions[0] !== "PS") {
    problems.push("SUPPORTED_PHONE_REGIONS must be PS in M6C2B1");
  }

  const onboardingSecrets = {
    invitationCode: raw.INVITATION_CODE_PEPPER,
    phoneDigest: raw.PHONE_DIGEST_PEPPER,
    otpCode: raw.OTP_CODE_PEPPER,
    onboardingSession: raw.ONBOARDING_SESSION_PEPPER,
    idempotency: raw.IDEMPOTENCY_KEY_PEPPER,
    abuse: raw.ABUSE_KEY_PEPPER
  };
  if (invitationsEnabled) {
    for (const [name, value] of Object.entries(onboardingSecrets)) {
      if (!value) problems.push(`${name} pepper is required when invitations are enabled`);
      else if (isUnsafeSecret(value)) problems.push(`${name} pepper uses a known placeholder or default value`);
    }
    const configuredSecrets = Object.values(onboardingSecrets).filter((value): value is string => Boolean(value));
    if (new Set(configuredSecrets).size !== configuredSecrets.length) {
      problems.push("onboarding peppers must be distinct from one another");
    }
    const operationalSecrets = [raw.JWT_SECRET, raw.REFRESH_TOKEN_PEPPER].filter(
      (value): value is string => Boolean(value)
    );
    if (configuredSecrets.some((secret) => operationalSecrets.includes(secret))) {
      problems.push("onboarding peppers must be distinct from JWT and refresh-token secrets");
    }
  }
  const idempotencyPayloadSecret = raw.IDEMPOTENCY_PAYLOAD_PEPPER;
  if (publicOnboardingEnabled) {
    if (!idempotencyPayloadSecret) problems.push("idempotency payload pepper is required when public onboarding is enabled");
    else if (isUnsafeSecret(idempotencyPayloadSecret)) problems.push("idempotency payload pepper uses a known placeholder or default value");
    const allSecrets = [
      ...Object.values(onboardingSecrets),
      raw.JWT_SECRET,
      raw.REFRESH_TOKEN_PEPPER
    ].filter((value): value is string => Boolean(value));
    if (idempotencyPayloadSecret && allSecrets.includes(idempotencyPayloadSecret)) {
      problems.push("idempotency payload pepper must be distinct from onboarding and operational secrets");
    }
  }

  if (isUnsafeSecret(raw.JWT_SECRET)) {
    problems.push("JWT_SECRET uses a known placeholder or default value");
  }
  if (raw.REFRESH_TOKEN_PEPPER && isUnsafeSecret(raw.REFRESH_TOKEN_PEPPER)) {
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
    routeManagementEnabled,
    multiRouteEntryEnabled,
    invitationsEnabled,
    publicOnboardingEnabled,
    publicRegistration: publicOnboardingEnabled
      ? {
          attemptTtlSeconds: raw.ONBOARDING_ATTEMPT_TTL_SECONDS,
          registrationGrantTtlSeconds: raw.ONBOARDING_REGISTRATION_GRANT_TTL_SECONDS,
          continuationTtlSeconds: raw.ONBOARDING_CONTINUATION_TTL_SECONDS,
          pendingStatusTtlDays: raw.ONBOARDING_PENDING_STATUS_TTL_DAYS,
          testLegalFixturesEnabled,
          idempotencyPayloadKey: {
            secret: idempotencyPayloadSecret!,
            version: raw.IDEMPOTENCY_PAYLOAD_KEY_VERSION
          }
        }
      : undefined,
    onboarding: invitationsEnabled
      ? {
          otpProvider: raw.OTP_PROVIDER,
          supportedRegions: ["PS"] as const,
          invitationExpiryDays: raw.INVITATION_EXPIRY_DAYS,
          otpTtlSeconds: raw.OTP_TTL_SECONDS,
          otpMaxAttempts: raw.OTP_MAX_ATTEMPTS,
          otpResendCooldownSeconds: raw.OTP_RESEND_COOLDOWN_SECONDS,
          otpMaxResends: raw.OTP_MAX_RESENDS,
          otpMaxSendsPerPhoneDay: raw.OTP_MAX_SENDS_PER_PHONE_DAY,
          adminInvitationMaxPerHour: raw.ADMIN_INVITATION_MAX_PER_HOUR,
          keys: {
            invitationCode: { secret: onboardingSecrets.invitationCode!, version: raw.INVITATION_CODE_KEY_VERSION },
            phoneDigest: { secret: onboardingSecrets.phoneDigest!, version: raw.PHONE_DIGEST_KEY_VERSION },
            otpCode: { secret: onboardingSecrets.otpCode!, version: raw.OTP_CODE_KEY_VERSION },
            onboardingSession: {
              secret: onboardingSecrets.onboardingSession!,
              version: raw.ONBOARDING_SESSION_KEY_VERSION
            },
            idempotency: { secret: onboardingSecrets.idempotency!, version: raw.IDEMPOTENCY_KEY_VERSION },
            abuse: { secret: onboardingSecrets.abuse!, version: raw.ABUSE_KEY_VERSION }
          }
        }
      : undefined,
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
