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

Secret-bearing start, verify, and completion payloads are retained only in the
live controller/widget process. Their random keys are reused only while the
exact payload remains available in memory. The app deliberately does not
persist invitation, phone, OTP, display name, password, or a replayable secret
fingerprint. After process death it therefore does not claim that these
uncertain operations can be replayed automatically: the user must re-enter the
input, use normal login if passenger completion may already have committed, or
use pending-status recovery for a driver/merchant completion.

Resend has no secret request payload. Its uncertain-operation key is the only
idempotency key that may be stored in the continuation bundle, scoped to the
current attempt and cleared after a known success or terminal response.

The app treats ambiguous network failures as retryable UI states and preserves
the exact in-memory payload and key while the process survives. Known outcomes
clear the operation record. Consent-version conflict clears the old completion
record, reloads current documents, and requires fresh acceptance before a new
completion key is created.
