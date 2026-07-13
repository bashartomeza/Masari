import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import mariadb from "mariadb";

const root = resolve(import.meta.dirname, "..");
loadEnv({ path: resolve(root, "apps/api/.env"), quiet: true });
const apiBaseUrl = process.env.DEMO_API_BASE_URL ?? "http://localhost:3000";
const adminUrl = process.env.DEMO_ADMIN_URL ?? "http://localhost:5173";
const emulatorApiUrl = "http://10.0.2.2:3000";
const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`[pass] ${name}: ${detail}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.error(`[fail] ${name}: ${detail}`);
}

async function checkHttp(name, url, validate) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return fail(name, `${url} returned ${response.status}`);
    if (validate) {
      const validationError = await validate(response);
      if (validationError) return fail(name, `${url} ${validationError}`);
    }
    pass(name, url);
  } catch (error) {
    fail(name, `${url} is unavailable (${error instanceof Error ? error.message : "unknown error"})`);
  }
}

for (const name of ["DATABASE_URL", "JWT_SECRET", "DEMO_RESET_KEY"]) {
  if (process.env[name]) pass(`environment ${name}`, "configured");
  else fail(`environment ${name}`, "missing");
}

if (process.env.DATABASE_URL) {
  let connection;
  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    if (databaseUrl.protocol !== "mysql:") throw new Error("unexpected provider");
    connection = await mariadb.createConnection({
      host: databaseUrl.hostname,
      port: Number(databaseUrl.port || 3306),
      user: decodeURIComponent(databaseUrl.username),
      password: decodeURIComponent(databaseUrl.password),
      database: databaseUrl.pathname.replace(/^\//, "")
    });
    const rows = await connection.query(
      "SELECT DATABASE() AS database_name, @@character_set_database AS character_set, @@collation_database AS collation"
    );
    if (rows[0]?.database_name !== "masari") throw new Error("unexpected database");
    if (rows[0]?.character_set !== "utf8mb4") throw new Error("unexpected character set");
    pass("database provider", "mysql");
    pass("MySQL", "reachable; masari uses utf8mb4");
    pass("MySQL collation", String(rows[0]?.collation ?? "configured"));
  } catch {
    fail("MySQL", "connection or provider verification failed");
  } finally {
    await connection?.end().catch(() => undefined);
  }
}

await checkHttp("API health", `${apiBaseUrl}/api/v1/health`, async (response) => {
  const body = await response.json().catch(() => null);
  return body?.ok === true && body?.service === "masari-api" ? undefined : "is not the Masari API";
});
await checkHttp("admin console", adminUrl, async (response) => {
  const body = await response.text();
  return body.includes("<title>Masari Demo Console</title>") ? undefined : "is not the Masari admin console";
});

const adminExample = readFileSync(resolve(root, "apps/admin/.env.example"), "utf8");
if (adminExample.includes("VITE_API_BASE_URL=http://localhost:3000")) {
  pass("admin API URL", "http://localhost:3000");
} else {
  fail("admin API URL", "apps/admin/.env.example is not aligned to port 3000");
}

const mobileConfig = readFileSync(resolve(root, "apps/mobile/lib/core/config/app_config.dart"), "utf8");
if (mobileConfig.includes(`defaultValue: '${emulatorApiUrl}'`)) {
  pass("mobile API URL", emulatorApiUrl);
} else {
  fail("mobile API URL", `AppConfig default is not ${emulatorApiUrl}`);
}

const apkPath = resolve(root, "apps/mobile/build/app/outputs/flutter-apk/app-debug.apk");
if (existsSync(apkPath)) pass("debug APK", apkPath);
else fail("debug APK", `missing at ${apkPath}`);

const adb = spawnSync("adb", ["devices"], { encoding: "utf8", shell: process.platform === "win32" });
if (adb.status === 0) {
  const devices = adb.stdout
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => /\tdevice$/.test(line));
  if (devices.length > 0) pass("Android device", devices.join(", "));
  else fail("Android device", "no connected emulator/device in adb state 'device'");
} else {
  fail("Android device", "adb is unavailable");
}

const failed = checks.filter((check) => !check.ok);
console.log(`[demo:preflight] ${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) process.exitCode = 1;
