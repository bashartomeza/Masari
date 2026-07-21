-- M7B canonical route catalog and driver availability foundation.
-- Existing PostgreSQL/MySQL migration history remains immutable; this is an additive MySQL migration.

ALTER TABLE `audit_events` MODIFY `action` ENUM(
  'auth_login', 'session_created', 'session_refreshed', 'session_revoked', 'logout_all',
  'refresh_token_reuse_detected', 'account_status_changed', 'login_blocked_by_status',
  'demo_reset', 'passenger_request_created', 'passenger_request_cancelled',
  'driver_route_created', 'driver_route_deactivated', 'merchant_order_created',
  'parcel_batch_created', 'comparison_run_created', 'match_accepted', 'match_rejected',
  'trip_status_updated', 'location_recorded', 'tracking_simulation_step',
  'driver_verification', 'match_decision', 'admin_action', 'invitation_created',
  'invitation_revoked', 'invitation_redeemed', 'otp_challenge_created', 'otp_verified',
  'consent_recorded', 'invitation_consumed', 'onboarding_attempt_created',
  'otp_dispatch_accepted', 'otp_dispatch_rejected', 'otp_verification_failed',
  'onboarding_session_created', 'onboarding_session_revoked', 'consent_document_created',
  'abuse_limit_reached', 'idempotency_conflict', 'onboarding_started', 'onboarding_resumed',
  'otp_resent', 'registration_completed', 'registration_completion_failed',
  'pending_status_session_created', 'onboarding_status_accessed', 'onboarding_rate_limited',
  'onboarding_idempotency_conflict', 'route_created', 'route_version_created',
  'route_draft_updated', 'route_stops_updated', 'route_version_published',
  'route_version_paused', 'route_version_resumed', 'route_version_retired',
  'route_retired', 'stop_created', 'stop_updated', 'stop_retired',
  'driver_availability_created', 'driver_availability_updated',
  'driver_availability_status_changed'
) NOT NULL;

