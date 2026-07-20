# Mobile onboarding secure state

Onboarding state is stored separately from operational authentication.

Secure storage keys:

- `masari_auth_bundle_v1`: operational access/refresh session bundle.
- `masari_jwt`: legacy operational access token.
- `masari_onboarding_bundle_v1`: onboarding-only bundle.

The onboarding bundle is versioned and fail-closed. Corrupt, unsupported, incomplete, or expired bundles are cleared. Pending-status bundles cannot be interpreted as continuation bundles, and continuation bundles cannot be interpreted as pending-status bundles.

Allowed stored fields:

- bundle version and workflow type;
- safe stage;
- selected role;
- locale;
- attempt ID for continuation;
- continuation token and expiry;
- registration grant and expiry after OTP verification;
- pending-status token and expiry;
- masked phone;
- resend availability time;
- safe idempotency metadata if needed for recovery.

Never stored:

- raw invitation code;
- OTP;
- password;
- raw phone;
- full authorization header;
- provider details;
- fake OTP outbox data;
- operational JWT or refresh token inside the onboarding bundle.

Token rotation follows a crash-consistent order: validate response, construct a complete replacement bundle, write it to secure storage, then publish controller state.
