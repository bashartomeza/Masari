# Mobile onboarding idempotency

Every onboarding mutation uses an `Idempotency-Key` header and remains separate from operational auth refresh/retry behavior.

Operations:

- `onboarding_start`
- `onboarding_resend`
- `onboarding_verify`
- `onboarding_complete`

Rules implemented in Flutter:

- keys are generated from a cryptographically secure random source;
- operation types use separate keys;
- retry of the same logical payload reuses the in-flight key;
- edited payloads receive a new key;
- rapid taps are busy-gated so one controller operation is active per action;
- onboarding 401/403 responses do not trigger operational access-token refresh;
- no key contains invitation, phone, OTP, password, token, or grant values;
- retry is user-driven for mutations.

The app treats ambiguous network failures as retryable UI states and preserves the safe controller context. Terminal validation, locked OTP, expired OTP, invalid grant, and consent-version conflicts are not silently retried under changed payloads.
