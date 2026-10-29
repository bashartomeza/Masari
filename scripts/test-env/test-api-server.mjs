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
const { createGmailDelivery, createPhoneCodeMailer } = await import("./gmail-sender.mjs");

// With a stored Gmail App Password the email is also really sent; the file is kept either way,
// and a failed send is reported in the log without blocking the sign-up. Phone codes have no SMS
// provider in the demo, so they are emailed to DEMO_CODE_INBOX (default: the sender's own inbox).
const smtpReady = Boolean(process.env.DEMO_SMTP_USER && process.env.DEMO_SMTP_PASSWORD);
const gmail = smtpReady
  ? createGmailDelivery({ user: process.env.DEMO_SMTP_USER, appPassword: process.env.DEMO_SMTP_PASSWORD })
  : null;
const phoneMailer = smtpReady
  ? createPhoneCodeMailer({ user: process.env.DEMO_SMTP_USER, appPassword: process.env.DEMO_SMTP_PASSWORD, inbox: process.env.DEMO_CODE_INBOX || process.env.DEMO_SMTP_USER })
  : null;
delete process.env.DEMO_SMTP_PASSWORD;

// The scripted checks use fixed QA numbers and read the codes from the file, so they are not emailed.
const automatedPhone = /^\+97059000(02|03)\d{2}$/;
function emailPhoneCode(input) {
  if (!phoneMailer || automatedPhone.test(input.phoneE164)) return;
  void sendPhoneCode(input);
}
async function sendPhoneCode(input) {
  try {
    await phoneMailer.send(input);
    console.log(`phone code for ${input.phoneE164} emailed to the demo inbox`);
  } catch (error) {
    console.error(`phone code for ${input.phoneE164} could not be emailed: ${error instanceof Error ? error.message : "unknown"}`);
  }
}

class LoggingOtpProvider extends FakeOtpProvider {
  async send(input) {
    appendFileSync(otpFile, `${new Date().toISOString()} ${input.phoneE164} ${input.code}\n`);
    emailPhoneCode(input);
    return super.send(input);
  }
}
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
    emailPhoneCode(input);
  }
};

const app = createApp(config, {
  otpProvider: new LoggingOtpProvider(),
  emailDelivery: loggingEmailDelivery,
  phoneVerificationProvider: loggingPhoneProvider
});
app.listen(config.port, "0.0.0.0", () => console.log(`Masari test API on ${config.port} (database ${databaseName})`));
