import { describe, expect, it } from "vitest";
import { createConfig } from "../config.js";
import { generateInvitationCode, normalizeInvitationCode } from "../lib/invitations.js";
import { keyedDigest } from "../lib/keyedDigest.js";
import { FakeOtpProvider, generateOtpCode } from "../lib/otp.js";
import { analyzePhoneNormalization, maskPhone, normalizePhoneToE164, PhoneNormalizationError } from "../lib/phone.js";

const key = { secret: "a-test-only-secret-that-is-longer-than-thirty-two-characters", version: 1 };
const enabledSecrets = {
  INVITATION_CODE_PEPPER: "invitation-test-secret-longer-than-thirty-two-characters",
  PHONE_DIGEST_PEPPER: "phone-test-secret-longer-than-thirty-two-characters",
  OTP_CODE_PEPPER: "otp-test-secret-longer-than-thirty-two-characters",
  ONBOARDING_SESSION_PEPPER: "session-test-secret-longer-than-thirty-two-characters",
  IDEMPOTENCY_KEY_PEPPER: "idempotency-test-secret-longer-than-thirty-two-characters",
  ABUSE_KEY_PEPPER: "abuse-test-secret-longer-than-thirty-two-characters"
};

function localConfig(overrides: Record<string, string | undefined> = {}) {
  return createConfig({
    APP_ENV: "local",
    DATABASE_URL: "mysql://local:local@localhost:3306/masari",
    JWT_SECRET: "local-test-jwt-secret-longer-than-thirty-two-characters",
    REFRESH_TOKEN_PEPPER: "local-test-refresh-pepper-longer-than-thirty-two-characters",
    CORS_ORIGINS: "http://localhost:5173",
    TRUST_PROXY: "none",
    ...overrides
  });

  it("reports invalid rows and canonical collisions without returning phone values", () => {
    const result = analyzePhoneNormalization([
      { id: "one", phone: "+970590000001" },
      { id: "two", phone: "00970 59 000 0001" },
      { id: "three", phone: "invalid" }
    ]);
    expect(result).toEqual({ total: 3, valid: 2, invalid: 1, collisions: 1 });
    expect(JSON.stringify(result)).not.toContain("970");
  });
}

describe("onboarding foundation primitives", () => {
  it("normalizes only valid Palestinian numbers to canonical E.164", () => {
    expect(normalizePhoneToE164("059 000 0001", { region: "PS" })).toBe("+970590000001");
    expect(normalizePhoneToE164("+970 59 000 0001")).toBe("+970590000001");
    expect(normalizePhoneToE164("٠٥٩ ٠٠٠ ٠٠٠١", { region: "PS" })).toBe("+970590000001");
    expect(normalizePhoneToE164("۰۵۹-۰۰۰-۰۰۰۱", { region: "PS" })).toBe("+970590000001");
    expect(normalizePhoneToE164("00970 (59) 000-0001")).toBe("+970590000001");
    expect(normalizePhoneToE164("(+970) 59-000-0001")).toBe("+970590000001");
    expect(maskPhone("+970590000001")).toBe("+970 ••• •• 0001");
    expect(() => normalizePhoneToE164("+972501234567")).toThrow(PhoneNormalizationError);
    expect(() => normalizePhoneToE164("0590000001")).toThrow(PhoneNormalizationError);
    expect(() => normalizePhoneToE164("not-a-phone", { region: "PS" })).toThrow(PhoneNormalizationError);
    expect(() => normalizePhoneToE164("+970590000001\n")).toThrow(PhoneNormalizationError);
    expect(() => normalizePhoneToE164("+970590000001 ext 2")).toThrow(PhoneNormalizationError);
    expect(() => normalizePhoneToE164("++970590000001")).toThrow(PhoneNormalizationError);
  });

  it("generates 100-bit Crockford codes and normalizes their display form", () => {
    const codes = new Set(Array.from({ length: 200 }, generateInvitationCode));
    expect(codes.size).toBe(200);
    for (const code of codes) expect(normalizeInvitationCode(code)).toMatch(/^[0-9A-HJKMNP-TV-Z]{20}$/);
  });

  it("uses domain separation and key versions for keyed digests", () => {
    expect(keyedDigest("context-a", "same", key)).not.toBe(keyedDigest("context-b", "same", key));
    expect(keyedDigest("context-a", "same", key)).not.toBe(keyedDigest("context-a", "same", { ...key, version: 2 }));
    expect(keyedDigest("context-a", "same", key)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps fake OTP values only in the injected in-memory outbox", async () => {
    const provider = new FakeOtpProvider();
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
    const result = await provider.send({ phoneE164: "+970590000001", code });
    expect(result.status).toBe("accepted");
    expect([...provider.outbox.values()]).toEqual([code]);
  });
});

describe("onboarding configuration isolation", () => {
  it("keeps the foundation and all public onboarding disabled by default", () => {
    const parsed = localConfig();
    expect(parsed.invitationsEnabled).toBe(false);
    expect(parsed.publicOnboardingEnabled).toBe(false);
    expect(parsed.onboarding).toBeUndefined();
  });

  it("requires every independent pepper when invitations are enabled", () => {
    expect(() => localConfig({ INVITATIONS_ENABLED: "true" })).toThrow(/pepper is required/);
    expect(localConfig({ INVITATIONS_ENABLED: "true", OTP_PROVIDER: "fake", ...enabledSecrets }).onboarding).toBeDefined();
  });

  it("rejects placeholder or reused onboarding peppers without echoing values", () => {
    expect(() => localConfig({
      INVITATIONS_ENABLED: "true",
      ...enabledSecrets,
      OTP_CODE_PEPPER: "replace-with-a-long-random-otp-pepper"
    })).toThrow(/placeholder/);
    const repeated = "same-sensitive-pepper-value-longer-than-thirty-two-characters";
    expect(() => localConfig({
      INVITATIONS_ENABLED: "true",
      ...enabledSecrets,
      OTP_CODE_PEPPER: repeated,
      PHONE_DIGEST_PEPPER: repeated
    })).toThrow(/must be distinct/);
    try {
      localConfig({ INVITATIONS_ENABLED: "true", ...enabledSecrets, OTP_CODE_PEPPER: repeated, PHONE_DIGEST_PEPPER: repeated });
    } catch (error) {
      expect(String(error)).not.toContain(repeated);
    }
  });

  it("rejects unsupported regions and any public-onboarding enablement", () => {
    expect(() => localConfig({ SUPPORTED_PHONE_REGIONS: "PS,IL" })).toThrow(/must be PS/);
    expect(() => localConfig({ PUBLIC_ONBOARDING_ENABLED: "true" })).toThrow(/not supported/);
  });

  it("rejects the fake provider in production even when no routes are enabled", () => {
    expect(() => createConfig({
      APP_ENV: "production",
      DATABASE_URL: "mysql://production:secret@db.internal:3306/masari",
      JWT_SECRET: "production-jwt-secret-longer-than-thirty-two-characters",
      REFRESH_TOKEN_PEPPER: "production-refresh-pepper-longer-than-thirty-two-characters",
      CORS_ORIGINS: "https://admin.masari.example",
      APP_RELEASE: "test",
      TRUST_PROXY: "none",
      OTP_PROVIDER: "fake"
    })).toThrow(/forbidden/);
  });
});
