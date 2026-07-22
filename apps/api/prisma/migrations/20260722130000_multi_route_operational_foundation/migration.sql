-- M7C1 backend multi-route operational foundation.
-- Additive only: legacy/demo rows remain valid with null canonical references.

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
  'driver_availability_status_changed', 'driver_availability_activated',
  'driver_availability_paused', 'driver_availability_resumed',
  'driver_availability_cancelled', 'canonical_passenger_request_created',
  'canonical_merchant_order_created', 'capacity_reserved', 'capacity_confirmed',
  'capacity_released', 'capacity_expired'
) NOT NULL;

ALTER TABLE `driver_routes`
  ADD UNIQUE INDEX `driver_routes_route_ownership_key` (`id`, `route_version_id`),
  ADD UNIQUE INDEX `driver_routes_one_off_departure_key` (`driver_id`, `route_version_id`, `departure_at`);

ALTER TABLE `passenger_requests`
  ADD COLUMN `route_version_id` VARCHAR(191) NULL,
  ADD COLUMN `pickup_stop_id` VARCHAR(191) NULL,
  ADD COLUMN `dropoff_stop_id` VARCHAR(191) NULL,
  ADD COLUMN `canonical_entry_version` VARCHAR(50) NULL,
  ADD COLUMN `requested_departure_from` DATETIME(3) NULL,
  ADD COLUMN `requested_departure_until` DATETIME(3) NULL,
  ADD COLUMN `canonical_created_at` DATETIME(3) NULL,
  ADD INDEX `passenger_requests_route_departure_idx` (`route_version_id`, `requested_departure_from`),
  ADD CONSTRAINT `passenger_requests_passenger_count_chk` CHECK (`passenger_count` > 0),
  ADD CONSTRAINT `passenger_requests_canonical_shape_chk` CHECK (
    (`canonical_entry_version` IS NULL AND `route_version_id` IS NULL AND `pickup_stop_id` IS NULL AND
     `dropoff_stop_id` IS NULL AND `requested_departure_from` IS NULL AND
     `requested_departure_until` IS NULL AND `canonical_created_at` IS NULL)
    OR
    (`canonical_entry_version` = 'canonical_route_v1' AND `route_version_id` IS NOT NULL AND
     `pickup_stop_id` IS NOT NULL AND `dropoff_stop_id` IS NOT NULL AND
     `requested_departure_from` IS NOT NULL AND `requested_departure_until` IS NOT NULL AND
     `requested_departure_until` > `requested_departure_from` AND `canonical_created_at` IS NOT NULL)
  ),
  ADD CONSTRAINT `passenger_requests_route_version_fkey`
    FOREIGN KEY (`route_version_id`) REFERENCES `service_route_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `passenger_requests_pickup_membership_fkey`
    FOREIGN KEY (`route_version_id`, `pickup_stop_id`)
    REFERENCES `route_version_stops` (`service_route_version_id`, `stop_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `passenger_requests_dropoff_membership_fkey`
    FOREIGN KEY (`route_version_id`, `dropoff_stop_id`)
    REFERENCES `route_version_stops` (`service_route_version_id`, `stop_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `merchant_orders`
  ADD COLUMN `route_version_id` VARCHAR(191) NULL,
  ADD COLUMN `pickup_stop_id` VARCHAR(191) NULL,
  ADD COLUMN `canonical_entry_version` VARCHAR(50) NULL,
  ADD COLUMN `requested_departure_from` DATETIME(3) NULL,
  ADD COLUMN `requested_departure_until` DATETIME(3) NULL,
  ADD COLUMN `canonical_created_at` DATETIME(3) NULL,
  ADD UNIQUE INDEX `merchant_orders_route_ownership_key` (`id`, `route_version_id`),
  ADD INDEX `merchant_orders_route_departure_idx` (`route_version_id`, `requested_departure_from`),
  ADD CONSTRAINT `merchant_orders_canonical_shape_chk` CHECK (
    (`canonical_entry_version` IS NULL AND `route_version_id` IS NULL AND `pickup_stop_id` IS NULL AND
     `requested_departure_from` IS NULL AND `requested_departure_until` IS NULL AND `canonical_created_at` IS NULL)
    OR
    (`canonical_entry_version` = 'canonical_route_v1' AND `route_version_id` IS NOT NULL AND
     `pickup_stop_id` IS NOT NULL AND `requested_departure_from` IS NOT NULL AND
     `requested_departure_until` IS NOT NULL AND `requested_departure_until` > `requested_departure_from` AND
     `canonical_created_at` IS NOT NULL)
  ),
  ADD CONSTRAINT `merchant_orders_route_version_fkey`
    FOREIGN KEY (`route_version_id`) REFERENCES `service_route_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `merchant_orders_pickup_membership_fkey`
    FOREIGN KEY (`route_version_id`, `pickup_stop_id`)
    REFERENCES `route_version_stops` (`service_route_version_id`, `stop_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `parcels`
  ADD COLUMN `route_version_id` VARCHAR(191) NULL,
  ADD COLUMN `destination_stop_id` VARCHAR(191) NULL,
  ADD COLUMN `canonical_entry_version` VARCHAR(50) NULL,
  ADD INDEX `parcels_route_destination_idx` (`route_version_id`, `destination_stop_id`),
  ADD CONSTRAINT `parcels_canonical_shape_chk` CHECK (
    (`canonical_entry_version` IS NULL AND `route_version_id` IS NULL AND `destination_stop_id` IS NULL)
    OR
    (`canonical_entry_version` = 'canonical_route_v1' AND `route_version_id` IS NOT NULL AND `destination_stop_id` IS NOT NULL)
  ),
  ADD CONSTRAINT `parcels_route_version_fkey`
    FOREIGN KEY (`route_version_id`) REFERENCES `service_route_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `parcels_destination_membership_fkey`
    FOREIGN KEY (`route_version_id`, `destination_stop_id`)
    REFERENCES `route_version_stops` (`service_route_version_id`, `stop_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `parcels_order_route_fkey`
    FOREIGN KEY (`order_id`, `route_version_id`)
    REFERENCES `merchant_orders` (`id`, `route_version_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `matches`
  ADD COLUMN `route_version_id` VARCHAR(191) NULL,
  ADD COLUMN `canonical_match_version` VARCHAR(50) NULL,
  ADD INDEX `matches_route_version_status_idx` (`route_version_id`, `status`),
  ADD CONSTRAINT `matches_canonical_shape_chk` CHECK (
    (`canonical_match_version` IS NULL AND `route_version_id` IS NULL)
    OR (`canonical_match_version` IS NOT NULL AND `route_version_id` IS NOT NULL)
  ),
  ADD CONSTRAINT `matches_route_version_fkey`
    FOREIGN KEY (`route_version_id`) REFERENCES `service_route_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `trips`
  ADD COLUMN `route_version_id` VARCHAR(191) NULL,
  ADD COLUMN `canonical_trip_version` VARCHAR(50) NULL,
  ADD COLUMN `route_snapshot_json` JSON NULL,
  ADD COLUMN `route_snapshot_checksum` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD INDEX `trips_route_version_status_idx` (`route_version_id`, `status`),
  ADD CONSTRAINT `trips_canonical_shape_chk` CHECK (
    (`canonical_trip_version` IS NULL AND `route_version_id` IS NULL AND
     `route_snapshot_json` IS NULL AND `route_snapshot_checksum` IS NULL)
    OR
    (`canonical_trip_version` IS NOT NULL AND `route_version_id` IS NOT NULL AND
     `route_snapshot_json` IS NOT NULL AND `route_snapshot_checksum` IS NOT NULL)
  ),
  ADD CONSTRAINT `trips_route_version_fkey`
    FOREIGN KEY (`route_version_id`) REFERENCES `service_route_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE `capacity_reservations` (
  `id` VARCHAR(191) NOT NULL,
  `driver_route_id` VARCHAR(191) NOT NULL,
  `route_version_id` VARCHAR(191) NOT NULL,
  `match_id` VARCHAR(191) NULL,
  `reservation_type` ENUM('passenger', 'parcel', 'combined') NOT NULL,
  `status` ENUM('held', 'confirmed', 'released', 'expired') NOT NULL DEFAULT 'held',
  `seats_reserved` INTEGER NOT NULL DEFAULT 0,
  `parcel_units_reserved` INTEGER NOT NULL DEFAULT 0,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `confirmed_at` DATETIME(3) NULL,
  `released_at` DATETIME(3) NULL,
  `release_reason` VARCHAR(80) NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `created_request_id` VARCHAR(64) NULL,
  `idempotency_fingerprint` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  UNIQUE INDEX `capacity_reservations_match_id_key` (`match_id`),
  INDEX `capacity_reservations_status_expires_at_idx` (`status`, `expires_at`),
  INDEX `capacity_reservations_driver_route_id_status_idx` (`driver_route_id`, `status`),
  CONSTRAINT `capacity_reservations_amounts_chk` CHECK (
    `seats_reserved` >= 0 AND `parcel_units_reserved` >= 0 AND (`seats_reserved` > 0 OR `parcel_units_reserved` > 0)
  ),
  CONSTRAINT `capacity_reservations_type_chk` CHECK (
    (`reservation_type` = 'passenger' AND `seats_reserved` > 0 AND `parcel_units_reserved` = 0) OR
    (`reservation_type` = 'parcel' AND `seats_reserved` = 0 AND `parcel_units_reserved` > 0) OR
    (`reservation_type` = 'combined' AND `seats_reserved` > 0 AND `parcel_units_reserved` > 0)
  ),
  CONSTRAINT `capacity_reservations_revision_chk` CHECK (`revision` > 0),
  CONSTRAINT `capacity_reservations_terminal_timestamps_chk` CHECK (
    (`status` = 'held' AND `confirmed_at` IS NULL AND `released_at` IS NULL) OR
    (`status` = 'confirmed' AND `confirmed_at` IS NOT NULL AND `released_at` IS NULL) OR
    (`status` IN ('released', 'expired') AND `released_at` IS NOT NULL)
  ),
  CONSTRAINT `capacity_reservations_driver_route_fkey`
    FOREIGN KEY (`driver_route_id`) REFERENCES `driver_routes` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `capacity_reservations_route_version_fkey`
    FOREIGN KEY (`route_version_id`) REFERENCES `service_route_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `capacity_reservations_driver_route_version_fkey`
    FOREIGN KEY (`driver_route_id`, `route_version_id`)
    REFERENCES `driver_routes` (`id`, `route_version_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `capacity_reservations_match_id_fkey`
    FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
