-- AlterTable
ALTER TABLE `users`
    ADD COLUMN `account_status` ENUM('active', 'pending', 'suspended', 'disabled') NOT NULL DEFAULT 'active',
    ADD COLUMN `security_version` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `status_reason` VARCHAR(500) NULL,
    ADD COLUMN `status_updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `last_login_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `audit_events`
    MODIFY `action` ENUM(
        'auth_login',
        'session_created',
        'session_refreshed',
        'session_revoked',
        'logout_all',
        'refresh_token_reuse_detected',
        'account_status_changed',
        'login_blocked_by_status',
        'demo_reset',
        'passenger_request_created',
        'passenger_request_cancelled',
        'driver_route_created',
        'driver_route_deactivated',
        'merchant_order_created',
        'parcel_batch_created',
        'comparison_run_created',
        'match_accepted',
        'match_rejected',
        'trip_status_updated',
        'location_recorded',
        'tracking_simulation_step',
        'driver_verification',
        'match_decision',
        'admin_action'
    ) NOT NULL;

-- CreateTable
CREATE TABLE `auth_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `client_type` ENUM('mobile', 'admin') NOT NULL,
    `device_name` VARCHAR(120) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `revoke_reason` VARCHAR(191) NULL,
    `security_version_at_issue` INTEGER NOT NULL,

    INDEX `auth_sessions_user_id_revoked_at_expires_at_idx`(`user_id`, `revoked_at`, `expires_at`),
    INDEX `auth_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `replaced_by_id` VARCHAR(191) NULL,

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    UNIQUE INDEX `refresh_tokens_replaced_by_id_key`(`replaced_by_id`),
    INDEX `refresh_tokens_session_id_revoked_at_expires_at_idx`(`session_id`, `revoked_at`, `expires_at`),
    INDEX `refresh_tokens_session_id_used_at_revoked_at_idx`(`session_id`, `used_at`, `revoked_at`),
    INDEX `refresh_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_session_id_fkey`
    FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_replaced_by_id_fkey`
    FOREIGN KEY (`replaced_by_id`) REFERENCES `refresh_tokens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
