import { createHash } from "node:crypto";
import request from "supertest";
import { createApp } from "../app.js";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { FakeOtpProvider } from "../lib/otp.js";
import { resetDemoData, DEMO_ACCOUNTS } from "../modules/demoReset.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const checks: string[] = [];
function check(condition: unknown, name: string) {
  assert(condition, name);
  checks.push(name);
}

const provider = new FakeOtpProvider();
const app = createApp(config, { otpProvider: provider });

function key(label: string) {
  return `integration-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function seedLegalFixtures() {
  assert(config.publicRegistration?.testLegalFixturesEnabled, "Test legal fixtures must be explicitly enabled");
  assert(!config.isStaging && !config.isProduction, "Test legal fixtures are forbidden in production-like environments");
  const effectiveAt = new Date("2026-07-19T00:00:00.000Z");
  for (const locale of ["ar", "en"] as const) {
    for (const type of ["terms", "privacy", "adult_self_attestation"] as const) {
      const content = `TEST/DEMO ONLY - NOT PRODUCTION LEGAL CONTENT - ${locale} - ${type}`;
      await prisma.consentDocument.create({
        data: {
          document_type: type,
          version: "test-demo-2026-07-v1",
          locale,
          content_digest: createHash("sha256").update(content).digest("hex"),
          content_reference: content,
          effective_at: effectiveAt,
          legal_approved_at: effectiveAt,
          legal_approved_by: "TEST/DEMO ONLY"
        }
      });
    }
  }
}

async function adminToken() {
  const response = await request(app).post("/api/v1/auth/login").send({
    phone: DEMO_ACCOUNTS.admin.phone,
    password: config.demo!.adminPassword
  });
  assert(response.status === 200, "Admin login failed");
  return response.body.token as string;
}

async function invitation(token: string, role: "passenger" | "driver" | "merchant", phone: string) {
  const response = await request(app)
    .post("/api/v1/admin/invitations")
    .set("authorization", `Bearer ${token}`)
    .send({ role, phone, region: "PS", source: "integration" });
  assert(response.status === 201, `Invitation creation failed for ${role}`);
  return response.body.code as string;
}

async function start(code: string, role: "passenger" | "driver" | "merchant", phone: string, idempotency = key("start")) {
  provider.outbox.clear();
  const response = await request(app)
    .post("/api/v1/onboarding/attempts")
    .set("idempotency-key", idempotency)
    .send({ invitation_code: code, role, phone, region: "PS", locale: "ar" });
  return response;
}

function latestOtp() {
  const values = [...provider.outbox.values()];
  assert(values.length === 1, "Expected exactly one OTP in the injected fake provider outbox");
  return values[0];
}

async function verify(attemptId: string, token: string, otp: string, idempotency = key("verify")) {
  return request(app)
    .post(`/api/v1/onboarding/attempts/${attemptId}/verify`)
    .set("authorization", `Onboarding ${token}`)
    .set("idempotency-key", idempotency)
    .send({ otp });
}

async function consents(locale = "ar") {
  const response = await request(app).get("/api/v1/onboarding/consents").query({ locale });
  assert(response.status === 200, "Consent retrieval failed");
  return (response.body.documents as Array<{ id: string; type: string; content_hash: string }>).map(
    ({ id, type, content_hash }) => ({ id, type, content_hash })
  );
}

async function complete(
  attemptId: string,
  token: string,
  grant: string,
  documents: Array<{ id: string; type: string; content_hash: string }>,
  displayName: string,
  password: string,
  idempotency = key("complete")
) {
  return request(app)
    .post(`/api/v1/onboarding/attempts/${attemptId}/complete`)
    .set("authorization", `Onboarding ${token}`)
    .set("idempotency-key", idempotency)
    .send({
      registration_grant: grant,
      display_name: displayName,
      password,
      locale: "ar",
      consents: documents,
      adult_self_attestation: true
    });
}

async function onboard(
  admin: string,
  role: "passenger" | "driver" | "merchant",
  phone: string,
  name: string,
  password: string
) {
  const code = await invitation(admin, role, phone);
  const started = await start(code, role, phone);
  assert(started.status === 201, `${role} onboarding did not start`);
  const otp = latestOtp();
  const verified = await verify(started.body.attempt.id, started.body.onboarding_token, otp);
  assert(verified.status === 200, `${role} phone verification failed`);
  const completed = await complete(
    started.body.attempt.id,
    started.body.onboarding_token,
    verified.body.registration_grant,
    await consents(),
    name,
    password
  );
  return { started, verified, completed };
}

async function main() {
  check(config.publicOnboardingEnabled, "public onboarding enabled only for disposable integration environment");
  check(config.onboarding?.otpProvider === "fake", "fake provider enforced");
  await resetDemoData();
  await seedLegalFixtures();
  const admin = await adminToken();

  const publicConfig = await request(app).get("/api/v1/onboarding/config");
  check(publicConfig.status === 200 && publicConfig.body.enabled === true, "enabled public config");
  check(!JSON.stringify(publicConfig.body).includes("provider"), "config does not expose provider");
  check(publicConfig.body.request_id, "config request ID");
  const legal = await consents();
  check(legal.length === 3, "complete approved consent set");
  check((await request(app).get("/api/v1/onboarding/consents").query({ locale: "fr" })).status === 400, "consent locale validation");

  const removedLegal = await prisma.consentDocument.findFirstOrThrow({ where: { locale: "en", document_type: "privacy" } });
  await prisma.consentDocument.delete({ where: { id: removedLegal.id } });
  const unavailableConfig = await request(app).get("/api/v1/onboarding/config");
  check(unavailableConfig.status === 200 && unavailableConfig.body.enabled === false, "missing legal document safely disables onboarding");
  await prisma.consentDocument.create({ data: {
    id: removedLegal.id,
    document_type: removedLegal.document_type,
    version: removedLegal.version,
    locale: removedLegal.locale,
    content_digest: removedLegal.content_digest,
    content_reference: removedLegal.content_reference,
    effective_at: removedLegal.effective_at,
    retired_at: removedLegal.retired_at,
    legal_approved_at: removedLegal.legal_approved_at,
    legal_approved_by: removedLegal.legal_approved_by
  } });

  const invalid = await start("00000-00000-00000-00000", "passenger", "+970599111111");
  check(invalid.status === 404 && invalid.body.error === "onboarding_unavailable", "invalid invitation is generic");
  const mismatchCode = await invitation(admin, "passenger", "+970599111112");
  const mismatch = await start(mismatchCode, "driver", "+970599111112");
  check(mismatch.status === 404 && mismatch.body.error === "onboarding_unavailable", "role mismatch is generic");

  const rejectedProvider = new FakeOtpProvider("rejected");
  const rejectedApp = createApp(config, { otpProvider: rejectedProvider });
  const rejectedCode = await invitation(admin, "passenger", "+970599111118");
  const rejectedStart = await request(rejectedApp)
    .post("/api/v1/onboarding/attempts")
    .set("idempotency-key", key("rejected-start"))
    .send({ invitation_code: rejectedCode, role: "passenger", phone: "+970599111118", region: "PS", locale: "ar" });
  check(rejectedStart.status === 201 && rejectedStart.body.next_action === "resend_otp", "provider rejection leaves recoverable attempt");
  check(!JSON.stringify(rejectedStart.body).includes("rejected"), "provider rejection details stay private");
  const rejectedChallenge = await prisma.otpChallenge.findFirstOrThrow({ where: { onboarding_attempt_id: rejectedStart.body.attempt.id } });
  check(rejectedChallenge.delivery_status === "rejected" && rejectedChallenge.consumed_at === null, "rejected challenge is unverifiable");

  const raceCode = await invitation(admin, "passenger", "+970599111113");
  provider.outbox.clear();
  const raceRequests = await Promise.all([
    request(app).post("/api/v1/onboarding/attempts").set("idempotency-key", key("race-a")).send({ invitation_code: raceCode, role: "passenger", phone: "+970599111113", region: "PS", locale: "ar" }),
    request(app).post("/api/v1/onboarding/attempts").set("idempotency-key", key("race-b")).send({ invitation_code: raceCode, role: "passenger", phone: "+970599111113", region: "PS", locale: "ar" })
  ]);
  check(raceRequests.every((response) => [200, 201].includes(response.status)), "concurrent start safely resumes");
  check(new Set(raceRequests.map((response) => response.body.attempt.id)).size === 1, "concurrent start creates one attempt");
  check(await prisma.invitationRedemption.count({ where: { onboarding_attempt_id: raceRequests[0].body.attempt.id } }) === 1, "concurrent start creates one redemption");
  check(provider.outbox.size === 1, "concurrent start sends one OTP");
  const resumed = await start(raceCode, "passenger", "+970599111113", key("lost-response"));
  check(resumed.status === 200 && resumed.body.attempt.id === raceRequests[0].body.attempt.id, "lost response resumes same attempt");
  check(resumed.body.onboarding_token !== raceRequests[0].body.onboarding_token, "resume rotates continuation token");
  check(provider.outbox.size === 0, "resume does not send duplicate OTP");

  const raceAttemptId = raceRequests[0].body.attempt.id as string;
  const firstChallenge = await prisma.onboardingAttempt.findUniqueOrThrow({ where: { id: raceAttemptId }, select: { current_challenge_id: true } });
  await prisma.otpChallenge.update({ where: { id: firstChallenge.current_challenge_id! }, data: { last_sent_at: new Date(Date.now() - 120_000) } });
  provider.outbox.clear();
  const acceptedResend = await request(app)
    .post(`/api/v1/onboarding/attempts/${raceAttemptId}/resend`)
    .set("authorization", `Onboarding ${resumed.body.onboarding_token}`)
    .set("idempotency-key", key("resend-accepted"))
    .send({});
  check(acceptedResend.status === 200 && acceptedResend.body.status === "otp_sent", "resend acceptance succeeds");
  const afterAcceptedResend = await prisma.onboardingAttempt.findUniqueOrThrow({ where: { id: raceAttemptId }, select: { current_challenge_id: true } });
  check(afterAcceptedResend.current_challenge_id !== firstChallenge.current_challenge_id, "accepted resend promotes a new challenge");
  check((await prisma.otpChallenge.findUniqueOrThrow({ where: { id: firstChallenge.current_challenge_id! } })).superseded_at !== null, "accepted resend supersedes previous challenge");
  await prisma.otpChallenge.update({ where: { id: afterAcceptedResend.current_challenge_id! }, data: { last_sent_at: new Date(Date.now() - 120_000) } });
  const rejectedResend = await request(rejectedApp)
    .post(`/api/v1/onboarding/attempts/${raceAttemptId}/resend`)
    .set("authorization", `Onboarding ${resumed.body.onboarding_token}`)
    .set("idempotency-key", key("resend-rejected"))
    .send({});
  check(rejectedResend.status === 200 && rejectedResend.body.status === "verification_temporarily_unavailable", "rejected resend is safely retryable");
  check((await prisma.onboardingAttempt.findUniqueOrThrow({ where: { id: raceAttemptId } })).current_challenge_id === afterAcceptedResend.current_challenge_id, "rejected resend preserves prior challenge");
  await prisma.otpChallenge.update({ where: { id: afterAcceptedResend.current_challenge_id! }, data: { last_sent_at: new Date(Date.now() - 120_000) } });
  const concurrentResends = await Promise.all([
    request(app).post(`/api/v1/onboarding/attempts/${raceAttemptId}/resend`).set("authorization", `Onboarding ${resumed.body.onboarding_token}`).set("idempotency-key", key("resend-race-a")).send({}),
    request(app).post(`/api/v1/onboarding/attempts/${raceAttemptId}/resend`).set("authorization", `Onboarding ${resumed.body.onboarding_token}`).set("idempotency-key", key("resend-race-b")).send({})
  ]);
  check(concurrentResends.filter((response) => response.status === 200).length === 1, "concurrent resend has one winner");
  check(concurrentResends.some((response) => response.status === 429), "concurrent resend cannot bypass cooldown");

  const passengerPassword = "مساري secure pass 2026";
  const passenger = await onboard(admin, "passenger", "+970599111114", "مستخدم مساري", passengerPassword);
  check(passenger.completed.status === 201, "passenger completion succeeds");
  check(passenger.completed.body.account_status === "active" && passenger.completed.body.next_action === "login", "passenger is active and must login");
  check(!passenger.completed.body.token && !passenger.completed.body.refresh_token, "completion issues no operational session");
  const passengerUser = await prisma.user.findUniqueOrThrow({ where: { phone: "+970599111114" } });
  check(await prisma.authSession.count({ where: { user_id: passengerUser.id } }) === 0, "passenger completion creates no auth session");
  check(await prisma.refreshToken.count({ where: { session: { user_id: passengerUser.id } } }) === 0, "passenger completion creates no refresh token");
  const login = await request(app).post("/api/v1/auth/login").send({ phone: "٠٥٩٩١١١١١٤", region: "PS", password: passengerPassword });
  check(login.status === 200 && login.body.user.role === "passenger", "passenger login accepts normalized local digits");

  const driverPassword = "driver secure pass 2026";
  const driver = await onboard(admin, "driver", "+970599111115", "سائق مساري", driverPassword);
  check(driver.completed.status === 201 && driver.completed.body.account_status === "pending", "driver is pending");
  check(Boolean(driver.completed.body.onboarding_status_token), "driver receives narrow status token");
  const driverStatus = await request(app).get("/api/v1/onboarding/status").set("authorization", `Onboarding ${driver.completed.body.onboarding_status_token}`);
  check(driverStatus.status === 200 && driverStatus.body.onboarding_status === "pending_review", "pending status endpoint works");
  check((await request(app).get("/api/v1/driver/routes").set("authorization", `Onboarding ${driver.completed.body.onboarding_status_token}`)).status === 401, "pending token cannot access operational routes");
  check((await request(app).post("/api/v1/auth/login").send({ phone: "+970599111115", password: driverPassword })).status === 403, "pending driver cannot login");
  const recovered = await request(app).post("/api/v1/onboarding/status-sessions").send({ phone: "+970599111115", region: "PS", password: driverPassword });
  check(recovered.status === 200 && recovered.body.onboarding_status === "pending_review", "pending status recovery works");
  const wrongRecovery = await request(app).post("/api/v1/onboarding/status-sessions").send({ phone: "+970599111115", region: "PS", password: "wrong password value" });
  check(wrongRecovery.status === 401 && wrongRecovery.body.error === "invalid_credentials", "wrong recovery credentials are generic");

  const merchant = await onboard(admin, "merchant", "+970599111116", "تاجر مساري", "merchant secure pass 2026");
  check(merchant.completed.status === 201 && merchant.completed.body.account_status === "pending", "merchant is pending");
  check(!merchant.completed.body.token && Boolean(merchant.completed.body.onboarding_status_token), "merchant receives status token only");

  const replayKey = key("verify-replay");
  const replayCode = await invitation(admin, "passenger", "+970599111117");
  const replayStart = await start(replayCode, "passenger", "+970599111117");
  const replayOtp = latestOtp();
  const firstVerify = await verify(replayStart.body.attempt.id, replayStart.body.onboarding_token, replayOtp, replayKey);
  const secondVerify = await verify(replayStart.body.attempt.id, replayStart.body.onboarding_token, replayOtp, replayKey);
  check(firstVerify.status === 200 && secondVerify.status === 200, "exact verify replay succeeds safely");
  check(firstVerify.body.registration_grant !== secondVerify.body.registration_grant, "verify replay rotates raw grant");
  const conflictVerify = await verify(replayStart.body.attempt.id, replayStart.body.onboarding_token, "000000", replayKey);
  check(conflictVerify.status === 409 && conflictVerify.body.error === "registration_conflict", "same idempotency key with different payload conflicts");

  const mismatchedConsents = legal.map((document, index) => index === 0 ? { ...document, content_hash: "0".repeat(64) } : document);
  const consentMismatch = await complete(replayStart.body.attempt.id, replayStart.body.onboarding_token, secondVerify.body.registration_grant, mismatchedConsents, "Concurrency User", "concurrency secure pass", key("consent-mismatch"));
  check(consentMismatch.status === 409 && consentMismatch.body.error === "consent_version_changed", "consent version mismatch is rejected");
  const missingAdult = await request(app)
    .post(`/api/v1/onboarding/attempts/${replayStart.body.attempt.id}/complete`)
    .set("authorization", `Onboarding ${replayStart.body.onboarding_token}`)
    .set("idempotency-key", key("adult-required"))
    .send({ registration_grant: secondVerify.body.registration_grant, display_name: "Concurrency User", password: "concurrency secure pass", locale: "ar", consents: legal, adult_self_attestation: false });
  check(missingAdult.status === 400, "adult self-attestation is required");
  const concurrentCompletions = await Promise.all([
    complete(replayStart.body.attempt.id, replayStart.body.onboarding_token, secondVerify.body.registration_grant, legal, "Concurrency User", "concurrency secure pass", key("complete-race-a")),
    complete(replayStart.body.attempt.id, replayStart.body.onboarding_token, secondVerify.body.registration_grant, legal, "Concurrency User", "concurrency secure pass", key("complete-race-b"))
  ]);
  check(concurrentCompletions.filter((response) => response.status === 201).length === 1, "concurrent completion has one winner");
  check(await prisma.user.count({ where: { phone: "+970599111117" } }) === 1, "concurrent completion creates exactly one user");

  const digestRecord = await prisma.idempotencyRecord.findFirstOrThrow({ where: { operation: "onboarding_verify" }, orderBy: { created_at: "desc" } });
  check(![replayOtp, "000000", passengerPassword].some((secret) => digestRecord.request_digest.includes(secret)), "idempotency record stores no raw secret-bearing payload");
  check(digestRecord.request_digest.length === 64, "idempotency request digest is fixed-length keyed material");

  const auditText = JSON.stringify(await prisma.auditEvent.findMany({ select: { metadata: true } }));
  check(!["+970599111114", replayOtp, passengerPassword, secondVerify.body.registration_grant].some((secret) => auditText.includes(secret)), "audit metadata contains no raw onboarding secret or phone");

  const authCountBeforeReset = await prisma.user.count({ where: { demo_account: false } });
  check(authCountBeforeReset >= 3, "onboarded users exist before reset");
  await resetDemoData();
  check(await prisma.user.count({ where: { demo_account: false } }) === 0, "reset removes onboarded users");
  check(await prisma.onboardingAttempt.count() === 0 && await prisma.onboardingSession.count() === 0, "reset removes onboarding attempts and sessions");
  check(await prisma.user.count({ where: { demo_account: true } }) === 5, "reset preserves deterministic demo accounts");
  check(await prisma.userConsent.count() === 0 && await prisma.invitationRedemption.count() === 0, "reset leaves no onboarding evidence orphan");
  check(await prisma.consentDocument.count() === 0, "reset removes test legal fixtures");

  console.log(`Public onboarding MySQL integration passed: ${checks.length} checks`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Public onboarding integration failed");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
