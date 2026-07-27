-- M7C3A canonical matching and assignment foundation.
-- Forward-only: normalize operational modes and add sequential demand dispatch.

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
  'capacity_released', 'capacity_expired', 'canonical_matching_run_started',
  'canonical_matching_run_completed', 'canonical_offer_created',
  'canonical_offer_accepted', 'canonical_offer_rejected', 'canonical_offer_expired',
  'canonical_offer_reassigned', 'canonical_trip_created', 'canonical_dispatch_unavailable'
) NOT NULL;

ALTER TABLE `passenger_requests`
  ADD COLUMN `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'legacy';

UPDATE `passenger_requests`
SET `operational_mode` = 'canonical_route_v1'
WHERE `canonical_entry_version` = 'canonical_route_v1';

ALTER TABLE `passenger_requests`
  DROP CHECK `passenger_requests_canonical_shape_chk`,
  ADD UNIQUE INDEX `passenger_requests_mode_ownership_key` (`id`, `operational_mode`),
  ADD UNIQUE INDEX `passenger_requests_route_mode_ownership_key`
    (`id`, `route_version_id`, `operational_mode`),
  ADD CONSTRAINT `passenger_requests_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_entry_version` IS NULL AND
     `route_version_id` IS NULL AND `pickup_stop_id` IS NULL AND `dropoff_stop_id` IS NULL AND
     `requested_departure_from` IS NULL AND `requested_departure_until` IS NULL AND
     `canonical_created_at` IS NULL)
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_entry_version` = 'canonical_route_v1' AND `route_version_id` IS NOT NULL AND
     `pickup_stop_id` IS NOT NULL AND `dropoff_stop_id` IS NOT NULL AND
     `requested_departure_from` IS NOT NULL AND `requested_departure_until` IS NOT NULL AND
     `requested_departure_until` > `requested_departure_from` AND `canonical_created_at` IS NOT NULL)
  );

ALTER TABLE `merchant_orders`
  ADD COLUMN `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'legacy';

UPDATE `merchant_orders`
SET `operational_mode` = 'canonical_route_v1'
WHERE `canonical_entry_version` = 'canonical_route_v1';

ALTER TABLE `merchant_orders`
  DROP CHECK `merchant_orders_canonical_shape_chk`,
  ADD UNIQUE INDEX `merchant_orders_mode_ownership_key` (`id`, `operational_mode`),
  ADD UNIQUE INDEX `merchant_orders_route_mode_ownership_key`
    (`id`, `route_version_id`, `operational_mode`),
  ADD CONSTRAINT `merchant_orders_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_entry_version` IS NULL AND
     `route_version_id` IS NULL AND `pickup_stop_id` IS NULL AND
     `requested_departure_from` IS NULL AND `requested_departure_until` IS NULL AND
     `canonical_created_at` IS NULL)
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_entry_version` = 'canonical_route_v1' AND `route_version_id` IS NOT NULL AND
     `pickup_stop_id` IS NOT NULL AND `requested_departure_from` IS NOT NULL AND
     `requested_departure_until` IS NOT NULL AND
     `requested_departure_until` > `requested_departure_from` AND `canonical_created_at` IS NOT NULL)
  );

