-- AlterTable
ALTER TABLE `audit_events` MODIFY `action` ENUM('auth_login', 'session_created', 'session_refreshed', 'session_revoked', 'logout_all', 'refresh_token_reuse_detected', 'account_status_changed', 'login_blocked_by_status', 'demo_reset', 'passenger_request_created', 'passenger_request_cancelled', 'driver_route_created', 'driver_route_deactivated', 'merchant_order_created', 'parcel_batch_created', 'comparison_run_created', 'match_accepted', 'match_rejected', 'trip_status_updated', 'location_recorded', 'tracking_simulation_step', 'driver_verification', 'match_decision', 'admin_action', 'invitation_created', 'invitation_revoked', 'invitation_redeemed', 'otp_challenge_created', 'otp_verified', 'consent_recorded', 'invitation_consumed', 'onboarding_attempt_created', 'otp_dispatch_accepted', 'otp_dispatch_rejected', 'otp_verification_failed', 'onboarding_session_created', 'onboarding_session_revoked', 'consent_document_created', 'abuse_limit_reached', 'idempotency_conflict') NOT NULL;

-- CreateTable
CREATE TABLE `invitations` (
    `id` VARCHAR(191) NOT NULL,
    `code_digest` CHAR(64) NOT NULL,
    `code_key_version` INTEGER NOT NULL,
    `intended_role` ENUM('passenger', 'driver', 'merchant') NOT NULL,
    `intended_phone_digest` CHAR(64) NOT NULL,
    `phone_digest_version` INTEGER NOT NULL,
    `phone_last4` CHAR(4) NOT NULL,
    `campaign` VARCHAR(100) NULL,
    `source` VARCHAR(100) NULL,
    `metadata` JSON NULL,
    `max_uses` INTEGER NOT NULL DEFAULT 1,
    `used_count` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `revoke_reason` VARCHAR(500) NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `revoked_by_id` VARCHAR(191) NULL,
    `last_used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invitations_code_digest_key`(`code_digest`),
    INDEX `invitations_created_at_idx`(`created_at`),
    INDEX `invitations_expires_at_revoked_at_idx`(`expires_at`, `revoked_at`),
    INDEX `invitations_intended_role_created_at_idx`(`intended_role`, `created_at`),
    CONSTRAINT `invitations_single_use_chk` CHECK (`max_uses` = 1 AND `used_count` >= 0 AND `used_count` <= 1),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invitation_redemptions` (
    `id` VARCHAR(191) NOT NULL,
    `invitation_id` VARCHAR(191) NOT NULL,
    `onboarding_attempt_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `redeemed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invitation_redemptions_onboarding_attempt_id_key`(`onboarding_attempt_id`),
    INDEX `invitation_redemptions_invitation_id_redeemed_at_idx`(`invitation_id`, `redeemed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `invitation_id` VARCHAR(191) NOT NULL,
    `intended_role` ENUM('passenger', 'driver', 'merchant') NOT NULL,
    `phone_e164` VARCHAR(16) NOT NULL,
    `phone_digest` CHAR(64) NOT NULL,
    `phone_digest_version` INTEGER NOT NULL,
    `phone_last4` CHAR(4) NOT NULL,
    `status` ENUM('created', 'otp_dispatching', 'otp_sent', 'phone_verified', 'completed', 'expired', 'locked', 'cancelled') NOT NULL DEFAULT 'created',
    `current_challenge_id` VARCHAR(191) NULL,
    `completed_user_id` VARCHAR(191) NULL,
    `request_ip_digest` CHAR(64) NULL,
    `request_ip_digest_version` INTEGER NULL,
    `created_request_id` VARCHAR(64) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `verified_at` DATETIME(3) NULL,
    `registration_grant_digest` CHAR(64) NULL,
    `registration_grant_key_version` INTEGER NULL,
    `registration_grant_expires_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `onboarding_attempts_current_challenge_id_key`(`current_challenge_id`),
    INDEX `onboarding_attempts_phone_digest_status_idx`(`phone_digest`, `status`),
    INDEX `onboarding_attempts_invitation_id_created_at_idx`(`invitation_id`, `created_at`),
    INDEX `onboarding_attempts_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_challenges` (
    `id` VARCHAR(191) NOT NULL,
    `onboarding_attempt_id` VARCHAR(191) NOT NULL,
    `generation` INTEGER NOT NULL,
    `purpose` ENUM('registration') NOT NULL DEFAULT 'registration',
    `provider` VARCHAR(50) NOT NULL,
    `code_digest` CHAR(64) NOT NULL,
    `code_key_version` INTEGER NOT NULL,
    `delivery_status` ENUM('dispatching', 'accepted', 'rejected', 'unknown') NOT NULL DEFAULT 'dispatching',
    `provider_message_id` VARCHAR(191) NULL,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `superseded_at` DATETIME(3) NULL,
    `last_sent_at` DATETIME(3) NULL,
    `locked_until` DATETIME(3) NULL,
    `delivery_updated_at` DATETIME(3) NOT NULL,
    `request_id` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_challenges_onboarding_attempt_id_expires_at_idx`(`onboarding_attempt_id`, `expires_at`),
    UNIQUE INDEX `otp_challenges_onboarding_attempt_id_generation_key`(`onboarding_attempt_id`, `generation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `onboarding_attempt_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `token_digest` CHAR(64) NOT NULL,
    `token_key_version` INTEGER NOT NULL,
    `purpose` ENUM('onboarding_completion') NOT NULL DEFAULT 'onboarding_completion',
    `expires_at` DATETIME(3) NOT NULL,
    `last_used_at` DATETIME(3) NULL,
    `consumed_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `revoke_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `onboarding_sessions_token_digest_key`(`token_digest`),
    INDEX `onboarding_sessions_onboarding_attempt_id_expires_at_idx`(`onboarding_attempt_id`, `expires_at`),
    INDEX `onboarding_sessions_user_id_revoked_at_expires_at_idx`(`user_id`, `revoked_at`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consent_documents` (
    `id` VARCHAR(191) NOT NULL,
    `document_type` ENUM('terms', 'privacy', 'adult_self_attestation') NOT NULL,
    `version` VARCHAR(50) NOT NULL,
    `locale` ENUM('ar', 'en') NOT NULL,
    `content_digest` CHAR(64) NOT NULL,
    `content_reference` VARCHAR(500) NULL,
    `effective_at` DATETIME(3) NOT NULL,
    `retired_at` DATETIME(3) NULL,
    `legal_approved_at` DATETIME(3) NULL,
    `legal_approved_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `consent_documents_document_type_locale_effective_at_idx`(`document_type`, `locale`, `effective_at`),
    UNIQUE INDEX `consent_documents_document_type_version_locale_key`(`document_type`, `version`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_consents` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `consent_document_id` VARCHAR(191) NOT NULL,
    `accepted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `request_id` VARCHAR(64) NULL,
    `ip_digest` CHAR(64) NULL,
    `ip_digest_version` INTEGER NULL,
    `source` VARCHAR(50) NOT NULL,
    `app_release` VARCHAR(100) NULL,

    INDEX `user_consents_consent_document_id_accepted_at_idx`(`consent_document_id`, `accepted_at`),
    UNIQUE INDEX `user_consents_user_id_consent_document_id_key`(`user_id`, `consent_document_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `abuse_counters` (
    `id` VARCHAR(191) NOT NULL,
    `bucket_type` VARCHAR(50) NOT NULL,
    `subject_digest` CHAR(64) NOT NULL,
    `digest_version` INTEGER NOT NULL,
    `window_start` DATETIME(3) NOT NULL,
    `window_seconds` INTEGER NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `abuse_counters_window_start_idx`(`window_start`),
    UNIQUE INDEX `abuse_counters_bucket_type_subject_digest_digest_version_win_key`(`bucket_type`, `subject_digest`, `digest_version`, `window_start`, `window_seconds`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idempotency_records` (
    `id` VARCHAR(191) NOT NULL,
    `operation` VARCHAR(80) NOT NULL,
    `scope_digest` CHAR(64) NOT NULL,
    `idempotency_key` CHAR(64) NOT NULL,
    `key_version` INTEGER NOT NULL,
    `request_digest` CHAR(64) NOT NULL,
    `state` ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
    `resource_type` VARCHAR(80) NULL,
    `resource_id` VARCHAR(191) NULL,
    `response_status` INTEGER NULL,
    `completed_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idempotency_records_expires_at_idx`(`expires_at`),
    UNIQUE INDEX `idempotency_claim_key`(`operation`, `scope_digest`, `idempotency_key`, `key_version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_revoked_by_id_fkey` FOREIGN KEY (`revoked_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitation_redemptions` ADD CONSTRAINT `invitation_redemptions_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `invitations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitation_redemptions` ADD CONSTRAINT `invitation_redemptions_onboarding_attempt_id_fkey` FOREIGN KEY (`onboarding_attempt_id`) REFERENCES `onboarding_attempts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitation_redemptions` ADD CONSTRAINT `invitation_redemptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_attempts` ADD CONSTRAINT `onboarding_attempts_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `invitations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_attempts` ADD CONSTRAINT `onboarding_attempts_current_challenge_id_fkey` FOREIGN KEY (`current_challenge_id`) REFERENCES `otp_challenges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_attempts` ADD CONSTRAINT `onboarding_attempts_completed_user_id_fkey` FOREIGN KEY (`completed_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_challenges` ADD CONSTRAINT `otp_challenges_onboarding_attempt_id_fkey` FOREIGN KEY (`onboarding_attempt_id`) REFERENCES `onboarding_attempts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_sessions` ADD CONSTRAINT `onboarding_sessions_onboarding_attempt_id_fkey` FOREIGN KEY (`onboarding_attempt_id`) REFERENCES `onboarding_attempts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_sessions` ADD CONSTRAINT `onboarding_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_consents` ADD CONSTRAINT `user_consents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- AddForeignKey
ALTER TABLE `user_consents` ADD CONSTRAINT `user_consents_consent_document_id_fkey` FOREIGN KEY (`consent_document_id`) REFERENCES `consent_documents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
