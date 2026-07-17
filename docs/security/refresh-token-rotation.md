# Refresh-token rotation

`POST /api/v1/auth/refresh` is available to the mobile-capable passenger, driver, and merchant session policy. Admin browser sessions do not receive refresh tokens.

## Token storage

A refresh token is an opaque credential made from a non-secret UUID identifier and 32 cryptographically random bytes. MySQL stores only an HMAC-SHA-256 digest keyed by `REFRESH_TOKEN_PEPPER`; the raw token is returned only by login or successful rotation. The identifier supports indexed lookup but is not returned in error responses.

Raw refresh tokens, digests, and the pepper are redacted operational-log fields and are forbidden from audit metadata. API session summaries never serialize refresh-token records.

## Rotation transaction

For each refresh, the API parses the identifier, verifies the HMAC in constant-time-safe comparison, and checks token, session, account, expiry, revocation, and security-version state. A MySQL transaction then conditionally marks the presented token used, creates one replacement, links the old record to it, updates session activity, and records a safe audit event.

The conditional `used_at IS NULL AND revoked_at IS NULL AND expires_at > now` update is the concurrency gate. Two simultaneous requests cannot both consume the same token. The real disposable-MySQL integration test requires exactly one HTTP success.

## Reuse response

Presenting a valid used token is treated as possible credential replay. The API revokes the entire affected session and all remaining refresh tokens under it, records `refresh_token_reuse_detected`, and returns a safe authentication failure. The response does not attribute intent or expose token/session internals.

This deliberately means an accidental concurrent duplicate can invalidate the winning replacement after exactly one rotation succeeds. The user must authenticate again, which is safer than keeping a potentially copied credential active.

## Limits and next step

Refresh lifetime defaults to 30 days and is bounded to 90 days in staging/production. Access JWTs remain short-lived and server-revocable during their lifetime. M6C1B is responsible for Flutter refresh-token storage/rotation, retry coordination, logout cleanup, and expiry UX; none of that client behavior is claimed by M6C1A.
