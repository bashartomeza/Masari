// Test-environment API: the real app, with one difference. The fake one-time-code
// provider also appends each code to a file, so a tester can finish onboarding on
// a phone. It refuses to run unless the database is an explicitly reset-safe,
// disposable one, so it cannot be pointed at real data by accident.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "../..");
const dist = (path) => pathToFileURL(resolve(root, "apps/api/dist", path)).href;

const { config } = await import(dist("config.js"));
const databaseName = new URL(process.env.DATABASE_URL ?? "mysql://invalid/").pathname.slice(1);
const allowed = (process.env.DEMO_RESET_ALLOWED_DATABASES ?? "").split(",").map((value) => value.trim()).filter(Boolean);
if (config.isProduction || config.isStaging || databaseName.toLowerCase() === "masari" || !allowed.includes(databaseName)) {
  throw new Error("The test API only runs outside staging/production on an allow-listed disposable database.");
}

const otpFile = process.env.TEST_OTP_FILE;
if (!otpFile) throw new Error("TEST_OTP_FILE is required.");
mkdirSync(dirname(otpFile), { recursive: true });

const { createApp } = await import(dist("app.js"));
const { FakeOtpProvider } = await import(dist("lib/otp.js"));

class LoggingOtpProvider extends FakeOtpProvider {
  async send(input) {
    appendFileSync(otpFile, `${new Date().toISOString()} ${input.phoneE164} ${input.code}\n`);
    return super.send(input);
  }
}

const app = createApp(config, { otpProvider: new LoggingOtpProvider() });
app.listen(config.port, "0.0.0.0", () => console.log(`Masari test API on ${config.port} (database ${databaseName})`));
