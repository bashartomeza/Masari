import { describe, expect, it } from "vitest";
import { ConfigurationError, createConfig } from "../config.js";

const safeJwt = "a-safe-jwt-secret-with-more-than-thirty-two-characters";
const safeRefreshPepper = "a-safe-refresh-pepper-with-more-than-thirty-two-characters";

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    APP_ENV: "production",
    DATABASE_URL: "mysql://database-user:database-password@db.internal:3306/masari",
    JWT_SECRET: safeJwt,
    REFRESH_TOKEN_PEPPER: safeRefreshPepper,
    CORS_ORIGINS: "https://admin.masari.example",
    APP_RELEASE: "m6b1a-test",
    TRUST_PROXY: "none",
    ...overrides
  };
}

describe("fail-closed application configuration", () => {
  it("rejects staging without DATABASE_URL", () => {
    expect(() => createConfig(environment({ APP_ENV: "staging", DATABASE_URL: undefined }))).toThrow(ConfigurationError);
  });

  it("rejects production without JWT_SECRET", () => {
    expect(() => createConfig(environment({ JWT_SECRET: undefined }))).toThrow(ConfigurationError);
  });

  it("rejects a placeholder JWT secret", () => {
    expect(() => createConfig(environment({ JWT_SECRET: "replace-with-a-long-random-secret-value" }))).toThrow(
      /known placeholder/
    );
  });

  it("rejects wildcard CORS in production", () => {
    expect(() => createConfig(environment({ CORS_ORIGINS: "*" }))).toThrow(/wildcard/);
  });

  it("rejects localhost CORS in production", () => {
    expect(() => createConfig(environment({ CORS_ORIGINS: "http://localhost:5173" }))).toThrow(/non-local/);
  });

  it("rejects demo features in staging and production", () => {
    expect(() => createConfig(environment({ ENABLE_DEMO_FEATURES: "true" }))).toThrow(/cannot be enabled/);
    expect(() => createConfig(environment({ APP_ENV: "staging", ENABLE_DEMO_FEATURES: "true" }))).toThrow(
      /cannot be enabled/
    );
  });

  it("keeps route management independent and M7C1 operational gates fail-closed", () => {
    expect(createConfig(environment())).toEqual(
      expect.objectContaining({
        routeManagementEnabled: false,
        multiRouteEntryEnabled: false,
        multiRouteMatchingEnabled: false
      })
    );
    expect(createConfig(environment({ ROUTE_MANAGEMENT_ENABLED: "true" })).routeManagementEnabled).toBe(true);
    expect(createConfig(environment({ APP_ENV: "local", MULTI_ROUTE_ENTRY_ENABLED: "true" })).multiRouteEntryEnabled).toBe(true);
    expect(() => createConfig(environment({ MULTI_ROUTE_ENTRY_ENABLED: "true" }))).toThrow(/forbidden in staging and production/);
    expect(() => createConfig(environment({ APP_ENV: "staging", MULTI_ROUTE_ENTRY_ENABLED: "true" }))).toThrow(/forbidden/);
    expect(() => createConfig(environment({ APP_ENV: "local", MULTI_ROUTE_MATCHING_ENABLED: "true" }))).toThrow(/during M7C1/);
    expect(() => createConfig(environment({ MULTI_ROUTE_MATCHING_ENABLED: "true" }))).toThrow(/during M7C1/);
    expect(() => createConfig(environment({ ROUTE_MANAGEMENT_ENABLED: "yes" }))).toThrow(/true or false/);
  });

  it("requires an explicit safe trust-proxy topology in production-like environments", () => {
    expect(() => createConfig(environment({ TRUST_PROXY: undefined }))).toThrow(/TRUST_PROXY must be explicit/);
    expect(() => createConfig(environment({ TRUST_PROXY: "true" }))).toThrow(/trusted proxy hop count/);
    expect(createConfig(environment({ TRUST_PROXY: "none" })).trustProxy).toBe(false);
    expect(createConfig(environment({ TRUST_PROXY: "1" })).trustProxy).toBe(1);
  });

  it("rejects operational settings that would make production unsafe", () => {
    expect(() => createConfig(environment({ RATE_LIMIT_GLOBAL_MAX: "1" }))).toThrow(/too low/);
    expect(() => createConfig(environment({ RATE_LIMIT_LOGIN_MAX: "1" }))).toThrow(/too low/);
    expect(() => createConfig(environment({ RATE_LIMIT_GLOBAL_MAX: "1001" }))).toThrow(/too high/);
    expect(() => createConfig(environment({ RATE_LIMIT_LOGIN_MAX: "51" }))).toThrow(/too high/);
    expect(() => createConfig(environment({ RATE_LIMIT_LOGIN_WINDOW_MS: "1000" }))).toThrow(/at least 60000ms/);
    expect(() => createConfig(environment({ READINESS_TIMEOUT_MS: "10" }))).toThrow(/too low/);
  });

  it("enforces production access and refresh lifetime boundaries", () => {
    expect(() => createConfig(environment({ ACCESS_TOKEN_TTL_SECONDS: "299" }))).toThrow(/between 300 and 1800/);
    expect(() => createConfig(environment({ ACCESS_TOKEN_TTL_SECONDS: "1801" }))).toThrow(/between 300 and 1800/);
    expect(() => createConfig(environment({ REFRESH_TOKEN_TTL_DAYS: "91" }))).toThrow(/between 1 and 90/);
    expect(createConfig(environment({ ACCESS_TOKEN_TTL_SECONDS: "300", REFRESH_TOKEN_TTL_DAYS: "90" }))).toEqual(
      expect.objectContaining({ accessTokenTtlSeconds: 300, refreshTokenTtlDays: 90 })
    );
  });

  it("requires a non-placeholder refresh-token pepper in production-like environments", () => {
    expect(() => createConfig(environment({ REFRESH_TOKEN_PEPPER: undefined }))).toThrow(/REFRESH_TOKEN_PEPPER is required/);
    expect(() => createConfig(environment({ REFRESH_TOKEN_PEPPER: "replace-with-a-long-random-refresh-pepper" }))).toThrow(
      /known placeholder/
    );
  });

  it("rejects the exact documented template placeholders for both production secrets", () => {
    expect(() => createConfig(environment({ JWT_SECRET: "<at-least-32-random-characters>" }))).toThrow(/JWT_SECRET/);
    expect(() =>
      createConfig(environment({ REFRESH_TOKEN_PEPPER: "<at-least-32-random-characters-separate-from-jwt>" }))
    ).toThrow(/REFRESH_TOKEN_PEPPER uses a known placeholder/);
  });

  it("never includes submitted secret values in validation errors", () => {
    const secret = "sensitive-value-that-must-never-appear";
    try {
      createConfig(environment({ JWT_SECRET: secret, CORS_ORIGINS: "http://localhost:5173" }));
      throw new Error("expected configuration to fail");
    } catch (error) {
      expect(String(error)).not.toContain(secret);
      expect(String(error)).not.toContain("database-password");
    }
  });

  it("requires every demo-only credential when demo features are enabled", () => {
    expect(() =>
      createConfig(
        environment({
          APP_ENV: "demo",
          CORS_ORIGINS: "http://localhost:5173",
          APP_RELEASE: undefined
        })
      )
    ).toThrow(/demo configuration/);

    const parsed = createConfig({
      ...environment({ APP_ENV: "demo", CORS_ORIGINS: "http://localhost:5173", APP_RELEASE: undefined }),
      DEMO_RESET_KEY: "test-reset-key",
      DEMO_PASSENGER_PASSWORD: "passenger-test-secret",
      DEMO_DRIVER_PASSWORD: "driver-test-secret",
      DEMO_MERCHANT_PASSWORD: "merchant-test-secret",
      DEMO_ADMIN_PASSWORD: "admin-test-secret"
    });
    expect(parsed.demoFeaturesEnabled).toBe(true);
  });
});
