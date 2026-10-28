#!/usr/bin/env node
// Read-only deployment preflight for the Masari API environment.
// Usage: node scripts/deploy/preflight.mjs [--env-file <path>] [--target production|staging]
// Validates the environment against the rules in apps/api/src/config.ts and
// docs/deployment/DEPLOY_RUNBOOK.md. Prints PASS/FAIL/WARN per item and never
// prints a variable's value. Exit code 1 when any item FAILs.
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER_MARKERS = ["development-jwt-secret", "change-me", "changeme", "replace-with", "placeholder", "example", "your-"];
const PEPPERS = [
  "INVITATION_CODE_PEPPER",
  "PHONE_DIGEST_PEPPER",
  "OTP_CODE_PEPPER",
  "ONBOARDING_SESSION_PEPPER",
  "IDEMPOTENCY_KEY_PEPPER",
  "ABUSE_KEY_PEPPER"
];
// Flags config.ts rejects (or the runbook forbids) when set to true in staging/production.
const FORBIDDEN_TRUE = [
  "ENABLE_DEMO_FEATURES",
  "MULTI_ROUTE_ENTRY_ENABLED",
  "MULTI_ROUTE_MATCHING_ENABLED",
  "CANONICAL_TRIP_CREATION_ENABLED",
  "CANONICAL_SHARED_TRIPS_ENABLED",
  "CANONICAL_SHARED_TRIP_MOBILE_ENABLED",
  "PUBLIC_ONBOARDING_ENABLED",
  "ONBOARDING_TEST_LEGAL_FIXTURES_ENABLED"
];

export function parseEnvFile(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    env[match[1]] = value;
  }
  return env;
}

function isPlaceholder(value) {
  const v = value.trim().toLowerCase();
  return (v.startsWith("<") && v.endsWith(">")) || PLACEHOLDER_MARKERS.some((m) => v.includes(m));
}

// null = unset, false = invalid, true = valid and in range.
function intIn(value, min, max) {
  if (value === undefined || value === "") return null;
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= min && n <= max;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ target?: "production" | "staging" }} [options]
 * @returns {{ id: string, status: "PASS" | "FAIL" | "WARN", message: string }[]}
 */