CREATE TABLE `stops` (
  `id` VARCHAR(191) NOT NULL,
  `stop_key` VARCHAR(80) NOT NULL,
  `service_region_key` VARCHAR(80) NOT NULL,
  `name_ar` VARCHAR(160) NOT NULL,
  `name_en` VARCHAR(160) NOT NULL,
  `latitude` DECIMAL(9, 6) NOT NULL,
  `longitude` DECIMAL(9, 6) NOT NULL,
  `status` ENUM('active', 'retired') NOT NULL DEFAULT 'active',
  `created_by_user_id` VARCHAR(191) NOT NULL,
  `retired_by_user_id` VARCHAR(191) NULL,
  `retired_at` DATETIME(3) NULL,
  `retirement_reason` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `stops_stop_key_key` (`stop_key`),
  INDEX `stops_service_region_key_status_idx` (`service_region_key`, `status`),
  CONSTRAINT `stops_latitude_check` CHECK (`latitude` BETWEEN -90 AND 90),
  CONSTRAINT `stops_longitude_check` CHECK (`longitude` BETWEEN -180 AND 180),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `service_routes` (
  `id` VARCHAR(191) NOT NULL,
  `route_key` VARCHAR(80) NOT NULL,
  `route_group_key` VARCHAR(80) NOT NULL,
  `service_region_key` VARCHAR(80) NOT NULL,
  `direction` ENUM('outbound', 'inbound', 'loop') NOT NULL,
  `status` ENUM('active', 'retired') NOT NULL DEFAULT 'active',
  `current_version_id` VARCHAR(191) NULL,
  `created_by_user_id` VARCHAR(191) NOT NULL,
  `retired_by_user_id` VARCHAR(191) NULL,
  `retired_at` DATETIME(3) NULL,
  `retirement_reason` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `service_routes_route_key_key` (`route_key`),
  UNIQUE INDEX `service_routes_current_version_id_key` (`current_version_id`),
  INDEX `service_routes_route_group_key_direction_idx` (`route_group_key`, `direction`),
  INDEX `service_routes_service_region_key_status_idx` (`service_region_key`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `service_route_versions` (
  `id` VARCHAR(191) NOT NULL,
  `service_route_id` VARCHAR(191) NOT NULL,
  `version_number` INTEGER NOT NULL,
  `status` ENUM('draft', 'published', 'paused', 'retired') NOT NULL DEFAULT 'draft',
  `name_ar` VARCHAR(160) NOT NULL,
  `name_en` VARCHAR(160) NOT NULL,
  `description_ar` TEXT NULL,
  `description_en` TEXT NULL,
  `origin_stop_id` VARCHAR(191) NULL,
  `destination_stop_id` VARCHAR(191) NULL,
  `active_from` DATETIME(3) NULL,
  `active_until` DATETIME(3) NULL,
  `encoded_geometry` LONGTEXT NULL,
  `geometry_encoding` VARCHAR(50) NULL,
  `geometry_provider` VARCHAR(80) NULL,
  `geometry_checksum` CHAR(64) NULL,
  `geometry_precision` INTEGER NULL,
  `estimated_distance_meters` INTEGER NULL,
  `estimated_duration_seconds` INTEGER NULL,
  `geometry_status` ENUM('pending', 'available', 'unavailable') NOT NULL DEFAULT 'pending',
  `draft_revision` INTEGER NOT NULL DEFAULT 1,
  `created_by_user_id` VARCHAR(191) NOT NULL,
  `published_by_user_id` VARCHAR(191) NULL,
  `paused_by_user_id` VARCHAR(191) NULL,
  `retired_by_user_id` VARCHAR(191) NULL,
  `published_at` DATETIME(3) NULL,
  `paused_at` DATETIME(3) NULL,
  `pause_reason` VARCHAR(500) NULL,
  `retired_at` DATETIME(3) NULL,
  `retirement_reason` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `service_route_versions_service_route_id_status_idx` (`service_route_id`, `status`),
  INDEX `service_route_versions_status_active_from_active_until_idx` (`status`, `active_from`, `active_until`),
  UNIQUE INDEX `service_route_versions_service_route_id_version_number_key` (`service_route_id`, `version_number`),
  CONSTRAINT `service_route_versions_number_check` CHECK (`version_number` > 0),
  CONSTRAINT `service_route_versions_revision_check` CHECK (`draft_revision` > 0),
  CONSTRAINT `service_route_versions_active_window_check` CHECK (`active_until` IS NULL OR `active_from` IS NULL OR `active_until` > `active_from`),
  CONSTRAINT `service_route_versions_geometry_precision_check` CHECK (`geometry_precision` IS NULL OR `geometry_precision` BETWEEN 0 AND 10),
  CONSTRAINT `service_route_versions_distance_check` CHECK (`estimated_distance_meters` IS NULL OR `estimated_distance_meters` >= 0),
  CONSTRAINT `service_route_versions_duration_check` CHECK (`estimated_duration_seconds` IS NULL OR `estimated_duration_seconds` >= 0),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `route_version_stops` (
  `id` VARCHAR(191) NOT NULL,
  `service_route_version_id` VARCHAR(191) NOT NULL,
  `stop_id` VARCHAR(191) NOT NULL,
  `sequence` INTEGER NOT NULL,
  `passenger_pickup` BOOLEAN NOT NULL DEFAULT true,
  `passenger_dropoff` BOOLEAN NOT NULL DEFAULT true,
  `parcel_pickup` BOOLEAN NOT NULL DEFAULT true,
  `parcel_dropoff` BOOLEAN NOT NULL DEFAULT true,
  `distance_from_origin_meters` INTEGER NULL,
  `scheduled_offset_seconds` INTEGER NULL,
  `dwell_seconds` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `route_version_stops_stop_id_idx` (`stop_id`),
  UNIQUE INDEX `route_version_stops_service_route_version_id_sequence_key` (`service_route_version_id`, `sequence`),
  UNIQUE INDEX `route_version_stops_service_route_version_id_stop_id_key` (`service_route_version_id`, `stop_id`),
  CONSTRAINT `route_version_stops_sequence_check` CHECK (`sequence` > 0),
  CONSTRAINT `route_version_stops_distance_check` CHECK (`distance_from_origin_meters` IS NULL OR `distance_from_origin_meters` >= 0),
  CONSTRAINT `route_version_stops_offset_check` CHECK (`scheduled_offset_seconds` IS NULL OR `scheduled_offset_seconds` >= 0),
  CONSTRAINT `route_version_stops_dwell_check` CHECK (`dwell_seconds` IS NULL OR `dwell_seconds` >= 0),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `driver_routes`
  ADD COLUMN `availability_revision` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `availability_status` ENUM('draft', 'active', 'paused', 'filled', 'departed', 'completed', 'cancelled', 'expired') NULL,
  ADD COLUMN `availability_window_end` DATETIME(3) NULL,
  ADD COLUMN `cancelled_at` DATETIME(3) NULL,
  ADD COLUMN `departed_at` DATETIME(3) NULL,
  ADD COLUMN `departure_at` DATETIME(3) NULL,
  ADD COLUMN `expired_at` DATETIME(3) NULL,
  ADD COLUMN `filled_at` DATETIME(3) NULL,
  ADD COLUMN `paused_at` DATETIME(3) NULL,
  ADD COLUMN `remaining_parcel_capacity` INTEGER NULL,
  ADD COLUMN `remaining_seats` INTEGER NULL,
  ADD COLUMN `route_version_id` VARCHAR(191) NULL,
  ADD COLUMN `total_parcel_capacity` INTEGER NULL,
  ADD COLUMN `total_seats` INTEGER NULL;

UPDATE `driver_routes`
SET
  `total_seats` = `seats_available`,
  `remaining_seats` = `seats_available`,
  `total_parcel_capacity` = `parcel_capacity_available`,
  `remaining_parcel_capacity` = `parcel_capacity_available`,
  `departure_at` = `activated_at`,
  `availability_status` = CASE `status`
    WHEN 'active' THEN 'active'
    WHEN 'assigned' THEN 'filled'
    WHEN 'on_trip' THEN 'departed'
    WHEN 'completed' THEN 'completed'
    ELSE 'draft'
  END;

ALTER TABLE `driver_routes`
  ADD CONSTRAINT `driver_routes_availability_revision_check` CHECK (`availability_revision` > 0),
  ADD CONSTRAINT `driver_routes_total_seats_check` CHECK (`total_seats` IS NULL OR `total_seats` >= 0),
  ADD CONSTRAINT `driver_routes_remaining_seats_check` CHECK (`remaining_seats` IS NULL OR (`remaining_seats` >= 0 AND `remaining_seats` <= `total_seats`)),
  ADD CONSTRAINT `driver_routes_total_parcel_capacity_check` CHECK (`total_parcel_capacity` IS NULL OR `total_parcel_capacity` >= 0),
  ADD CONSTRAINT `driver_routes_remaining_parcel_capacity_check` CHECK (`remaining_parcel_capacity` IS NULL OR (`remaining_parcel_capacity` >= 0 AND `remaining_parcel_capacity` <= `total_parcel_capacity`)),
  ADD CONSTRAINT `driver_routes_availability_window_check` CHECK (`availability_window_end` IS NULL OR `departure_at` IS NULL OR `availability_window_end` >= `departure_at`),
  ADD INDEX `driver_routes_route_version_id_availability_status_departure_idx` (`route_version_id`, `availability_status`, `departure_at`);

ALTER TABLE `stops`
  ADD CONSTRAINT `stops_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `stops_retired_by_user_id_fkey` FOREIGN KEY (`retired_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `service_routes`
  ADD CONSTRAINT `service_routes_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `service_routes_retired_by_user_id_fkey` FOREIGN KEY (`retired_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `service_route_versions`
  ADD CONSTRAINT `service_route_versions_service_route_id_fkey` FOREIGN KEY (`service_route_id`) REFERENCES `service_routes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `service_route_versions_origin_stop_id_fkey` FOREIGN KEY (`origin_stop_id`) REFERENCES `stops` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `service_route_versions_destination_stop_id_fkey` FOREIGN KEY (`destination_stop_id`) REFERENCES `stops` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `service_route_versions_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `service_route_versions_published_by_user_id_fkey` FOREIGN KEY (`published_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `service_route_versions_paused_by_user_id_fkey` FOREIGN KEY (`paused_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `service_route_versions_retired_by_user_id_fkey` FOREIGN KEY (`retired_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `route_version_stops`
  ADD CONSTRAINT `route_version_stops_service_route_version_id_fkey` FOREIGN KEY (`service_route_version_id`) REFERENCES `service_route_versions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `route_version_stops_stop_id_fkey` FOREIGN KEY (`stop_id`) REFERENCES `stops` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `service_routes`
  ADD CONSTRAINT `service_routes_current_version_id_fkey` FOREIGN KEY (`current_version_id`) REFERENCES `service_route_versions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `driver_routes`
  ADD CONSTRAINT `driver_routes_route_version_id_fkey` FOREIGN KEY (`route_version_id`) REFERENCES `service_route_versions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
