import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, cp, mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir, userInfo } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import mysql from "mysql2/promise";

// This harness accepts a server executable, never a database URL or datadir.
// All destructive integration fixtures target databases created by this process.
assert(process.argv.includes("--confirm-disposable"), "confirm_disposable_required");
assert(process.env.FUNCTIONAL_QA_MYSQLD, "FUNCTIONAL_QA_MYSQLD_required");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keepRunning = process.argv.includes("--keep-running");
const flutterRoot = process.env.FUNCTIONAL_QA_FLUTTER_ROOT;
if (keepRunning) {
  assert(flutterRoot, "FUNCTIONAL_QA_FLUTTER_ROOT_required_for_keep_running");
  await access(join(flutterRoot, "bin/cache/dart-sdk/bin", process.platform === "win32" ? "dart.exe" : "dart"));
  await access(join(flutterRoot, "bin/cache/flutter_tools.snapshot"));
}
for (const path of [join(root, ".env"), join(root, "apps/api/.env"), ...[".env", ".env.local", ".env.development", ".env.development.local"].map((name) => join(root, "apps/admin", name))]) {
  await assert.rejects(access(path), { code: "ENOENT" }, "Run in a clean checkout without dotenv files");
}
const systemEnv = {};
for (const key of ["PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "COMSPEC", "PATHEXT", "APPDATA", "LOCALAPPDATA", "USERPROFILE", "PROGRAMFILES"]) {
  if (process.env[key] !== undefined) systemEnv[key] = process.env[key];
}
const pathKey = Object.keys(systemEnv).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
systemEnv[pathKey] = `${dirname(process.execPath)}${delimiter}${systemEnv[pathKey] ?? ""}`;
const runtime = await mkdtemp(join(tmpdir(), "masari-functional-"));
if (process.platform === "win32") {
  const acl = spawnSync("icacls", [runtime, "/inheritance:r", "/grant:r", `${userInfo().username}:(OI)(CI)F`, "*S-1-5-18:(OI)(CI)F"], { env: systemEnv, windowsHide: true, stdio: "ignore" });
  assert.equal(acl.status, 0, "private_runtime_acl_failed");
}
const password = randomBytes(32).toString("hex");
const secrets = [password];
const secret = () => { const value = randomBytes(32).toString("hex"); secrets.push(value); return value; };
async function freePort() {
  const server = createServer();
  await new Promise((ok, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", ok); });
  const port = server.address().port;
  await new Promise((ok) => server.close(ok));
  return port;
}
const port = await freePort();
const apiPort = await freePort();
const adminPort = await freePort();
const mobilePort = await freePort();
assert.equal(new Set([port, apiPort, adminPort, mobilePort]).size, 4, "qa_ports_must_be_unique");
const data = join(runtime, "data");
const bootstrap = join(runtime, "bootstrap.sql");
const emptyEnv = join(runtime, "empty.env");
await writeFile(emptyEnv, "# intentionally empty\n");
const env = { ...systemEnv, APP_ENV: "demo", ENABLE_DEMO_FEATURES: "true", APP_RELEASE: "local-functional-qa", LOG_LEVEL: "silent", TRUST_PROXY: "none", PORT: String(apiPort), API_BASE_URL: `http://127.0.0.1:${apiPort}`, DEMO_API_BASE_URL: `http://127.0.0.1:${apiPort}`, DOTENV_CONFIG_PATH: emptyEnv, ACCESS_TOKEN_TTL_SECONDS: "3600", REFRESH_TOKEN_TTL_DAYS: "30", CORS_ORIGINS: `http://127.0.0.1:${adminPort},http://127.0.0.1:${mobilePort}`, INVITATIONS_ENABLED: "true", PUBLIC_ONBOARDING_ENABLED: "false", OTP_PROVIDER: "fake", SUPPORTED_PHONE_REGIONS: "PS", MULTI_ROUTE_ENTRY_ENABLED: "false", MULTI_ROUTE_MATCHING_ENABLED: "false", CANONICAL_TRIP_CREATION_ENABLED: "false", CANONICAL_SHARED_TRIPS_ENABLED: "false", CI_MYSQL_LOOPBACK_QA: "true" };
for (const key of ["JWT_SECRET", "REFRESH_TOKEN_PEPPER", "AUTH_ACTION_TOKEN_PEPPER", "DEMO_RESET_KEY", "DEMO_PASSENGER_PASSWORD", "DEMO_DRIVER_PASSWORD", "DEMO_MERCHANT_PASSWORD", "DEMO_ADMIN_PASSWORD", "INVITATION_CODE_PEPPER", "PHONE_DIGEST_PEPPER", "OTP_CODE_PEPPER", "ONBOARDING_SESSION_PEPPER", "IDEMPOTENCY_KEY_PEPPER", "ABUSE_KEY_PEPPER"]) env[key] = secret();
env.npm_execpath = join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
if (process.argv.includes("--monitoring-expiry-regression")) {
  assert(process.argv.includes("--monitoring-only"), "expiry_regression_requires_monitoring_only");
  env.LEGACY_DISPATCH_INTERVAL_MS = "100";
}
const redact = (text) => secrets.reduce((result, value) => result.replaceAll(value, "[REDACTED]"), text).replace(/mysql:\/\/[^\s"']+/g, "mysql://[REDACTED]");
const checks = [];
async function command(args, environment, label) {
  console.log(`START ${label}`);
  const child = spawn(process.execPath, args, { cwd: root, env: environment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const timeout = setTimeout(() => {
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { env: systemEnv, windowsHide: true, stdio: "ignore" });
    else child.kill();
  }, 300_000);
  const status = await new Promise((ok, fail) => { child.once("error", fail); child.once("exit", ok); });
  clearTimeout(timeout);
  await writeFile(join(runtime, `${label}.log`), redact(output));
  console.log(`${status === 0 ? "PASS" : "FAIL"} ${label}`);
  assert.equal(status, 0, `${label} failed; inspect redacted runtime log`);
  checks.push(label);
}
console.log(`Evidence directory: ${runtime}`);
const init = spawnSync(process.env.FUNCTIONAL_QA_MYSQLD, ["--no-defaults", "--initialize-insecure", "--console", `--datadir=${data}`], { env: systemEnv, windowsHide: true, encoding: "utf8" });
if (init.status !== 0) console.error(redact((init.stdout ?? "") + (init.stderr ?? "") + String(init.error ?? "")));
assert.equal(init.status, 0, "isolated_mysql_initialization_failed");
await writeFile(bootstrap, `ALTER USER 'root'@'localhost' IDENTIFIED BY '${password}';\n`, { mode: 0o600 });
const server = spawn(process.env.FUNCTIONAL_QA_MYSQLD, ["--no-defaults", `--datadir=${data}`, `--port=${port}`, "--bind-address=127.0.0.1", "--mysqlx=OFF", `--init-file=${bootstrap}`, `--log-error=${join(runtime, "mysql.err")}`], { env: systemEnv, windowsHide: true, stdio: "ignore" });
let connection;
let api;
const clients = [];
const clientDiagnostics = new Map();
function startClient(label, executable, args, options) {
  const child = spawn(executable, args, { ...options, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const diagnostic = { label, output: "", stopped: false, saved: Promise.resolve() };
  const save = () => { diagnostic.stopped = true; diagnostic.saved = writeFile(join(runtime, `${label}.log`), redact(diagnostic.output)); };
  child.stdout.on("data", chunk => { diagnostic.output += chunk; });
  child.stderr.on("data", chunk => { diagnostic.output += chunk; });
  child.once("error", error => { diagnostic.output += `\nstartup_error:${error.code ?? "unknown"}`; save(); });
  child.once("exit", save);
  clients.push(child);
  clientDiagnostics.set(child, diagnostic);
  return child;
}
const prisma = "node_modules/prisma/build/index.js";
async function database(label) {
  const name = `masari_functional_${label}_${randomBytes(5).toString("hex")}_ci`;
  assert(/^masari_functional_[a-z_]+_[0-9a-f]{10}_ci$/.test(name));
  await connection.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const url = new URL(`mysql://127.0.0.1:${port}/${name}`);
  url.username = "root"; url.password = password;
  return { ...env, DATABASE_URL: url.toString(), DEMO_RESET_ALLOWED_DATABASES: name };
}
try {
  for (let attempt = 0; attempt < 150; attempt++) {
    try { connection = await mysql.createConnection({ host: "127.0.0.1", port, user: "root", password }); break; } catch { await delay(200); }
  }
  assert(connection, "isolated_mysql_start_failed");
  await writeFile(bootstrap, "-- consumed bootstrap credential\n");
  const [[version]] = await connection.query("SELECT VERSION() AS version");
  const currentEnv = await database("legacy");
  await command([prisma, "migrate", "deploy", "--config", "apps/api/prisma.config.ts"], currentEnv, "fresh_deploy");
  await command([prisma, "migrate", "deploy", "--config", "apps/api/prisma.config.ts"], currentEnv, "repeat_deploy");
  await command([prisma, "migrate", "status", "--config", "apps/api/prisma.config.ts"], currentEnv, "migration_status");
  const databaseName = new URL(currentEnv.DATABASE_URL).pathname.slice(1);
  // Reproduce the original setup defect at the real MySQL boundary, without weakening SQL mode.
  await assert.rejects(connection.query(`INSERT INTO \`${databaseName}\`.users (id,name,phone,password_hash,role) VALUES (?,?,?,?,?)`, ["functional_phone_probe", "TEST ONLY", `c7${"a".repeat(32)}-admin`, "unused", "admin"]), { code: "ER_DATA_TOO_LONG" });
  const [[probe]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${databaseName}\`.users WHERE id = 'functional_phone_probe'`);
  assert.equal(probe.count, 0);
  checks.push("original_monitoring_phone_rejected_without_partial_row");
  await command(["node_modules/typescript/bin/tsc", "-p", "apps/api/tsconfig.json"], currentEnv, "api_build");
  if (process.argv.includes("--monitoring-only")) {
    api = spawn(process.execPath, ["scripts/local-functional-qa-api.mjs"], { cwd: root, env: currentEnv, windowsHide: true, stdio: "ignore" });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { if ((await fetch(`${env.API_BASE_URL}/api/v1/health/ready`)).ok) { ready = true; break; } } catch {}
      await delay(250);
    }
    assert(ready, "isolated_api_not_ready");
    await command(["apps/api/dist/scripts/adminMatchingMonitoringIntegration.js"], currentEnv, "monitoring_regression");
  } else {
    const migrationRoot = join(root, "apps/api/prisma/migrations");
    const migrations = (await readdir(migrationRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    const prior = join(runtime, "prior");
    await mkdir(join(prior, "migrations"), { recursive: true });
    await cp(join(root, "apps/api/prisma/schema.prisma"), join(prior, "schema.prisma"));
    await cp(join(migrationRoot, "migration_lock.toml"), join(prior, "migrations/migration_lock.toml"));
    for (const migration of migrations.slice(0, -1)) await cp(join(migrationRoot, migration), join(prior, "migrations", migration), { recursive: true });
    const config = join(runtime, "prior.config.ts");
    await writeFile(config, `export default { schema: ${JSON.stringify(join(prior, "schema.prisma"))}, migrations: { path: ${JSON.stringify(join(prior, "migrations"))} }, datasource: { url: process.env.DATABASE_URL } };\n`);
    const upgradeEnv = await database("upgrade");
    await command([prisma, "migrate", "deploy", "--config", config], upgradeEnv, "prior_deploy");
    await command([prisma, "migrate", "deploy", "--config", "apps/api/prisma.config.ts"], upgradeEnv, "upgrade_deploy");
    await command([prisma, "migrate", "deploy", "--config", "apps/api/prisma.config.ts"], upgradeEnv, "upgrade_repeat_deploy");
    await command([prisma, "migrate", "status", "--config", "apps/api/prisma.config.ts"], upgradeEnv, "upgrade_status");
    await command(["scripts/ci-mysql-integration.mjs"], currentEnv, "mysql_workflow");
    for (const script of ["demoResetGateIntegration", "legacyOnlineStateIntegration", "passengerTripAssociationIntegration"]) await command([`apps/api/dist/scripts/${script}.js`], currentEnv, script);
    for (const [label, script, shared] of [["canonical", "canonicalMatchingIntegration", false], ["shared", "canonicalSharedMatchingIntegration", true]]) {
      const canonicalEnv = { ...await database(label), APP_ENV: shared ? "demo" : "test", MULTI_ROUTE_ENTRY_ENABLED: "true", MULTI_ROUTE_MATCHING_ENABLED: "true", CANONICAL_TRIP_CREATION_ENABLED: "true", CANONICAL_SHARED_TRIPS_ENABLED: String(shared) };
      await command([prisma, "migrate", "deploy", "--config", "apps/api/prisma.config.ts"], canonicalEnv, `${label}_deploy`);
      await command([`apps/api/dist/scripts/${script}.js`], canonicalEnv, script);
    }
  }
  if (process.argv.includes("--booking-probe")) {
    // Its deadline/rollback cases control their own HTTP app and clock. Do not
    // race them with the monitoring server's independent expiry worker.
    if (api?.exitCode === null) { api.kill(); await new Promise((ok) => api.once("exit", ok)); api = undefined; }
    await command(["apps/api/dist/scripts/legacyBookingIntegration.js"], currentEnv, "legacy_booking_probe");
  }
  const evidence = { runtime: version.version, realDatabase: true, checks, completedAt: new Date().toISOString() };
  await writeFile(join(runtime, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  if (keepRunning) {
    // Start from a deterministic seed only after every requested validation passes.
    if (api?.exitCode === null) { api.kill(); await new Promise((ok) => api.once("exit", ok)); }
    api = spawn(process.execPath, ["scripts/local-functional-qa-api.mjs"], { cwd: root, env: currentEnv, windowsHide: true, stdio: "ignore" });
    async function waitFor(url, timeoutMs = 180_000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        for (const diagnostic of clientDiagnostics.values()) if (diagnostic.stopped) {
          await diagnostic.saved;
          throw new Error(`local_qa_${diagnostic.label}_exited`);
        }
        try { if ((await fetch(url, { signal: AbortSignal.timeout(2_000) })).ok) return; } catch {}
        await delay(500);
      }
      throw new Error("local_qa_surface_not_ready");
    }
    await waitFor(`${env.API_BASE_URL}/api/v1/health/ready`);
    const reset = await fetch(`${env.API_BASE_URL}/api/v1/demo/reset`, { method: "POST", headers: { "content-type": "application/json", "x-demo-reset-key": env.DEMO_RESET_KEY }, body: "{}" });
    assert.equal(reset.status, 200, "local_qa_seed_failed");
    const urls = { api: env.API_BASE_URL, admin: `http://127.0.0.1:${adminPort}`, mobile: `http://127.0.0.1:${mobilePort}` };
    const logins = Object.fromEntries(["admin", "passenger", "driver", "merchant"].map((role) => [role, { email: `demo.${role}@masari.app`, password: env[`DEMO_${role.toUpperCase()}_PASSWORD`] }]));
    const defines = join(runtime, "mobile-defines.json");
    await writeFile(defines, JSON.stringify({ APP_ENV: "demo", API_BASE_URL: urls.api, ENABLE_DEMO_FEATURES: true, ...Object.fromEntries(["passenger", "driver", "merchant"].flatMap((role) => [[`DEMO_${role.toUpperCase()}_EMAIL`, logins[role].email], [`DEMO_${role.toUpperCase()}_PASSWORD`, logins[role].password]])) }, null, 2), { mode: 0o600 });
    await writeFile(join(runtime, "qa-private.json"), JSON.stringify({ root, urls, logins, environment: currentEnv, stopFile: join(runtime, "STOP") }, null, 2), { mode: 0o600 });
    startClient("admin", process.execPath, [join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(adminPort), "--strictPort"], { cwd: join(root, "apps/admin"), env: { ...systemEnv, VITE_APP_ENV: "demo", VITE_API_BASE_URL: urls.api, VITE_ENABLE_DEMO_FEATURES: "true", VITE_ROUTE_MANAGEMENT_ENABLED: "true", VITE_DEMO_ADMIN_EMAIL: logins.admin.email, VITE_DEMO_ADMIN_PASSWORD: env.DEMO_ADMIN_PASSWORD, VITE_DEMO_RESET_KEY: env.DEMO_RESET_KEY } });
    startClient("mobile", join(flutterRoot, "bin/cache/dart-sdk/bin", process.platform === "win32" ? "dart.exe" : "dart"), [`--packages=${join(flutterRoot, "packages/flutter_tools/.dart_tool/package_config.json")}`, join(flutterRoot, "bin/cache/flutter_tools.snapshot"), "run", "-d", "web-server", "--web-hostname", "127.0.0.1", "--web-port", String(mobilePort), "--no-pub", `--dart-define-from-file=${defines}`], { cwd: join(root, "apps/mobile"), env: { ...systemEnv, FLUTTER_ROOT: flutterRoot, FLUTTER_SUPPRESS_ANALYTICS: "true", CI: "true" } });
    await Promise.all([waitFor(urls.admin), waitFor(urls.mobile)]);
    console.log(JSON.stringify({ localQaReady: true, urls, privateRuntimeFile: join(runtime, "qa-private.json"), stopFile: join(runtime, "STOP") }));
    let stopping = false;
    process.once("SIGTERM", () => { stopping = true; });
    process.once("SIGINT", () => { stopping = true; });
    while (!stopping) {
      if ([api, server, ...clients].some((child) => child.exitCode !== null)) throw new Error("local_qa_child_stopped");
      try { await access(join(runtime, "STOP")); break; } catch {}
      await delay(1_000);
    }
  }
} finally {
  for (const child of clients) if (child.exitCode === null) {
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { env: systemEnv, windowsHide: true, stdio: "ignore" });
    else child.kill();
  }
  if (api?.exitCode === null) { api.kill(); await Promise.race([new Promise((ok) => api.once("exit", ok)), delay(12_000)]); }
  if (connection) { await connection.query("SHUTDOWN").catch(() => {}); await connection.end().catch(() => {}); }
  if (server.exitCode === null) server.kill();
}
