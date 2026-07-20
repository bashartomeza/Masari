# Pending account access

Driver and merchant registrations are always created with `account_status=pending`. Completion creates no `AuthSession`, `RefreshToken`, access JWT, route, profile, or operational capability. It returns a random opaque onboarding token whose stored form is a keyed digest and whose database-enforced purpose is `pending_status`.

The credential is bound to the completed attempt and user, expires within seven days, is rotatable/revocable, and authorizes only `GET /api/v1/onboarding/status`. Operational middleware accepts only Bearer JWTs and rejects this credential. Pending accounts also fail normal login.

`POST /api/v1/onboarding/status-sessions` recovers status access using canonical phone, explicit `PS`, and password. Ineligible/missing users receive the same dummy-password timing path and `invalid_credentials`. An active account receives `approved_sign_in` from status and must obtain an operational session through normal login.
