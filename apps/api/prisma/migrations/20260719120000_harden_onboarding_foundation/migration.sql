-- Harden short-lived phone storage so permissive SQL modes cannot truncate an
-- oversized value into the canonical E.164 column before validation.
ALTER TABLE `onboarding_attempts`
    MODIFY `phone_e164` VARCHAR(32) NOT NULL,
    ADD COLUMN `otp_dispatch_claim_id` VARCHAR(36) NULL,
    ADD COLUMN `otp_dispatch_started_at` DATETIME(3) NULL,
    ADD CONSTRAINT `onboarding_attempts_phone_e164_chk`
      CHECK (CHAR_LENGTH(`phone_e164`) <= 16 AND `phone_e164` REGEXP '^\\+970[0-9]+$');

-- Fence stale idempotency processors from completing a reclaimed claim.
ALTER TABLE `idempotency_records`
    ADD COLUMN `claim_version` INTEGER NOT NULL DEFAULT 1;

-- Consent evidence must survive ordinary user-deletion attempts.
ALTER TABLE `user_consents`
    DROP FOREIGN KEY `user_consents_user_id_fkey`,
    ADD CONSTRAINT `user_consents_user_id_restrict_fkey`
      FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keyed digests are lowercase hexadecimal identifiers and must compare with
-- deterministic byte semantics rather than a locale-aware Unicode collation.
ALTER TABLE `invitations`
    MODIFY `code_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    MODIFY `intended_phone_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;

ALTER TABLE `onboarding_attempts`
    MODIFY `phone_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    MODIFY `request_ip_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    MODIFY `registration_grant_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL;

ALTER TABLE `otp_challenges`
    MODIFY `code_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;

ALTER TABLE `onboarding_sessions`
    MODIFY `token_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;

ALTER TABLE `consent_documents`
    MODIFY `content_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;

ALTER TABLE `user_consents`
    MODIFY `ip_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL;

ALTER TABLE `abuse_counters`
    MODIFY `subject_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;

ALTER TABLE `idempotency_records`
    MODIFY `scope_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    MODIFY `idempotency_key` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    MODIFY `request_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;
