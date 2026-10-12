# Admin driver verification

Card 3 adds a dedicated Admin-owned review lifecycle for driver accounts. It does not turn the generic account-status endpoint into an approval endpoint.

## Source and evidence boundary

The pending queue is sourced from `driver_verifications`, created atomically when public onboarding completes for the `driver` role. Migration 19 backfills every existing driver user: an existing `DriverProfile.verified = true` becomes `approved`; every other driver becomes `pending`.

Public onboarding currently collects the driver's display name, normalized phone number, password, role, consent acceptance, and adult self-attestation. It does **not** collect licence files, identity documents, vehicle documents, or other verification evidence. The Admin API therefore returns `evidence.status = "not_collected"`; it never creates fake document rows or fake evidence.

## Lifecycle and operational effect

- `pending -> approved`: requires the current revision. If no profile exists, the Admin must enter the real vehicle type, seat capacity, and parcel capacity. The transaction creates or verifies the profile and activates only an account whose status is still `pending` from onboarding.
- `pending -> rejected`: requires the current revision and a non-empty normalized reason. The reason is persisted and any existing profile is set to `verified = false`.
- `approved` and `rejected` are terminal in this contract. Duplicate, stale, or conflicting decisions return HTTP 409 and do not partially update the profile or account.
- Suspended or disabled accounts are never reactivated by approval. Account suspension/reactivation remains a separate security control.

Existing driver availability, online-state, and matching gates continue to require `DriverProfile.verified = true`; they also retain their active-account checks. Rejected and unverified drivers therefore remain blocked from driver operations.

## Re-review boundary

There is no driver resubmission or Admin reopen contract in Card 3. A future re-review flow must define how new evidence is submitted, whether prior decisions remain immutable history, and who may create a new revision. Until then, the Admin UI reports the persisted terminal decision and does not offer another action.

## Admin API

- `GET /api/v1/admin/driver-verifications?status=pending&page=1&limit=50`
- `GET /api/v1/admin/driver-verifications/:userId`
- `POST /api/v1/admin/driver-verifications/:userId/approve`
- `POST /api/v1/admin/driver-verifications/:userId/reject`

All four routes require an authenticated Admin session. Responses use the existing safe Admin user shape and omit password hashes, security versions, session/token data, and unrelated role data.

## Migration and rollback

Migration `20260819150000_driver_verification_approval` is additive: it creates one table, backfills driver lifecycle rows, and adds foreign keys. Existing `driver_profiles.verified` remains the downstream source of operational gating. Before a production rollback, stop writes to the new Admin endpoints; the application can then be rolled back while the additive table remains in place. Dropping the table is not required for application rollback and would discard review reasons and audit linkage.
