# Onboarding threat model

## Protected assets

Invitation codes, OTPs, continuation tokens, raw phones, passwords, provider secrets, legal evidence, and operational sessions are sensitive. B1 stores no password, provider credential, raw invitation code, raw OTP, or raw continuation token.

## Threats and controls

| Threat | B1 control |
| --- | --- |
| Invitation guessing or database disclosure | 100-bit Crockford code; distinct versioned HMAC; raw code returned once and never stored |
| Phone enumeration | phone-bound HMAC lookup; masked admin output; uniform safe errors; no public routes |
| OTP guessing/replay | six crypto-random digits; challenge-ID HMAC; five attempts; expiry; current/superseded/consumed states; atomic consume |
| Failed resend invalidates working OTP | dispatching row first; provider outside transaction; current pointer changes only after accepted delivery |
| Concurrent double use | conditional MySQL updates, unique redemption, unique idempotency claim, and real race tests |
| Distributed abuse | atomic durable counters keyed by domain-separated digests and fixed windows |
| Token confusion | opaque onboarding tokens have a separate key/table and are rejected by JWT operational middleware |
| Secret leakage | request bodies and sensitive names are redacted; audit metadata is allowlisted; safe serializers exclude hashes/digests/raw phones |
| Fake provider escape | configuration rejects `fake` in staging/production; no real provider SDK exists |
| Unapproved legal consent | no legal documents are seeded; future public enablement must fail closed without approved active documents |

## Residual risks

Real provider webhook authenticity, carrier delivery behavior, password security, public endpoint enumeration resistance, retention jobs, legal approvals, and operational approval belong to later milestones. Public onboarding must remain disabled until those controls are reviewed.
