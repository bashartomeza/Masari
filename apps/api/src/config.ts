import { z } from "zod";

export const APP_ENVIRONMENTS = ["local", "test", "demo", "staging", "production"] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

const MINIMUM_JWT_SECRET_LENGTH = 32;
const unsafeSecretMarkers = ["development-jwt-secret", "change-me", "replace-with", "placeholder"];

const rawSchema = z.object({
  APP_ENV: z.enum(APP_ENVIRONMENTS),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(MINIMUM_JWT_SECRET_LENGTH),
  CORS_ORIGINS: z.string().optional(),
  APP_RELEASE: z.string().min(1).optional(),
  ENABLE_DEMO_FEATURES: z.string().optional(),
  DEMO_RESET_KEY: z.string().min(8).optional(),
  DEMO_PASSENGER_PASSWORD: z.string().min(12).optional(),
  DEMO_DRIVER_PASSWORD: z.string().min(12).optional(),
  DEMO_MERCHANT_PASSWORD: z.string().min(12).optional(),
  DEMO_ADMIN_PASSWORD: z.string().min(12).optional(),
  PORT: z.coerce.number().int().positive().default(3000)
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

export function createConfig(environment: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const raw = safeParseEnvironment(environment);
  const isLocal = raw.APP_ENV === "local";
  const isTest = raw.APP_ENV === "test";
  const isDemo = raw.APP_ENV === "demo";
  const isStaging = raw.APP_ENV === "staging";
  const isProduction = raw.APP_ENV === "production";
  const explicitlyEnabled = parseBoolean("ENABLE_DEMO_FEATURES", raw.ENABLE_DEMO_FEATURES);
  const demoFeaturesEnabled = isDemo || isTest || (isLocal && explicitlyEnabled);
  const problems: string[] = [];

  if ((isStaging || isProduction) && explicitlyEnabled) {
    problems.push("ENABLE_DEMO_FEATURES cannot be enabled in staging or production");
  }

  if (unsafeSecretMarkers.some((marker) => raw.JWT_SECRET.toLowerCase().includes(marker))) {
    problems.push("JWT_SECRET uses a known placeholder or default value");
  }

  const corsOrigins = (raw.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if ((isStaging || isProduction) && corsOrigins.length === 0) {
    problems.push("CORS_ORIGINS is required in staging and production");
  }
  if ((isStaging || isProduction) && !raw.APP_RELEASE) {
    problems.push("APP_RELEASE is required in staging and production");
  }
  if ((isStaging || isProduction) && corsOrigins.includes("*")) {
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

  if (problems.length > 0) throw new ConfigurationError(problems);

  return {
    appEnv: raw.APP_ENV,
    databaseUrl: raw.DATABASE_URL,
    jwtSecret: raw.JWT_SECRET,
    corsOrigins,
    appRelease: raw.APP_RELEASE,
    port: raw.PORT,
    isLocal,
    isTest,
    isDemo,
    isStaging,
    isProduction,
    demoFeaturesEnabled,
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
