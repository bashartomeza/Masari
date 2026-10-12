import { describe, expect, it } from "vitest";
import {
  assertDemoResetDatabaseSafe,
  databaseNameFromUrl,
  DemoResetDatabaseNotAllowedError,
  evaluateDemoResetSafety
} from "../lib/demoResetSafety.js";

const base = {
  appEnv: "demo",
  databaseUrl: "mysql://user:secret@localhost:3306/masari_demo_ci",
  demoFeaturesEnabled: true,
  demoResetAllowedDatabases: ["masari_demo_ci"]
};

describe("demo reset database safety", () => {
  it("allows only the exact explicitly approved database", () => {
    expect(evaluateDemoResetSafety(base)).toEqual({ allowed: true, reason: "allowed" });
    expect(() => assertDemoResetDatabaseSafe(base)).not.toThrow();
  });

  it("permanently protects masari even if it is accidentally allow-listed", () => {
    const result = evaluateDemoResetSafety({
      ...base,
      databaseUrl: "mysql://user:secret@localhost:3306/masari",
      demoResetAllowedDatabases: ["masari"]
    });
    expect(result).toEqual({ allowed: false, reason: "protected_database" });
    expect(evaluateDemoResetSafety({
      ...base,
      databaseUrl: "mysql://user:secret@localhost:3306/MASARI",
      demoResetAllowedDatabases: ["MASARI"]
    })).toEqual({ allowed: false, reason: "protected_database" });
  });

  it.each([
    [{ ...base, demoResetAllowedDatabases: [] }, "database_not_allowlisted"],
    [{ ...base, databaseUrl: "mysql://user:secret@localhost:3306/other_ci" }, "database_not_allowlisted"],
    [{ ...base, databaseUrl: "malformed" }, "invalid_database_url"],
    [{ ...base, appEnv: "production" }, "environment_not_allowed"],
    [{ ...base, demoFeaturesEnabled: false }, "features_disabled"]
  ] as const)("fails closed without exposing connection details", (input, reason) => {
    expect(evaluateDemoResetSafety(input)).toEqual({ allowed: false, reason });
    expect(() => assertDemoResetDatabaseSafe(input)).toThrow(DemoResetDatabaseNotAllowedError);
  });

  it("extracts only bounded MySQL database identifiers", () => {
    expect(databaseNameFromUrl(base.databaseUrl)).toBe("masari_demo_ci");
    expect(databaseNameFromUrl("postgres://user:secret@localhost/masari_demo_ci")).toBeNull();
    expect(databaseNameFromUrl("mysql://user:secret@localhost/unsafe/name")).toBeNull();
  });
});
