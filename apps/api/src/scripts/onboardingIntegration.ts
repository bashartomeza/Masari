import { createHash } from "node:crypto";
import { config } from "../config.js";
import { consumeAbuseCounter } from "../lib/abuseCounters.js";
import { claimIdempotency, completeIdempotency } from "../lib/idempotency.js";
import { recordConsent } from "../lib/consents.js";
import { createInvitation, consumeInvitation, revokeInvitation } from "../lib/invitations.js";
import { abuseSubjectDigest, idempotencyKeyDigest } from "../lib/keyedDigest.js";
import { FakeOtpProvider, dispatchOtpChallenge, verifyOtpChallenge } from "../lib/otp.js";
import { consumeOnboardingSession, createOnboardingSession, revokeOnboardingSessions } from "../lib/onboardingSessions.js";
import { createOnboardingAttempt } from "../lib/onboardingAttempts.js";
import { normalizePhoneToE164 } from "../lib/phone.js";
import { prisma } from "../lib/prisma.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, any>>;
}

async function main() {
  const onboarding = config.onboarding;
  assert(config.invitationsEnabled && onboarding, "Invitation foundation must be enabled for integration validation");
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "admin", demo_account: true } });
  const schemaTables = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*) AS n FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name IN
      ('invitations','invitation_redemptions','onboarding_attempts','otp_challenges','onboarding_sessions','consent_documents','user_consents','abuse_counters','idempotency_records')
  `;
  assert(Number(schemaTables[0].n) === 9, "Onboarding foundation tables are incomplete");
  const utf8Tables = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*) AS n FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name IN
      ('invitations','invitation_redemptions','onboarding_attempts','otp_challenges','onboarding_sessions','consent_documents','user_consents','abuse_counters','idempotency_records')
      AND table_collation LIKE 'utf8mb4%'
  `;
  assert(Number(utf8Tables[0].n) === 9, "Onboarding foundation character set is not utf8mb4");
  const phone = normalizePhoneToE164("0590000001", { region: "PS" });

  const { invitation } = await createInvitation(prisma, {
    createdById: admin.id,
    intendedRole: "passenger",
    intendedPhone: phone,
    phoneRegion: "PS",
    expiresAt: new Date(Date.now() + 86_400_000),
    keys: { code: onboarding.keys.invitationCode, phone: onboarding.keys.phoneDigest }
  });
  const attempt = await createOnboardingAttempt(prisma, {
    invitationId: invitation.id,
    intendedRole: "passenger",
    phone,
    phoneKey: onboarding.keys.phoneDigest,
    expiresAt: new Date(Date.now() + 1_800_000),
    requestId: "integration-attempt"
  });

  const redemptionResults = await Promise.all(
    Array.from({ length: 12 }, () => consumeInvitation(prisma, { invitationId: invitation.id, onboardingAttemptId: attempt.id }))
  );
  assert(redemptionResults.filter((result) => result.consumed).length === 1, "Concurrent invitation redemption was not single-use");

  const raceInvite = await createInvitation(prisma, {
    createdById: admin.id, intendedRole: "driver", intendedPhone: "+970590000002", phoneRegion: "PS",
    expiresAt: new Date(Date.now() + 86_400_000), keys: { code: onboarding.keys.invitationCode, phone: onboarding.keys.phoneDigest }
  });
  const raceAttempt = await createOnboardingAttempt(prisma, {
    invitationId: raceInvite.invitation.id, intendedRole: "driver", phone: "+970590000002",
    phoneKey: onboarding.keys.phoneDigest, expiresAt: new Date(Date.now() + 1_800_000)
  });
  await Promise.allSettled([
    consumeInvitation(prisma, { invitationId: raceInvite.invitation.id, onboardingAttemptId: raceAttempt.id }),
    revokeInvitation(prisma, { invitationId: raceInvite.invitation.id, revokedById: admin.id, reason: "integration race" })
  ]);
  const raceFinal = await prisma.invitation.findUniqueOrThrow({ where: { id: raceInvite.invitation.id } });
  assert((raceFinal.used_count === 1) !== Boolean(raceFinal.revoked_at), "Invitation use/revoke race produced an invalid terminal state");

  const acceptedProvider = new FakeOtpProvider();
  const first = await dispatchOtpChallenge(prisma, acceptedProvider, {
    attemptId: attempt.id,
    key: onboarding.keys.otpCode,
    ttlSeconds: onboarding.otpTtlSeconds,
    maxAttempts: onboarding.otpMaxAttempts,
    maxResends: onboarding.otpMaxResends,
    resendCooldownSeconds: onboarding.otpResendCooldownSeconds
  });
  assert(first.accepted, "Fake OTP acceptance failed");
  const code = [...acceptedProvider.outbox.values()][0];
  assert(code && /^\d{6}$/.test(code), "Fake OTP outbox did not retain a six-digit code");
  const rejected = await dispatchOtpChallenge(prisma, new FakeOtpProvider("rejected"), {
    attemptId: attempt.id,
    key: onboarding.keys.otpCode,
    ttlSeconds: onboarding.otpTtlSeconds,
    maxAttempts: onboarding.otpMaxAttempts,
    maxResends: onboarding.otpMaxResends,
    resendCooldownSeconds: onboarding.otpResendCooldownSeconds,
    now: new Date(Date.now() + (onboarding.otpResendCooldownSeconds + 1) * 1000)
  });
  assert(!rejected.accepted, "Rejected OTP provider result was accepted");
  const afterReject = await prisma.onboardingAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  assert(afterReject.current_challenge_id === first.challengeId, "Rejected resend invalidated the prior challenge");

  const verificationResults = await Promise.all(
    Array.from({ length: 12 }, () => verifyOtpChallenge(prisma, { attemptId: attempt.id, code, key: onboarding.keys.otpCode }))
  );
  assert(verificationResults.filter((result) => result.verified).length === 1, "Concurrent OTP verification was not single-consume");

  const resendInvite = await createInvitation(prisma, {
    createdById: admin.id, intendedRole: "passenger", intendedPhone: phone, phoneRegion: "PS",
    expiresAt: new Date(Date.now() + 86_400_000), keys: { code: onboarding.keys.invitationCode, phone: onboarding.keys.phoneDigest }
  });
  const resendAttempt = await createOnboardingAttempt(prisma, {
    invitationId: resendInvite.invitation.id, intendedRole: "passenger", phone,
    phoneKey: onboarding.keys.phoneDigest, expiresAt: new Date(Date.now() + 1_800_000)
  });
  const oldProvider = new FakeOtpProvider();
  const oldChallenge = await dispatchOtpChallenge(prisma, oldProvider, {
    attemptId: resendAttempt.id, key: onboarding.keys.otpCode, ttlSeconds: onboarding.otpTtlSeconds,
    maxAttempts: onboarding.otpMaxAttempts, maxResends: onboarding.otpMaxResends,
    resendCooldownSeconds: onboarding.otpResendCooldownSeconds
  });
  assert(oldChallenge.accepted, "Initial resend-test challenge failed");
  let cooldownEnforced = false;
  try {
    await dispatchOtpChallenge(prisma, new FakeOtpProvider(), {
      attemptId: resendAttempt.id, key: onboarding.keys.otpCode, ttlSeconds: onboarding.otpTtlSeconds,
      maxAttempts: onboarding.otpMaxAttempts, maxResends: onboarding.otpMaxResends,
      resendCooldownSeconds: onboarding.otpResendCooldownSeconds
    });
  } catch (error) {
    cooldownEnforced = error instanceof Error && error.message === "otp_resend_cooldown";
  }
  assert(cooldownEnforced, "OTP resend cooldown was not enforced");
  const replacementProvider = new FakeOtpProvider();
  const replacement = await dispatchOtpChallenge(prisma, replacementProvider, {
    attemptId: resendAttempt.id, key: onboarding.keys.otpCode, ttlSeconds: onboarding.otpTtlSeconds,
    maxAttempts: onboarding.otpMaxAttempts, maxResends: onboarding.otpMaxResends,
    resendCooldownSeconds: onboarding.otpResendCooldownSeconds,
    now: new Date(Date.now() + (onboarding.otpResendCooldownSeconds + 1) * 1_000)
  });
  assert(replacement.accepted, "Accepted resend replacement failed");
  const oldStored = await prisma.otpChallenge.findUniqueOrThrow({ where: { id: oldChallenge.challengeId } });
  assert(Boolean(oldStored.superseded_at), "Accepted resend did not supersede the previous challenge");
  const oldCode = [...oldProvider.outbox.values()][0];
  const replacementCode = [...replacementProvider.outbox.values()][0];
  assert(!(await verifyOtpChallenge(prisma, { attemptId: resendAttempt.id, code: oldCode, key: onboarding.keys.otpCode })).verified, "Superseded OTP remained verifiable");
  assert((await verifyOtpChallenge(prisma, { attemptId: resendAttempt.id, code: replacementCode, key: onboarding.keys.otpCode })).verified, "Accepted replacement OTP was not verifiable");

  const lockInvite = await createInvitation(prisma, {
    createdById: admin.id, intendedRole: "passenger", intendedPhone: phone, phoneRegion: "PS",
    expiresAt: new Date(Date.now() + 86_400_000), keys: { code: onboarding.keys.invitationCode, phone: onboarding.keys.phoneDigest }
  });
  const lockAttempt = await createOnboardingAttempt(prisma, {
    invitationId: lockInvite.invitation.id, intendedRole: "passenger", phone,
    phoneKey: onboarding.keys.phoneDigest, expiresAt: new Date(Date.now() + 1_800_000)
  });
  const lockProvider = new FakeOtpProvider();
  await dispatchOtpChallenge(prisma, lockProvider, {
    attemptId: lockAttempt.id, key: onboarding.keys.otpCode, ttlSeconds: onboarding.otpTtlSeconds,
    maxAttempts: onboarding.otpMaxAttempts, maxResends: onboarding.otpMaxResends
  });
  const realLockCode = [...lockProvider.outbox.values()][0];
  const wrongCode = realLockCode === "999999" ? "000000" : "999999";
  for (let index = 0; index < onboarding.otpMaxAttempts; index += 1) {
    await verifyOtpChallenge(prisma, { attemptId: lockAttempt.id, code: wrongCode, key: onboarding.keys.otpCode });
  }
  const lockedAttempt = await prisma.onboardingAttempt.findUniqueOrThrow({ where: { id: lockAttempt.id } });
  assert(lockedAttempt.status === "locked", "OTP attempt limit did not lock the attempt");
  assert(!(await verifyOtpChallenge(prisma, { attemptId: lockAttempt.id, code: realLockCode, key: onboarding.keys.otpCode })).verified, "Locked OTP challenge remained verifiable");

  const keyDigest = idempotencyKeyDigest("onboarding-integration", "same-key", onboarding.keys.idempotency);
  const scopeDigest = idempotencyKeyDigest("onboarding-integration-scope", attempt.id, onboarding.keys.idempotency);
  const requestDigest = createHash("sha256").update("same-request").digest("hex");
  const claims = await Promise.all(
    Array.from({ length: 12 }, () => claimIdempotency(prisma, {
      operation: "onboarding-integration",
      scopeDigest,
      keyDigest,
      keyVersion: onboarding.keys.idempotency.version,
      requestDigest,
      expiresAt: new Date(Date.now() + 3_600_000)
    }))
  );
  assert(claims.filter((claim) => claim.kind === "claimed").length === 1, "Idempotency claim was not single-owner");
  const claimed = claims.find((claim) => claim.kind === "claimed")!;
  await completeIdempotency(prisma, { recordId: claimed.record.id, resourceType: "OnboardingAttempt", resourceId: attempt.id, responseStatus: 201 });
  const replay = await claimIdempotency(prisma, {
    operation: "onboarding-integration", scopeDigest, keyDigest, keyVersion: onboarding.keys.idempotency.version,
    requestDigest, expiresAt: new Date(Date.now() + 3_600_000)
  });
  assert(replay.kind === "replay" && replay.record.resource_id === attempt.id, "Idempotency replay lost its stable resource reference");
  const conflict = await claimIdempotency(prisma, {
    operation: "onboarding-integration", scopeDigest, keyDigest, keyVersion: onboarding.keys.idempotency.version,
    requestDigest: createHash("sha256").update("different-request").digest("hex"), expiresAt: new Date(Date.now() + 3_600_000)
  });
  assert(conflict.kind === "conflict", "Idempotency payload conflict was not detected");
  const staleKey = idempotencyKeyDigest("onboarding-expiry", "stale-key", onboarding.keys.idempotency);
  const staleScope = idempotencyKeyDigest("onboarding-expiry-scope", attempt.id, onboarding.keys.idempotency);
  await claimIdempotency(prisma, {
    operation: "onboarding-expiry", scopeDigest: staleScope, keyDigest: staleKey,
    keyVersion: onboarding.keys.idempotency.version, requestDigest, expiresAt: new Date(Date.now() - 1_000)
  });
  const reclaimed = await claimIdempotency(prisma, {
    operation: "onboarding-expiry", scopeDigest: staleScope, keyDigest: staleKey,
    keyVersion: onboarding.keys.idempotency.version,
    requestDigest: createHash("sha256").update("replacement").digest("hex"), expiresAt: new Date(Date.now() + 3_600_000)
  });
  assert(reclaimed.kind === "claimed", "Expired idempotency record was not safely reclaimable");

  const onboardingSession = await createOnboardingSession(prisma, {
    attemptId: attempt.id, key: onboarding.keys.onboardingSession, ttlSeconds: 600
  });
  const storedOnboardingSession = await prisma.onboardingSession.findUniqueOrThrow({ where: { id: onboardingSession.session.id } });
  assert(storedOnboardingSession.token_digest !== onboardingSession.token, "Raw onboarding token was stored");
  const sessionConsumes = await Promise.all(Array.from({ length: 10 }, () => consumeOnboardingSession(prisma, {
    token: onboardingSession.token, key: onboarding.keys.onboardingSession
  })));
  assert(sessionConsumes.filter(Boolean).length === 1, "Onboarding session was not single-consume");
  const revocableSession = await createOnboardingSession(prisma, {
    attemptId: attempt.id, key: onboarding.keys.onboardingSession, ttlSeconds: 600
  });
  await revokeOnboardingSessions(prisma, { attemptId: attempt.id, reason: "integration revocation" });
  assert(!(await consumeOnboardingSession(prisma, { token: revocableSession.token, key: onboarding.keys.onboardingSession })), "Revoked onboarding session remained usable");
  const expiredSession = await createOnboardingSession(prisma, {
    attemptId: attempt.id, key: onboarding.keys.onboardingSession, ttlSeconds: 1, now: new Date(Date.now() - 10_000)
  });
  assert(!(await consumeOnboardingSession(prisma, { token: expiredSession.token, key: onboarding.keys.onboardingSession })), "Expired onboarding session remained usable");

  const consentDocument = await prisma.consentDocument.create({
    data: { document_type: "terms", version: "integration-v1", locale: "ar", content_digest: createHash("sha256").update("integration terms").digest("hex"), effective_at: new Date() }
  });
  await recordConsent(prisma, { documentId: consentDocument.id, userId: admin.id, source: "integration", requestId: "integration-request" });
  let duplicateConsentRejected = false;
  try { await recordConsent(prisma, { documentId: consentDocument.id, userId: admin.id, source: "integration" }); } catch { duplicateConsentRejected = true; }
  assert(duplicateConsentRejected, "Consent acceptance was not immutable and unique");

  const abuseDigest = abuseSubjectDigest("integration", "subject", onboarding.keys.abuse);
  await Promise.all(Array.from({ length: 20 }, () => consumeAbuseCounter(prisma, {
    bucketType: "integration",
    subjectDigest: abuseDigest,
    digestVersion: onboarding.keys.abuse.version,
    windowSeconds: 3_600,
    limit: 5
  })));
  const counter = await prisma.abuseCounter.findFirstOrThrow({ where: { bucket_type: "integration", subject_digest: abuseDigest } });
  assert(counter.count === 20, "Durable abuse counter lost concurrent increments");
  const blocked = await consumeAbuseCounter(prisma, { bucketType: "integration", subjectDigest: abuseDigest, digestVersion: onboarding.keys.abuse.version, windowSeconds: 3_600, limit: 5 });
  assert(!blocked.allowed, "Durable abuse counter allowed a request above the limit");
  for (const bucketType of ["otp_phone_day", "otp_ip_hour", "otp_invitation", "otp_verification_failure", "registration_completion", "admin_invitation_create"]) {
    const digest = abuseSubjectDigest(bucketType, "independent-subject", onboarding.keys.abuse);
    const result = await consumeAbuseCounter(prisma, {
      bucketType, subjectDigest: digest, digestVersion: onboarding.keys.abuse.version, windowSeconds: 3_600, limit: 2
    });
    assert(result.allowed && result.count === 1 && result.retryAfterSeconds > 0, `Independent abuse bucket failed: ${bucketType}`);
  }

  const api = (process.env.API_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const operationalWithOnboardingToken = await fetch(`${api}/api/v1/passenger/requests`, {
    headers: { authorization: `Bearer ${onboardingSession.token}` }
  });
  assert(operationalWithOnboardingToken.status === 401, "Operational authentication accepted an onboarding token");
  for (const path of ["/api/v1/onboarding/start", "/api/v1/onboarding/otp/send", "/api/v1/onboarding/complete"]) {
    assert((await fetch(`${api}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status === 404, `${path} must not exist`);
  }
  const loginResponse = await fetch(`${api}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: admin.phone, password: config.demo!.adminPassword, client_type: "admin" })
  });
  assert(loginResponse.ok, "Admin login failed for invitation integration");
  const token = (await json(loginResponse)).access_token;
  const passenger = await prisma.user.findFirstOrThrow({ where: { role: "passenger", demo_account: true } });
  const passengerLogin = await fetch(`${api}/api/v1/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: passenger.phone, password: config.demo!.passengerPassword, client_type: "mobile" })
  });
  const passengerToken = (await json(passengerLogin)).access_token;
  const forbidden = await fetch(`${api}/api/v1/admin/invitations`, { headers: { authorization: `Bearer ${passengerToken}` } });
  assert(forbidden.status === 403, "Non-admin invitation access was not forbidden");
  const createResponse = await fetch(`${api}/api/v1/admin/invitations`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ role: "merchant", phone: "+970590000004", region: "PS", campaign: "integration" })
  });
  const created = await json(createResponse);
  assert(createResponse.status === 201 && typeof created.code === "string", "Admin invitation creation failed");
  assert(Boolean(createResponse.headers.get("x-request-id")), "Admin invitation response omitted request ID");
  assert(!JSON.stringify(created).includes("digest"), "Admin invitation create response exposed a digest");
  const listResponse = await fetch(`${api}/api/v1/admin/invitations?campaign=integration`, { headers: { authorization: `Bearer ${token}` } });
  const listed = await json(listResponse);
  assert(listResponse.ok && Array.isArray(listed.invitations) && listed.invitations.length === 1, "Admin invitation listing failed");
  assert(!("code" in listed.invitations[0]) && !JSON.stringify(listed).includes("digest"), "Admin invitation list exposed sensitive material");
  const exactPhoneResponse = await fetch(`${api}/api/v1/admin/invitations?phone=${encodeURIComponent("+970590000004")}&region=PS`, { headers: { authorization: `Bearer ${token}` } });
  const exactPhoneList = await json(exactPhoneResponse);
  assert(exactPhoneResponse.ok && exactPhoneList.total === 1, "Exact normalized phone invitation filter failed");
  const invalidPage = await fetch(`${api}/api/v1/admin/invitations?limit=51`, { headers: { authorization: `Bearer ${token}` } });
  assert(invalidPage.status === 400, "Invitation pagination bounds were not enforced");
  const revokeResponse = await fetch(`${api}/api/v1/admin/invitations/${created.invitation.id}/revoke`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ reason: "integration cleanup" })
  });
  assert(revokeResponse.ok && (await json(revokeResponse)).invitation.status === "revoked", "Admin invitation revocation failed");
  const repeatedRevoke = await fetch(`${api}/api/v1/admin/invitations/${created.invitation.id}/revoke`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ reason: "integration repeated revoke" })
  });
  assert(repeatedRevoke.ok, "Repeated invitation revocation was not idempotently safe");

  const resetResponse = await fetch(`${api}/api/v1/demo/reset`, {
    method: "POST",
    headers: { "x-demo-reset-key": config.demo!.resetKey }
  });
  assert(resetResponse.ok, "Protected demo reset failed after onboarding integration");
  const residualCounts = await Promise.all([
    prisma.invitation.count(),
    prisma.onboardingAttempt.count(),
    prisma.otpChallenge.count(),
    prisma.onboardingSession.count(),
    prisma.userConsent.count(),
    prisma.abuseCounter.count(),
    prisma.idempotencyRecord.count(),
    prisma.authSession.count(),
    prisma.refreshToken.count()
  ]);
  assert(residualCounts.every((count) => count === 0), "Protected demo reset left onboarding or session foundation records");

  console.log("Onboarding foundation integration passed: single-use invitation, atomic OTP, idempotency, durable abuse controls, gated admin API, no public routes, clean demo reset.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Onboarding integration failed");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
