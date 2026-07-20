# ADR-008: Mobile onboarding state machine

Status: accepted for M6C2C

## Context

The backend exposes controlled public onboarding as three concerns: public configuration/start/recovery, continuation-token operations, and pending-status-token operations. Operational JWT refresh must not attach to or retry these requests.

## Decision

Flutter uses one canonical onboarding controller with explicit stages:

- `checkingAvailability`
- `unavailable`
- `choosingRole`
- `enteringInvitation`
- `enteringPhone`
- `starting`
- `otpSent`
- `resending`
- `verifyingOtp`
- `phoneVerified`
- `loadingConsents`
- `enteringAccountDetails`
- `reviewingConsents`
- `completingRegistration`
- `passengerCreated`
- `pendingReview`
- `retryableFailure`
- `terminalFailure`

The controller owns non-secret workflow projection. Tokens and grants are held in a separate versioned secure bundle and are never placed in routes, query strings, visible debug state, snackbars, or logs.

Each asynchronous workflow is generation-fenced. Clear, abandonment,
operational authentication, provider disposal, or a newer restoration advances
the generation; an older response may neither write secure storage nor publish
UI state. Legal transitions are checked in controller methods rather than
being inferred only from which screen is visible.

## Consequences

- Restart restoration is bounded by bundle type, purpose, expiry, and safe stage.
- Operational authenticated state takes precedence over onboarding routes.
- Passengers must use normal login after registration.
- Drivers and merchants remain in pending review and cannot reach operational dashboards.
- Future UI refinements should extend the state machine rather than adding unrelated booleans.
