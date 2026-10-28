# Admin driver verification

Card 3 adds a dedicated Admin-owned review lifecycle for driver accounts. It does not turn the generic account-status endpoint into an approval endpoint.

## Source and evidence boundary

The pending queue is sourced from `driver_verifications`, created atomically when public onboarding completes for the `driver` role. Migration 19 backfills every existing driver user: an existing `DriverProfile.verified = true` becomes `approved`; every other driver becomes `pending`.

Public onboarding currently collects the driver's display name, normalized phone number, password, role, consent acceptance, and adult self-attestation. It does **not** collect licence files, identity documents, vehicle documents, or other verification evidence. The Admin API therefore returns `evidence.status = "not_collected"`; it never creates fake document rows or fake evidence.

### Admin-recorded evidence

While a verification is `pending`, an Admin can record which kinds of document they sighted (`driver_licence`, `vehicle_registration`, `national_id`, `insurance`, `other`) with an optional note of up to 200 characters, via `POST /api/v1/admin/driver-verifications/:userId/evidence` (`expected_revision`, `kind`, `note`). This is a record of the review, not a document store: **no files and no document numbers are stored**, entries are append-only, capped at 10 per revision, audited, and shown only for the revision they were recorded against. `evidence.status` becomes `recorded` once an entry exists for the current revision; otherwise it stays `not_collected`. Approval does not depend on it. Applicant-side upload, storage, retention and access rules remain undecided and need a legal/security decision before any file handling is built. Migration `20261026120000_driver_verification_evidence` is additive.

### Applicant document upload (server storage)

A driver whose application is `pending` can add documents from the pending-review screen in the app. This reuses the existing pending-status session (`Authorization: Onboarding <token>`); no new sign-in path is created.

- `GET /api/v1/onboarding/driver-documents` lists the applicant's documents for the current revision and the limits.
- `POST /api/v1/onboarding/driver-documents?kind=<kind>` uploads one file as the raw request body. JPEG, PNG and PDF only, decided by the file's leading bytes (the declared type is ignored), at most 5 MB, at most 6 per revision.
- `DELETE /api/v1/onboarding/driver-documents/:id` removes one of the applicant's own documents while the application is pending.
- `GET /api/v1/admin/driver-verifications/:userId/documents/:documentId` is Admin-only. It returns the file as a `no-store`, `nosniff` attachment and records an audit entry for every view.

Files are written to `DRIVER_DOCUMENTS_DIR` under a random 48-character name with owner-only permissions; the database holds only metadata (kind, type, size, SHA-256, storage key). The feature is **off unless** `DRIVER_DOCUMENTS_ENABLED=true` and `DRIVER_DOCUMENTS_DIR` is an absolute path; when off, the endpoints return 404 and the app hides the card.

Deployment notes for the server host: put the directory on persistent storage (not the container's ephemeral layer), outside any web root, owned and readable only by the API user, and include it in backups together with the database. Serve the API over HTTPS only. The files are personal documents; do not put the directory on a shared or public volume.

Retention: documents of a decided application (approved or rejected) are deleted after `DRIVER_DOCUMENT_RETENTION_DAYS` (default 90) by `npm run documents:purge -w @masari/api` (after `npm run build`). It is safe to run repeatedly; schedule it daily on the host. Documents of pending applications are never purged, and an applicant can delete their own while pending. The 90-day default is an engineering default; the product owner should confirm it.

Not covered: malware scanning of uploads, encryption of files at rest beyond the host's disk encryption, and applicant-side upload after a rejection (a rejected applicant still cannot sign in, so a re-review stays Admin-initiated).

## Lifecycle and operational effect

- `pending -> approved`: requires the current revision. If no profile exists, the Admin must enter the real vehicle type, seat capacity, and parcel capacity. The transaction creates or verifies the profile and activates only an account whose status is still `pending` from onboarding.
- `pending -> rejected`: requires the current revision and a non-empty normalized reason. The reason is persisted and any existing profile is set to `verified = false`.
- `approved` and `rejected` are terminal in this contract. Duplicate, stale, or conflicting decisions return HTTP 409 and do not partially update the profile or account.
- Suspended or disabled accounts are never reactivated by approval. Account suspension/reactivation remains a separate security control.

Existing driver availability, online-state, and matching gates continue to require `DriverProfile.verified = true`; they also retain their active-account checks. Rejected and unverified drivers therefore remain blocked from driver operations.

## Re-review boundary

There is no driver resubmission or Admin reopen contract in Card 3. Admin-initiated re-review exists (see approvals.md); applicant-initiated resubmission does not. Any future flow must define how new evidence is submitted, whether prior decisions remain immutable history, and who may create a new revision. Until then, the Admin UI reports the persisted terminal decision and does not offer another action.

## Admin API

- `GET /api/v1/admin/driver-verifications?status=pending&page=1&limit=50`
- `GET /api/v1/admin/driver-verifications/:userId`
- `POST /api/v1/admin/driver-verifications/:userId/approve`
- `POST /api/v1/admin/driver-verifications/:userId/reject`

All four routes require an authenticated Admin session. Responses use the existing safe Admin user shape and omit password hashes, security versions, session/token data, and unrelated role data.

## Migration and rollback

Migration `20260819150000_driver_verification_approval` is additive: it creates one table, backfills driver lifecycle rows, and adds foreign keys. Existing `driver_profiles.verified` remains the downstream source of operational gating. Before a production rollback, stop writes to the new Admin endpoints; the application can then be rolled back while the additive table remains in place. Dropping the table is not required for application rollback and would discard review reasons and audit linkage.

## Shop-owner documents

Shop owners upload their papers (commercial register or shop licence, national ID, a photo of the shop) from the pending-review screen in the app, up to six files of 5 MB. They use the same server storage and retention rules as driver documents. In Users, open Approve or Reject on a pending merchant: the documents are listed there with a Download button before you decide. Applicants are told that review usually takes up to 24 hours.
