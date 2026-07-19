# Public onboarding route threat model

The protected assets are invitation eligibility, phone ownership, OTP validity, password material, registration grants, consent evidence, and account/session boundaries. Primary threats are invitation/account enumeration, OTP guessing and send abuse, response loss, concurrent replay, credential substitution, partial registration, token confusion, and secret leakage.

Controls include one phone-bound invitation/attempt/redemption, canonical `PS` phone normalization, generic `onboarding_unavailable`, durable MySQL abuse counters, six-digit OTP state fencing, keyed digest-only credentials, purpose-bound opaque onboarding sessions, keyed idempotency payloads, transactional account/consent completion, and request-ID-only operational logging. Provider calls occur outside long transactions and rejected/unknown challenges cannot verify or replace a prior valid challenge.

The remaining production blockers are an approved real SMS provider, governed production legal documents, storage/backup policy approval, retention automation, driver/merchant approval operations, and an independently reviewed Flutter flow. Public onboarding is therefore rejected at staging/production startup.
