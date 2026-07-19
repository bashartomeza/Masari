# Onboarding retention boundary

M6C2B1 defines storage, not a production retention approval.

- Invitation codes and OTPs are never stored raw. Invitation phone is never stored raw.
- `OnboardingAttempt.phone_e164` is the sole raw destination field because send, resend, retry, and interrupted continuation require it. It must be encrypted by the database/storage platform, access-limited, excluded from logs/audits/responses, and deleted by the future retention job after completion, cancellation, lock/expiry plus the approved support window.
- HMAC digests carry key versions and are pseudonymous, not anonymous. Access and retention must be restricted accordingly.
- Abuse and idempotency rows have explicit expiries and must be purged by a future scheduled cleanup.
- Consent acceptance requires an effective, non-retired, legally approved version. The service has no mutation path, the user/document pair is unique, and the user foreign key restricts deletion so ordinary account deletion cannot cascade away evidence. Retention still requires a separately approved legal policy. No invented production legal content is seeded.
- Demo reset clears every onboarding, OTP, token, counter, idempotency, and consent row.

Before production public onboarding, privacy/legal owners must approve exact retention periods, deletion/backup behavior, Terms/Privacy versions in Arabic and English, and the age-18 self-attestation.
