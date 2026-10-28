// Test-environment API: the real app, with one difference. The fake one-time-code
// provider also appends each code to a file, so a tester can finish onboarding on
// a phone, and the email sender writes the email verification token to a second file
// so a normal user can finish sign-up without a real inbox. It refuses to run unless the database is an explicitly reset-safe,
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
const emailFile = resolve(dirname(otpFile), "email-codes.txt");
mkdirSync(dirname(otpFile), { recursive: true });

const { createApp } = await import(dist("app.js"));
const { FakeOtpProvider } = await import(dist("lib/otp.js"));
const { createGmailDelivery } = await import("./gmail-sender.mjs");

class LoggingOtpProvider extends FakeOtpProvider {
  async send(input) {
    appendFileSync(otpFile, `${new Date().toISOString()} ${input.phoneE164} ${input.code}\n`);
    return super.send(input);
  }
}

// With a stored Gmail App Password the email is also really sent; the file is kept either way,
// and a failed send is reported in the log without blocking the sign-up.
const gmail = process.env.DEMO_SMTP_USER && process.env.DEMO_SMTP_PASSWORD
  ? createGmailDelivery({ user: process.env.DEMO_SMTP_USER, appPassword: process.env.DEMO_SMTP_PASSWORD })
  : null;
delete process.env.DEMO_SMTP_PASSWORD;
const loggingEmailDelivery = {
  kind: "test",
  async send(message) {
    appendFileSync(emailFile, `${new Date().toISOString()} ${message.to} ${message.purpose} ${message.actionToken}
`);
    if (!gmail) return;
    try {
      await gmail.send(message);
      console.log(`email sent to ${message.to} (${message.purpose})`);
    } catch (error) {
      console.error(`email to ${message.to} could not be sent: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
};

// The phone check a normal user does after email sign-up goes to the same file as the invited codes.
const loggingPhoneProvider = {
  kind: "test",
  async send(input) {
    appendFileSync(otpFile, `${new Date().toISOString()} ${input.phoneE164} ${input.code}
`);
  }
};

const app = createApp(config, {
  otpProvider: new LoggingOtpProvider(),
  emailDelivery: loggingEmailDelivery,
  phoneVerificationProvider: loggingPhoneProvider
});
app.listen(config.port, "0.0.0.0", () => console.log(`Masari test API on ${config.port} (database ${databaseName})`));