export function runPreflight(env, options = {}) {
  const target = options.target ?? "production";
  const results = [];
  const add = (id, ok, message, level = "FAIL") => results.push({ id, status: ok ? "PASS" : level, message });
  const val = (name) => (env[name] ?? "").trim();
  const bool = (name) => val(name) === "true";

  add("APP_ENV", val("APP_ENV") === target, `APP_ENV must be "${target}"`);
  for (const name of FORBIDDEN_TRUE) {
    add(name, !bool(name), `${name} must not be true in ${target}`);
  }
  add("ROUTE_MANAGEMENT_ENABLED", ["", "true", "false"].includes(val("ROUTE_MANAGEMENT_ENABLED")), "ROUTE_MANAGEMENT_ENABLED must be true or false when set");

  const release = val("APP_RELEASE");
  add("APP_RELEASE", release !== "" && !isPlaceholder(release), "APP_RELEASE must be set to an immutable release id (not a <placeholder>)");

  const db = val("DATABASE_URL");
  add("DATABASE_URL", /^mysql:\/\/[^\s]+@[^\s/]+\/[A-Za-z0-9_]+/.test(db) && !isPlaceholder(db), "DATABASE_URL must be a real mysql://user:pass@host:port/db URL");

  const secrets = {};
  for (const name of ["JWT_SECRET", "REFRESH_TOKEN_PEPPER", "AUTH_ACTION_TOKEN_PEPPER"]) {
    const v = val(name);
    secrets[name] = v;
    add(name, v.length >= 32 && !isPlaceholder(v), `${name} must be set, at least 32 characters, not a placeholder`);
  }
  const core = Object.values(secrets).filter(Boolean);
  add("SECRETS_DISTINCT", new Set(core).size === core.length, "JWT_SECRET, REFRESH_TOKEN_PEPPER and AUTH_ACTION_TOKEN_PEPPER must differ from each other");

  if (bool("INVITATIONS_ENABLED")) {
    const peppers = PEPPERS.map((n) => [n, val(n)]);
    for (const [name, v] of peppers) add(name, v.length >= 32 && !isPlaceholder(v), `${name} required (32+ chars) when INVITATIONS_ENABLED=true`);
    const all = [...peppers.map(([, v]) => v), ...core].filter(Boolean);
    add("PEPPERS_DISTINCT", new Set(all).size === all.length, "all onboarding peppers must be distinct from each other and from core secrets");
  } else {
    results.push({ id: "ONBOARDING_PEPPERS", status: "PASS", message: "invitations disabled; onboarding peppers not required" });
  }

  const origins = val("CORS_ORIGINS").split(",").map((o) => o.trim()).filter(Boolean);
  const originOk = origins.length > 0 && origins.every((o) => {
    try {
      const u = new URL(o);
      return u.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    } catch {
      return false;
    }
  });
  add("CORS_ORIGINS", originOk, "CORS_ORIGINS must list explicit https:// non-local origins (no wildcard)");
  if (target === "production") {
    add("CORS_ORIGINS_DOMAIN", origins.includes("https://masari.aynur.ps"), "production CORS_ORIGINS is expected to include https://masari.aynur.ps", "WARN");
  }

  add("TRUST_PROXY", /^([0-5]|none)$/.test(val("TRUST_PROXY")), "TRUST_PROXY must be none, 0, or a hop count 1-5 (explicit)");

  add("ACCESS_TOKEN_TTL_SECONDS", intIn(val("ACCESS_TOKEN_TTL_SECONDS"), 300, 1800) !== false, "ACCESS_TOKEN_TTL_SECONDS must be 300-1800 when set (default 900)");
  add("REFRESH_TOKEN_TTL_DAYS", intIn(val("REFRESH_TOKEN_TTL_DAYS"), 1, 90) !== false, "REFRESH_TOKEN_TTL_DAYS must be 1-90 when set (default 30)");
  add("RATE_LIMIT_GLOBAL_MAX", intIn(val("RATE_LIMIT_GLOBAL_MAX"), 50, 1000) !== false, "RATE_LIMIT_GLOBAL_MAX must be 50-1000 when set");
  add("RATE_LIMIT_LOGIN_MAX", intIn(val("RATE_LIMIT_LOGIN_MAX"), 3, 50) !== false, "RATE_LIMIT_LOGIN_MAX must be 3-50 when set");

  add("OTP_PROVIDER", val("OTP_PROVIDER") !== "fake", "OTP_PROVIDER=fake is forbidden (use disabled until an approved SMS provider is integrated)");
  add("SUPPORTED_PHONE_REGIONS", (val("SUPPORTED_PHONE_REGIONS") || "PS").toUpperCase() === "PS", "SUPPORTED_PHONE_REGIONS must be PS");
  add("GOOGLE_PASSENGER_SIGNUP_MODE", (val("GOOGLE_PASSENGER_SIGNUP_MODE") || "disabled") === "disabled", "Google passenger signup must stay disabled in staging/production (config refuses otherwise)");

  const mapsOn = bool("ROUTE_MAPS_ENABLED");
  const provider = val("ROUTE_PROVIDER") || "disabled";
  add("ROUTE_PROVIDER", provider !== "fake" && (mapsOn || provider === "disabled"), "ROUTE_PROVIDER must be disabled when maps are off, and never fake");
  if (mapsOn) add("ROUTE_PROVIDER_SECRET", val("ROUTE_PROVIDER_SECRET").length >= 8 && !isPlaceholder(val("ROUTE_PROVIDER_SECRET")), "ROUTE_PROVIDER_SECRET required for a live route provider");
  add("ROUTE_PROVIDER_CACHE_TTL_SECONDS", (val("ROUTE_PROVIDER_CACHE_TTL_SECONDS") || "0") === "0", "ROUTE_PROVIDER_CACHE_TTL_SECONDS must be 0");

  if (bool("DRIVER_DOCUMENTS_ENABLED")) {
    const dir = val("DRIVER_DOCUMENTS_DIR");
    add("DRIVER_DOCUMENTS_DIR", dir !== "" && isAbsolute(dir), "DRIVER_DOCUMENTS_DIR must be an absolute path on persistent storage when driver documents are enabled");
  } else {
    results.push({ id: "DRIVER_DOCUMENTS", status: "WARN", message: "DRIVER_DOCUMENTS_ENABLED is not true; driver and merchant document uploads will be unavailable" });
  }

  add("PORT", intIn(val("PORT") || "3000", 1, 65535) !== false, "PORT must be a valid port number");

  // Delivery providers are not configured through environment variables today
  // (see runbook "Known gaps"); remind the operator without failing the env check.
  results.push({ id: "EMAIL_SMS_DELIVERY", status: "WARN", message: "approved email/SMS delivery cannot be verified from the environment; confirm per the runbook (known gap G1)" });
  return results;
}

function parseArgs(argv) {
  const args = { envFile: undefined, target: "production" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--env-file") args.envFile = argv[++i];
    else if (argv[i] === "--target") args.target = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!["production", "staging"].includes(args.target)) throw new Error("--target must be production or staging");
  return args;
}

export function main(argv, processEnv = process.env, write = (line) => process.stdout.write(`${line}\n`)) {
  const args = parseArgs(argv);
  const env = args.envFile ? parseEnvFile(readFileSync(args.envFile, "utf8")) : processEnv;
  const results = runPreflight(env, { target: args.target });
  for (const r of results) write(`${r.status.padEnd(4)}  ${r.id}  ${r.message}`);
  const failed = results.filter((r) => r.status === "FAIL").length;
  const warned = results.filter((r) => r.status === "WARN").length;
  write(`\n${results.length - failed - warned} passed, ${failed} failed, ${warned} warnings (${args.envFile ? "env file" : "process env"}, target ${args.target})`);
  return failed === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`preflight error: ${error.message}\n`);
    process.exitCode = 2;
  }
}