ALTER TABLE `parcels`
  DROP FOREIGN KEY `parcels_order_route_fkey`,
  ADD COLUMN `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'legacy';

UPDATE `parcels`
SET `operational_mode` = 'canonical_route_v1'
WHERE `canonical_entry_version` = 'canonical_route_v1';

ALTER TABLE `parcels`
  DROP CHECK `parcels_canonical_shape_chk`,
  ADD INDEX `parcels_order_mode_idx` (`order_id`, `operational_mode`),
  ADD INDEX `parcels_order_route_mode_idx` (`order_id`, `route_version_id`, `operational_mode`),
  ADD CONSTRAINT `parcels_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_entry_version` IS NULL AND
     `route_version_id` IS NULL AND `destination_stop_id` IS NULL)
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_entry_version` = 'canonical_route_v1' AND
     `route_version_id` IS NOT NULL AND `destination_stop_id` IS NOT NULL)
  ),
  ADD CONSTRAINT `parcels_order_mode_fkey`
    FOREIGN KEY (`order_id`, `operational_mode`)
    REFERENCES `merchant_orders` (`id`, `operational_mode`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `parcels_order_route_mode_fkey`
    FOREIGN KEY (`order_id`, `route_version_id`, `operational_mode`)
    REFERENCES `merchant_orders` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `driver_routes`
  ADD UNIQUE INDEX `driver_routes_route_mode_ownership_key`
    (`id`, `route_version_id`, `operational_mode`);

ALTER TABLE `capacity_reservations`
  ADD UNIQUE INDEX `capacity_reservations_offer_ownership_key`
    (`id`, `driver_route_id`, `route_version_id`, `operational_mode`);

CREATE TABLE `canonical_demand_dispatches` (
  `id` VARCHAR(191) NOT NULL,
  `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'canonical_route_v1',
  `demand_type` ENUM('passenger', 'merchant_order') NOT NULL,
  `passenger_request_id` VARCHAR(191) NULL,
  `merchant_order_id` VARCHAR(191) NULL,
  `route_version_id` VARCHAR(191) NOT NULL,
  `status` ENUM('pending', 'offered', 'assigned', 'cancelled', 'unavailable') NOT NULL DEFAULT 'pending',
  `active_match_offer_id` VARCHAR(191) NULL,
  `assigned_trip_id` VARCHAR(191) NULL,
  `attempt_count` INTEGER NOT NULL DEFAULT 0,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `failure_count` INTEGER NOT NULL DEFAULT 0,
  `last_failed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `canonical_demand_dispatches_passenger_request_id_key` (`passenger_request_id`),
  UNIQUE INDEX `canonical_demand_dispatches_merchant_order_id_key` (`merchant_order_id`),
  UNIQUE INDEX `canonical_demand_dispatches_active_match_offer_id_key` (`active_match_offer_id`),
  UNIQUE INDEX `canonical_demand_dispatches_assigned_trip_id_key` (`assigned_trip_id`),
  INDEX `canonical_demand_dispatches_status_demand_type_created_at_idx`
    (`status`, `demand_type`, `created_at`),
  INDEX `canonical_demand_dispatches_route_version_id_status_idx`
    (`route_version_id`, `status`),
  UNIQUE INDEX `canonical_dispatch_route_mode_ownership_key`
    (`id`, `route_version_id`, `operational_mode`),
  CONSTRAINT `canonical_dispatch_shape_chk` CHECK (
    `operational_mode` = 'canonical_route_v1' AND `attempt_count` BETWEEN 0 AND 5 AND
    `revision` > 0 AND `failure_count` BETWEEN 0 AND 3 AND
    ((`demand_type` = 'passenger' AND `passenger_request_id` IS NOT NULL AND `merchant_order_id` IS NULL) OR
     (`demand_type` = 'merchant_order' AND `merchant_order_id` IS NOT NULL AND `passenger_request_id` IS NULL)) AND
    ((`status` = 'offered' AND `active_match_offer_id` IS NOT NULL AND `assigned_trip_id` IS NULL) OR
     (`status` = 'assigned' AND `active_match_offer_id` IS NULL AND `assigned_trip_id` IS NOT NULL) OR
     (`status` IN ('pending', 'cancelled', 'unavailable') AND
      `active_match_offer_id` IS NULL AND `assigned_trip_id` IS NULL))
  ),
  CONSTRAINT `canonical_dispatch_route_version_fkey`
    FOREIGN KEY (`route_version_id`) REFERENCES `service_route_versions` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `canonical_dispatch_passenger_route_mode_fkey`
    FOREIGN KEY (`passenger_request_id`, `route_version_id`, `operational_mode`)
    REFERENCES `passenger_requests` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `canonical_dispatch_merchant_route_mode_fkey`
    FOREIGN KEY (`merchant_order_id`, `route_version_id`, `operational_mode`)
    REFERENCES `merchant_orders` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `matches`
  DROP FOREIGN KEY `matches_driver_route_id_fkey`,
  DROP FOREIGN KEY `matches_driver_route_mode_fkey`,
  DROP FOREIGN KEY `matches_passenger_request_id_fkey`,
  DROP FOREIGN KEY `matches_merchant_order_id_fkey`,
  DROP FOREIGN KEY `matches_parcel_batch_id_fkey`,
  DROP INDEX `matches_driver_route_mode_fkey`,
  DROP CHECK `matches_canonical_shape_chk`,
  ADD COLUMN `dispatch_id` VARCHAR(191) NULL,
  ADD COLUMN `reservation_id` VARCHAR(191) NULL,
  ADD COLUMN `attempt_number` INTEGER NULL,
  ADD COLUMN `offered_at` DATETIME(3) NULL,
  ADD COLUMN `expires_at` DATETIME(3) NULL,
  ADD COLUMN `accepted_at` DATETIME(3) NULL,
  ADD COLUMN `rejected_at` DATETIME(3) NULL,
  ADD COLUMN `expired_at` DATETIME(3) NULL,
  ADD COLUMN `reject_reason` ENUM('driver_declined', 'schedule_conflict', 'capacity_unavailable') NULL,
  ADD COLUMN `score_version` VARCHAR(50) NULL,
  ADD COLUMN `active_dispatch_key` VARCHAR(191) NULL,
  ADD COLUMN `accepted_dispatch_key` VARCHAR(191) NULL,
  ADD COLUMN `expiry_failure_count` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `expiry_last_failed_at` DATETIME(3) NULL,
  ADD UNIQUE INDEX `matches_reservation_id_key` (`reservation_id`),
  ADD UNIQUE INDEX `matches_active_dispatch_key_key` (`active_dispatch_key`),
  ADD UNIQUE INDEX `matches_accepted_dispatch_key_key` (`accepted_dispatch_key`),
  ADD UNIQUE INDEX `matches_dispatch_attempt_key` (`dispatch_id`, `attempt_number`),
  ADD UNIQUE INDEX `matches_route_mode_ownership_key`
    (`id`, `route_version_id`, `operational_mode`),
  ADD INDEX `matches_dispatch_id_status_idx` (`dispatch_id`, `status`),
  ADD INDEX `matches_canonical_expiry_idx` (`status`, `expires_at`, `expiry_failure_count`),
  ADD CONSTRAINT `matches_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_match_version` IS NULL AND
     `route_version_id` IS NULL AND `dispatch_id` IS NULL AND `reservation_id` IS NULL AND
     `attempt_number` IS NULL AND `offered_at` IS NULL AND `expires_at` IS NULL AND
     `accepted_at` IS NULL AND `rejected_at` IS NULL AND `expired_at` IS NULL AND
     `reject_reason` IS NULL AND `score_version` IS NULL AND `active_dispatch_key` IS NULL AND
     `accepted_dispatch_key` IS NULL)
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_match_version` = 'canonical_route_match_v1' AND
     `route_version_id` IS NOT NULL AND `dispatch_id` IS NOT NULL AND
     `reservation_id` IS NOT NULL AND `attempt_number` BETWEEN 1 AND 5 AND
     `offered_at` IS NOT NULL AND `expires_at` > `offered_at` AND
     `parcel_batch_id` IS NULL AND
     ((`passenger_request_id` IS NOT NULL AND `merchant_order_id` IS NULL) OR
      (`merchant_order_id` IS NOT NULL AND `passenger_request_id` IS NULL)) AND
     `score_version` = 'canonical_route_match_v1' AND `expiry_failure_count` BETWEEN 0 AND 3 AND
     ((`status` = 'sent_to_driver' AND `active_dispatch_key` = `dispatch_id` AND
       `accepted_dispatch_key` IS NULL AND `accepted_at` IS NULL AND `rejected_at` IS NULL AND
       `expired_at` IS NULL AND `reject_reason` IS NULL) OR
      (`status` = 'accepted' AND `active_dispatch_key` IS NULL AND
       `accepted_dispatch_key` = `dispatch_id` AND `accepted_at` IS NOT NULL AND
       `rejected_at` IS NULL AND `expired_at` IS NULL AND `reject_reason` IS NULL) OR
      (`status` = 'rejected' AND `active_dispatch_key` IS NULL AND
       `accepted_dispatch_key` IS NULL AND `accepted_at` IS NULL AND
       `rejected_at` IS NOT NULL AND `expired_at` IS NULL AND `reject_reason` IS NOT NULL) OR
      (`status` = 'expired' AND `active_dispatch_key` IS NULL AND
       `accepted_dispatch_key` IS NULL AND `accepted_at` IS NULL AND
       `rejected_at` IS NULL AND `expired_at` IS NOT NULL AND `reject_reason` IS NULL)))
  ),
  ADD CONSTRAINT `matches_driver_route_route_mode_fkey`
    FOREIGN KEY (`driver_route_id`, `route_version_id`, `operational_mode`)
    REFERENCES `driver_routes` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_passenger_request_restrict_fkey`
    FOREIGN KEY (`passenger_request_id`) REFERENCES `passenger_requests` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_merchant_order_restrict_fkey`
    FOREIGN KEY (`merchant_order_id`) REFERENCES `merchant_orders` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_parcel_batch_restrict_fkey`
    FOREIGN KEY (`parcel_batch_id`) REFERENCES `parcel_batches` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_dispatch_id_fkey`
    FOREIGN KEY (`dispatch_id`) REFERENCES `canonical_demand_dispatches` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_reservation_fkey`
    FOREIGN KEY (`reservation_id`, `driver_route_id`, `route_version_id`, `operational_mode`)
    REFERENCES `capacity_reservations` (`id`, `driver_route_id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_passenger_route_mode_fkey`
    FOREIGN KEY (`passenger_request_id`, `route_version_id`, `operational_mode`)
    REFERENCES `passenger_requests` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_merchant_route_mode_fkey`
    FOREIGN KEY (`merchant_order_id`, `route_version_id`, `operational_mode`)
    REFERENCES `merchant_orders` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `trips`
  DROP FOREIGN KEY `trips_driver_route_id_fkey`,
  DROP FOREIGN KEY `trips_passenger_request_id_fkey`,
  DROP FOREIGN KEY `trips_merchant_order_id_fkey`,
  DROP FOREIGN KEY `trips_parcel_batch_id_fkey`,
  DROP CHECK `trips_canonical_shape_chk`,
  ADD COLUMN `route_snapshot_schema_version` VARCHAR(50) NULL,
  ADD COLUMN `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'legacy',
  ADD COLUMN `canonical_match_id` VARCHAR(191) NULL,
  ADD COLUMN `canonical_dispatch_id` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `trips_canonical_match_id_key` (`canonical_match_id`),
  ADD UNIQUE INDEX `trips_canonical_dispatch_id_key` (`canonical_dispatch_id`),
  ADD UNIQUE INDEX `trips_mode_ownership_key` (`id`, `operational_mode`),
  ADD CONSTRAINT `trips_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_trip_version` IS NULL AND
     `route_version_id` IS NULL AND `route_snapshot_json` IS NULL AND
     `route_snapshot_checksum` IS NULL AND `route_snapshot_schema_version` IS NULL AND
     `canonical_match_id` IS NULL AND `canonical_dispatch_id` IS NULL)
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_trip_version` = 'canonical_route_trip_v1' AND
     `route_version_id` IS NOT NULL AND `route_snapshot_json` IS NOT NULL AND
     `route_snapshot_checksum` IS NOT NULL AND
     `route_snapshot_schema_version` = 'canonical_route_snapshot_v1' AND
     `canonical_match_id` IS NOT NULL AND `canonical_dispatch_id` IS NOT NULL AND
     `parcel_batch_id` IS NULL AND
     ((`passenger_request_id` IS NOT NULL AND `merchant_order_id` IS NULL) OR
      (`merchant_order_id` IS NOT NULL AND `passenger_request_id` IS NULL)))
  ),
  ADD CONSTRAINT `trips_canonical_match_fkey`
    FOREIGN KEY (`canonical_match_id`, `route_version_id`, `operational_mode`)
    REFERENCES `matches` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `trips_canonical_dispatch_fkey`
    FOREIGN KEY (`canonical_dispatch_id`, `route_version_id`, `operational_mode`)
    REFERENCES `canonical_demand_dispatches` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `trips_canonical_driver_route_fkey`
    FOREIGN KEY (`driver_route_id`, `route_version_id`, `operational_mode`)
    REFERENCES `driver_routes` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `trips_driver_route_restrict_fkey`
    FOREIGN KEY (`driver_route_id`) REFERENCES `driver_routes` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `trips_passenger_request_restrict_fkey`
    FOREIGN KEY (`passenger_request_id`) REFERENCES `passenger_requests` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `trips_merchant_order_restrict_fkey`
    FOREIGN KEY (`merchant_order_id`) REFERENCES `merchant_orders` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `trips_parcel_batch_restrict_fkey`
    FOREIGN KEY (`parcel_batch_id`) REFERENCES `parcel_batches` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `trips_canonical_passenger_fkey`
    FOREIGN KEY (`passenger_request_id`, `route_version_id`, `operational_mode`)
    REFERENCES `passenger_requests` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `trips_canonical_merchant_fkey`
    FOREIGN KEY (`merchant_order_id`, `route_version_id`, `operational_mode`)
    REFERENCES `merchant_orders` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `canonical_demand_dispatches`
  ADD CONSTRAINT `canonical_dispatch_active_offer_fkey`
    FOREIGN KEY (`active_match_offer_id`) REFERENCES `matches` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_dispatch_assigned_trip_fkey`
    FOREIGN KEY (`assigned_trip_id`) REFERENCES `trips` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;
