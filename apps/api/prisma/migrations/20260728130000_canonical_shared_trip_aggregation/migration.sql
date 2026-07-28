-- M7C3C1 canonical shared-trip aggregation.
-- Forward-only: migrations 1-16 and all legacy/single-demand rows remain unchanged.

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
  'canonical_offer_reassigned', 'canonical_trip_created', 'canonical_dispatch_unavailable',
  'canonical_manifest_created', 'canonical_manifest_offered', 'canonical_manifest_accepted',
  'canonical_manifest_rejected', 'canonical_manifest_expired',
  'canonical_manifest_invalidated', 'canonical_manifest_regrouped',
  'canonical_shared_trip_created'
) NOT NULL;

ALTER TABLE `canonical_demand_dispatches`
  DROP FOREIGN KEY `canonical_dispatch_active_offer_fkey`,
  DROP FOREIGN KEY `canonical_dispatch_assigned_trip_fkey`,
  DROP INDEX `canonical_demand_dispatches_active_match_offer_id_key`,
  DROP INDEX `canonical_demand_dispatches_assigned_trip_id_key`,
  DROP CHECK `canonical_dispatch_shape_chk`,
  ADD COLUMN `active_manifest_id` VARCHAR(191) NULL,
  ADD COLUMN `accepted_manifest_id` VARCHAR(191) NULL,
  ADD COLUMN `demand_ownership_id` VARCHAR(191)
    GENERATED ALWAYS AS (COALESCE(`passenger_request_id`, `merchant_order_id`)) STORED,
  ADD COLUMN `single_active_dispatch_key` VARCHAR(191)
    GENERATED ALWAYS AS (
      CASE WHEN `active_match_offer_id` IS NOT NULL AND `active_manifest_id` IS NULL
        THEN `id` ELSE NULL END
    ) STORED,
  ADD COLUMN `single_assigned_dispatch_key` VARCHAR(191)
    GENERATED ALWAYS AS (
      CASE WHEN `assigned_trip_id` IS NOT NULL AND `accepted_manifest_id` IS NULL
        THEN `id` ELSE NULL END
    ) STORED,
  ADD UNIQUE INDEX `canonical_dispatch_demand_ownership_key`
    (`id`, `demand_type`, `demand_ownership_id`, `route_version_id`, `operational_mode`),
  ADD UNIQUE INDEX `canonical_dispatch_active_manifest_key` (`active_manifest_id`, `id`),
  ADD UNIQUE INDEX `canonical_dispatch_accepted_manifest_key` (`accepted_manifest_id`, `id`),
  ADD INDEX `canonical_dispatch_active_offer_manifest_idx`
    (`active_match_offer_id`, `active_manifest_id`),
  ADD INDEX `canonical_dispatch_assigned_trip_manifest_idx`
    (`assigned_trip_id`, `accepted_manifest_id`),
  ADD CONSTRAINT `canonical_dispatch_shape_chk` CHECK (
    `operational_mode` = 'canonical_route_v1' AND `attempt_count` BETWEEN 0 AND 5 AND
    `revision` > 0 AND `failure_count` BETWEEN 0 AND 3 AND
    ((`demand_type` = 'passenger' AND `passenger_request_id` IS NOT NULL AND `merchant_order_id` IS NULL) OR
     (`demand_type` = 'merchant_order' AND `merchant_order_id` IS NOT NULL AND `passenger_request_id` IS NULL)) AND
    ((`status` = 'offered' AND `active_match_offer_id` IS NOT NULL AND `assigned_trip_id` IS NULL AND
      `accepted_manifest_id` IS NULL) OR
     (`status` = 'assigned' AND `active_match_offer_id` IS NULL AND `assigned_trip_id` IS NOT NULL AND
      `active_manifest_id` IS NULL) OR
     (`status` IN ('pending', 'cancelled', 'unavailable') AND
      `active_match_offer_id` IS NULL AND `assigned_trip_id` IS NULL AND
      `active_manifest_id` IS NULL AND `accepted_manifest_id` IS NULL))
  );

ALTER TABLE `matches`
  DROP CHECK `matches_canonical_shape_chk`,
  MODIFY `status` ENUM('proposed', 'sent_to_driver', 'accepted', 'rejected', 'expired', 'invalidated')
    NOT NULL DEFAULT 'proposed',
  ADD COLUMN `manifest_id` VARCHAR(191) NULL,
  ADD COLUMN `active_manifest_key` VARCHAR(191) NULL,
  ADD COLUMN `accepted_manifest_key` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `matches_active_manifest_key_key` (`active_manifest_key`),
  ADD UNIQUE INDEX `matches_accepted_manifest_key_key` (`accepted_manifest_key`),
  ADD UNIQUE INDEX `matches_manifest_ownership_key` (`id`, `manifest_id`),
  ADD UNIQUE INDEX `matches_active_manifest_ownership_key` (`id`, `active_manifest_key`),
  ADD UNIQUE INDEX `matches_accepted_manifest_ownership_key` (`id`, `accepted_manifest_key`);

ALTER TABLE `trips`
  DROP CHECK `trips_canonical_shape_chk`,
  ADD COLUMN `manifest_id` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `trips_manifest_id_key` (`manifest_id`),
  ADD UNIQUE INDEX `trips_manifest_ownership_key` (`id`, `manifest_id`);

ALTER TABLE `capacity_reservations`
  DROP CHECK `capacity_reservations_type_chk`,
  DROP CHECK `capacity_reservations_terminal_reason_chk`,
  ADD COLUMN `manifest_id` VARCHAR(191) NULL,
  ADD COLUMN `capacity_model` VARCHAR(50) NULL,
  ADD COLUMN `reservation_fingerprint` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD UNIQUE INDEX `capacity_reservations_manifest_id_key` (`manifest_id`),
  ADD UNIQUE INDEX `capacity_reservations_manifest_ownership_key` (`id`, `manifest_id`),
  ADD CONSTRAINT `capacity_reservations_type_chk` CHECK (
    (`manifest_id` IS NULL AND (
      (`reservation_type` = 'passenger' AND `seats_reserved` > 0 AND `parcel_units_reserved` = 0) OR
      (`reservation_type` = 'parcel' AND `seats_reserved` = 0 AND `parcel_units_reserved` > 0)
    )) OR
    (`manifest_id` IS NOT NULL AND `capacity_model` = 'canonical_global_capacity_v1' AND
      `reservation_fingerprint` REGEXP '^[0-9a-f]{64}$' AND
      ((`reservation_type` = 'passenger' AND `seats_reserved` > 0 AND `parcel_units_reserved` = 0) OR
       (`reservation_type` = 'parcel' AND `seats_reserved` = 0 AND `parcel_units_reserved` > 0) OR
       (`reservation_type` = 'combined' AND `seats_reserved` > 0 AND `parcel_units_reserved` > 0)))
  ),
  ADD CONSTRAINT `capacity_reservations_terminal_reason_chk` CHECK (
    (`status` = 'held' AND `release_reason` IS NULL) OR
    (`status` = 'confirmed' AND `release_reason` IS NULL) OR
    (`status` = 'released' AND `release_reason` IN
      ('offer_rejected', 'offer_cancelled', 'operator_cancelled', 'manifest_invalidated', 'test_cleanup')) OR
    (`status` = 'expired' AND `release_reason` = 'hold_expired')
  );

CREATE TABLE `canonical_trip_manifests` (
  `id` VARCHAR(191) NOT NULL,
  `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'canonical_route_v1',
  `match_version` VARCHAR(50) NOT NULL,
  `trip_version` VARCHAR(50) NOT NULL,
  `capacity_model` VARCHAR(50) NOT NULL,
  `route_version_id` VARCHAR(191) NOT NULL,
  `driver_route_id` VARCHAR(191) NOT NULL,
  `lifecycle_status` ENUM('building', 'offered', 'accepted', 'rejected', 'expired', 'dissolved')
    NOT NULL DEFAULT 'building',
  `member_count` INTEGER NOT NULL,
  `passenger_request_count` INTEGER NOT NULL,
  `passenger_seat_count` INTEGER NOT NULL,
  `merchant_order_count` INTEGER NOT NULL,
  `parcel_unit_count` INTEGER NOT NULL,
  `manifest_fingerprint` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `manifest_schema_version` VARCHAR(50) NOT NULL,
  `active_offer_id` VARCHAR(191) NULL,
  `accepted_offer_id` VARCHAR(191) NULL,
  `assigned_trip_id` VARCHAR(191) NULL,
  `reservation_id` VARCHAR(191) NULL,
  `active_availability_key` VARCHAR(191) NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `offered_at` DATETIME(3) NULL,
  `accepted_at` DATETIME(3) NULL,
  `rejected_at` DATETIME(3) NULL,
  `expired_at` DATETIME(3) NULL,
  `dissolved_at` DATETIME(3) NULL,
  UNIQUE INDEX `canonical_trip_manifests_active_offer_id_key` (`active_offer_id`),
  UNIQUE INDEX `canonical_trip_manifests_accepted_offer_id_key` (`accepted_offer_id`),
  UNIQUE INDEX `canonical_trip_manifests_assigned_trip_id_key` (`assigned_trip_id`),
  UNIQUE INDEX `canonical_trip_manifests_reservation_id_key` (`reservation_id`),
  UNIQUE INDEX `canonical_trip_manifests_active_availability_key_key` (`active_availability_key`),
  UNIQUE INDEX `canonical_manifests_route_availability_key`
    (`id`, `route_version_id`, `driver_route_id`, `operational_mode`),
  UNIQUE INDEX `canonical_manifests_route_mode_key`
    (`id`, `route_version_id`, `operational_mode`),
  UNIQUE INDEX `canonical_manifest_active_offer_ownership_key` (`active_offer_id`, `id`),
  UNIQUE INDEX `canonical_manifest_accepted_offer_ownership_key` (`accepted_offer_id`, `id`),
  UNIQUE INDEX `canonical_manifest_assigned_trip_ownership_key` (`assigned_trip_id`, `id`),
  INDEX `canonical_manifest_route_status_created_idx`
    (`route_version_id`, `lifecycle_status`, `created_at`),
  INDEX `canonical_manifest_availability_status_idx` (`driver_route_id`, `lifecycle_status`),
  CONSTRAINT `canonical_manifest_route_availability_fkey`
    FOREIGN KEY (`driver_route_id`, `route_version_id`, `operational_mode`)
    REFERENCES `driver_routes` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `canonical_manifest_shape_chk` CHECK (
    `operational_mode` = 'canonical_route_v1' AND
    `match_version` = 'canonical_shared_trip_match_v1' AND
    `trip_version` = 'canonical_shared_trip_v1' AND
    `capacity_model` = 'canonical_global_capacity_v1' AND
    `manifest_schema_version` = 'canonical_shared_manifest_v1' AND
    `manifest_fingerprint` REGEXP '^[0-9a-f]{64}$' AND
    `member_count` BETWEEN 1 AND 20 AND
    `passenger_request_count` BETWEEN 0 AND 20 AND
    `merchant_order_count` BETWEEN 0 AND 20 AND
    `member_count` = `passenger_request_count` + `merchant_order_count` AND
    `passenger_seat_count` >= 0 AND `parcel_unit_count` BETWEEN 0 AND 50 AND
    (`passenger_seat_count` > 0 OR `parcel_unit_count` > 0) AND `revision` > 0 AND
    ((`lifecycle_status` = 'building' AND `active_offer_id` IS NULL AND
      `accepted_offer_id` IS NULL AND `assigned_trip_id` IS NULL AND `reservation_id` IS NULL AND
      `active_availability_key` = `driver_route_id`) OR
     (`lifecycle_status` = 'offered' AND `active_offer_id` IS NOT NULL AND
      `accepted_offer_id` IS NULL AND `assigned_trip_id` IS NULL AND `reservation_id` IS NOT NULL AND
      `active_availability_key` = `driver_route_id` AND `offered_at` IS NOT NULL) OR
     (`lifecycle_status` = 'accepted' AND `active_offer_id` IS NULL AND
      `accepted_offer_id` IS NOT NULL AND `assigned_trip_id` IS NOT NULL AND
      `reservation_id` IS NOT NULL AND `active_availability_key` = `driver_route_id` AND
      `accepted_at` IS NOT NULL) OR
     (`lifecycle_status` = 'rejected' AND `active_offer_id` IS NULL AND
      `accepted_offer_id` IS NULL AND `assigned_trip_id` IS NULL AND
      `active_availability_key` IS NULL AND `rejected_at` IS NOT NULL) OR
     (`lifecycle_status` = 'expired' AND `active_offer_id` IS NULL AND
      `accepted_offer_id` IS NULL AND `assigned_trip_id` IS NULL AND
      `active_availability_key` IS NULL AND `expired_at` IS NOT NULL) OR
     (`lifecycle_status` = 'dissolved' AND `active_offer_id` IS NULL AND
      `accepted_offer_id` IS NULL AND `assigned_trip_id` IS NULL AND
      `active_availability_key` IS NULL AND `dissolved_at` IS NOT NULL))
  ),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `canonical_trip_manifest_members` (
  `id` VARCHAR(191) NOT NULL,
  `manifest_id` VARCHAR(191) NOT NULL,
  `dispatch_id` VARCHAR(191) NOT NULL,
  `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'canonical_route_v1',
  `demand_type` ENUM('passenger', 'merchant_order') NOT NULL,
  `demand_id` VARCHAR(191) NOT NULL,
  `passenger_request_id` VARCHAR(191) NULL,
  `merchant_order_id` VARCHAR(191) NULL,
  `member_status` ENUM('active', 'accepted', 'released', 'invalidated') NOT NULL DEFAULT 'active',
  `passenger_seats` INTEGER NOT NULL,
  `parcel_units` INTEGER NOT NULL,
  `pickup_stop_id` VARCHAR(191) NOT NULL,
  `drop_off_stop_id` VARCHAR(191) NULL,
  `destination_summary_json` JSON NULL,
  `demand_fingerprint` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attempt_number` INTEGER NOT NULL,
  `active_dispatch_key` VARCHAR(191) NULL,
  `route_version_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `canonical_manifest_members_active_dispatch_key_key` (`active_dispatch_key`),
  UNIQUE INDEX `canonical_manifest_membership_key` (`manifest_id`, `dispatch_id`),
  UNIQUE INDEX `canonical_manifest_member_ownership_key` (`id`, `manifest_id`, `dispatch_id`),
  INDEX `canonical_manifest_member_dispatch_status_idx` (`dispatch_id`, `member_status`),
  INDEX `canonical_manifest_member_manifest_status_idx` (`manifest_id`, `member_status`),
  CONSTRAINT `canonical_manifest_member_manifest_route_fkey`
    FOREIGN KEY (`manifest_id`, `route_version_id`, `operational_mode`)
    REFERENCES `canonical_trip_manifests` (`id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `canonical_manifest_member_dispatch_demand_fkey`
    FOREIGN KEY (`dispatch_id`, `demand_type`, `demand_id`, `route_version_id`, `operational_mode`)
    REFERENCES `canonical_demand_dispatches`
      (`id`, `demand_type`, `demand_ownership_id`, `route_version_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `canonical_manifest_member_shape_chk` CHECK (
    `operational_mode` = 'canonical_route_v1' AND
    `demand_fingerprint` REGEXP '^[0-9a-f]{64}$' AND
    `attempt_number` BETWEEN 1 AND 5 AND
    ((`demand_type` = 'passenger' AND `demand_id` = `passenger_request_id` AND
      `passenger_request_id` IS NOT NULL AND `merchant_order_id` IS NULL AND
      `passenger_seats` > 0 AND `parcel_units` = 0 AND `drop_off_stop_id` IS NOT NULL AND
      `destination_summary_json` IS NULL) OR
     (`demand_type` = 'merchant_order' AND `demand_id` = `merchant_order_id` AND
      `merchant_order_id` IS NOT NULL AND `passenger_request_id` IS NULL AND
      `passenger_seats` = 0 AND `parcel_units` > 0 AND `drop_off_stop_id` IS NULL AND
      `destination_summary_json` IS NOT NULL)) AND
    ((`member_status` IN ('active', 'accepted') AND `active_dispatch_key` = `dispatch_id`) OR
     (`member_status` IN ('released', 'invalidated') AND `active_dispatch_key` IS NULL))
  ),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `matches`
  ADD CONSTRAINT `matches_manifest_route_availability_fkey`
    FOREIGN KEY (`manifest_id`, `route_version_id`, `driver_route_id`, `operational_mode`)
    REFERENCES `canonical_trip_manifests`
      (`id`, `route_version_id`, `driver_route_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_match_version` IS NULL AND
     `route_version_id` IS NULL AND `dispatch_id` IS NULL AND `reservation_id` IS NULL AND
     `attempt_number` IS NULL AND `offered_at` IS NULL AND `expires_at` IS NULL AND
     `accepted_at` IS NULL AND `rejected_at` IS NULL AND `expired_at` IS NULL AND
     `reject_reason` IS NULL AND `score_version` IS NULL AND `active_dispatch_key` IS NULL AND
     `accepted_dispatch_key` IS NULL AND `demand_checksum` IS NULL AND
     `active_driver_route_key` IS NULL AND `accepted_driver_route_key` IS NULL AND
     `canonical_assignment_key` IS NULL AND `manifest_id` IS NULL AND
     `active_manifest_key` IS NULL AND `accepted_manifest_key` IS NULL)
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_match_version` = 'canonical_route_match_v1' AND
     `manifest_id` IS NULL AND `route_version_id` IS NOT NULL AND `dispatch_id` IS NOT NULL AND
     `reservation_id` IS NOT NULL AND `attempt_number` BETWEEN 1 AND 5 AND
     `offered_at` IS NOT NULL AND `expires_at` > `offered_at` AND `parcel_batch_id` IS NULL AND
     `demand_checksum` REGEXP '^[0-9a-f]{64}$' AND
     ((`passenger_request_id` IS NOT NULL AND `merchant_order_id` IS NULL) OR
      (`merchant_order_id` IS NOT NULL AND `passenger_request_id` IS NULL)) AND
     `score_version` = 'canonical_route_match_v1' AND `expiry_failure_count` BETWEEN 0 AND 3 AND
     `active_manifest_key` IS NULL AND `accepted_manifest_key` IS NULL AND
     ((`status` = 'sent_to_driver' AND `active_dispatch_key` = `dispatch_id` AND
       `accepted_dispatch_key` IS NULL AND `active_driver_route_key` = `driver_route_id` AND
       `accepted_driver_route_key` IS NULL AND `canonical_assignment_key` IS NULL AND
       `accepted_at` IS NULL AND `rejected_at` IS NULL AND `expired_at` IS NULL AND
       `reject_reason` IS NULL) OR
      (`status` = 'accepted' AND `active_dispatch_key` IS NULL AND
       `accepted_dispatch_key` = `dispatch_id` AND `active_driver_route_key` IS NULL AND
       `accepted_driver_route_key` = `driver_route_id` AND `canonical_assignment_key` IS NOT NULL AND
       `accepted_at` IS NOT NULL AND `rejected_at` IS NULL AND `expired_at` IS NULL AND
       `reject_reason` IS NULL) OR
      (`status` = 'rejected' AND `active_dispatch_key` IS NULL AND
       `accepted_dispatch_key` IS NULL AND `active_driver_route_key` IS NULL AND
       `accepted_driver_route_key` IS NULL AND `canonical_assignment_key` IS NULL AND
       `accepted_at` IS NULL AND `rejected_at` IS NOT NULL AND `expired_at` IS NULL AND
       `reject_reason` IS NOT NULL) OR
      (`status` = 'expired' AND `active_dispatch_key` IS NULL AND
       `accepted_dispatch_key` IS NULL AND `active_driver_route_key` IS NULL AND
       `accepted_driver_route_key` IS NULL AND `canonical_assignment_key` IS NULL AND
       `accepted_at` IS NULL AND `rejected_at` IS NULL AND `expired_at` IS NOT NULL AND
       `reject_reason` IS NULL)))
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_match_version` = 'canonical_shared_trip_match_v1' AND
     `manifest_id` IS NOT NULL AND `route_version_id` IS NOT NULL AND
     `dispatch_id` IS NULL AND `passenger_request_id` IS NULL AND `merchant_order_id` IS NULL AND
     `parcel_batch_id` IS NULL AND `reservation_id` IS NOT NULL AND `attempt_number` IS NULL AND
     `offered_at` IS NOT NULL AND `expires_at` > `offered_at` AND
     `score_version` = 'canonical_route_match_v1' AND `demand_checksum` IS NULL AND
     `active_dispatch_key` IS NULL AND `accepted_dispatch_key` IS NULL AND
     `canonical_assignment_key` IS NULL AND `expiry_failure_count` BETWEEN 0 AND 3 AND
     ((`status` = 'sent_to_driver' AND `active_manifest_key` = `manifest_id` AND
       `accepted_manifest_key` IS NULL AND `active_driver_route_key` = `driver_route_id` AND
       `accepted_driver_route_key` IS NULL AND `accepted_at` IS NULL AND
       `rejected_at` IS NULL AND `expired_at` IS NULL AND `reject_reason` IS NULL) OR
      (`status` = 'accepted' AND `active_manifest_key` IS NULL AND
       `accepted_manifest_key` = `manifest_id` AND `active_driver_route_key` IS NULL AND
       `accepted_driver_route_key` = `driver_route_id` AND `accepted_at` IS NOT NULL AND
       `rejected_at` IS NULL AND `expired_at` IS NULL AND `reject_reason` IS NULL) OR
      (`status` = 'rejected' AND `active_manifest_key` IS NULL AND
       `accepted_manifest_key` IS NULL AND `active_driver_route_key` IS NULL AND
       `accepted_driver_route_key` IS NULL AND `accepted_at` IS NULL AND
       `rejected_at` IS NOT NULL AND `expired_at` IS NULL AND `reject_reason` IS NOT NULL) OR
      (`status` IN ('expired', 'invalidated') AND `active_manifest_key` IS NULL AND
       `accepted_manifest_key` IS NULL AND `active_driver_route_key` IS NULL AND
       `accepted_driver_route_key` IS NULL AND `accepted_at` IS NULL AND
       `rejected_at` IS NULL AND `expired_at` IS NOT NULL AND `reject_reason` IS NULL)))
  );

ALTER TABLE `capacity_reservations`
  ADD CONSTRAINT `capacity_reservations_manifest_fkey`
    FOREIGN KEY (`manifest_id`) REFERENCES `canonical_trip_manifests` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `trips`
  ADD CONSTRAINT `trips_manifest_route_availability_fkey`
    FOREIGN KEY (`manifest_id`, `route_version_id`, `driver_route_id`, `operational_mode`)
    REFERENCES `canonical_trip_manifests`
      (`id`, `route_version_id`, `driver_route_id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `trips_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_trip_version` IS NULL AND
     `route_version_id` IS NULL AND `route_snapshot_json` IS NULL AND
     `route_snapshot_checksum` IS NULL AND `route_snapshot_schema_version` IS NULL AND
     `canonical_match_id` IS NULL AND `canonical_dispatch_id` IS NULL AND
     `canonical_assignment_key` IS NULL AND `canonical_availability_key` IS NULL AND
     `manifest_id` IS NULL)
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_trip_version` = 'canonical_route_trip_v1' AND `manifest_id` IS NULL AND
     `route_version_id` IS NOT NULL AND `route_snapshot_json` IS NOT NULL AND
     `route_snapshot_checksum` REGEXP '^[0-9a-f]{64}$' AND
     `route_snapshot_schema_version` = 'canonical_route_snapshot_v1' AND
     `canonical_match_id` IS NOT NULL AND `canonical_dispatch_id` IS NOT NULL AND
     `canonical_availability_key` = `driver_route_id` AND `canonical_assignment_key` IS NOT NULL AND
     `parcel_batch_id` IS NULL AND
     ((`passenger_request_id` IS NOT NULL AND `merchant_order_id` IS NULL) OR
      (`merchant_order_id` IS NOT NULL AND `passenger_request_id` IS NULL)))
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_trip_version` = 'canonical_shared_trip_v1' AND `manifest_id` IS NOT NULL AND
     `route_version_id` IS NOT NULL AND `route_snapshot_json` IS NOT NULL AND
     `route_snapshot_checksum` REGEXP '^[0-9a-f]{64}$' AND
     `route_snapshot_schema_version` = 'canonical_shared_trip_snapshot_v1' AND
     `canonical_match_id` IS NOT NULL AND `canonical_dispatch_id` IS NULL AND
     `canonical_availability_key` = `driver_route_id` AND `canonical_assignment_key` IS NULL AND
     `passenger_request_id` IS NULL AND `merchant_order_id` IS NULL AND `parcel_batch_id` IS NULL)
  );

ALTER TABLE `canonical_demand_dispatches`
  ADD CONSTRAINT `canonical_dispatch_active_offer_fkey`
    FOREIGN KEY (`active_match_offer_id`) REFERENCES `matches` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_dispatch_assigned_trip_fkey`
    FOREIGN KEY (`assigned_trip_id`) REFERENCES `trips` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_dispatch_single_active_offer_fkey`
    FOREIGN KEY (`active_match_offer_id`, `single_active_dispatch_key`)
    REFERENCES `matches` (`id`, `active_dispatch_key`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_dispatch_shared_active_offer_fkey`
    FOREIGN KEY (`active_match_offer_id`, `active_manifest_id`)
    REFERENCES `matches` (`id`, `manifest_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_dispatch_single_assigned_trip_fkey`
    FOREIGN KEY (`assigned_trip_id`, `single_assigned_dispatch_key`)
    REFERENCES `trips` (`id`, `canonical_dispatch_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_dispatch_shared_assigned_trip_fkey`
    FOREIGN KEY (`assigned_trip_id`, `accepted_manifest_id`)
    REFERENCES `trips` (`id`, `manifest_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_dispatch_active_manifest_member_fkey`
    FOREIGN KEY (`active_manifest_id`, `id`)
    REFERENCES `canonical_trip_manifest_members` (`manifest_id`, `dispatch_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_dispatch_accepted_manifest_member_fkey`
    FOREIGN KEY (`accepted_manifest_id`, `id`)
    REFERENCES `canonical_trip_manifest_members` (`manifest_id`, `dispatch_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE `canonical_demand_attempts` (
  `id` VARCHAR(191) NOT NULL,
  `dispatch_id` VARCHAR(191) NOT NULL,
  `driver_route_id` VARCHAR(191) NOT NULL,
  `manifest_id` VARCHAR(191) NOT NULL,
  `match_offer_id` VARCHAR(191) NOT NULL,
  `attempt_number` INTEGER NOT NULL,
  `outcome` ENUM('offered', 'rejected', 'expired', 'system_invalidated')
    NOT NULL DEFAULT 'offered',
  `outcome_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `canonical_attempt_candidate_exclusion_key` (`dispatch_id`, `driver_route_id`),
  UNIQUE INDEX `canonical_attempt_sequence_key` (`dispatch_id`, `attempt_number`),
  INDEX `canonical_attempt_manifest_outcome_idx` (`manifest_id`, `outcome`),
  CONSTRAINT `canonical_attempt_dispatch_fkey`
    FOREIGN KEY (`dispatch_id`) REFERENCES `canonical_demand_dispatches` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `canonical_attempt_driver_route_fkey`
    FOREIGN KEY (`driver_route_id`) REFERENCES `driver_routes` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `canonical_attempt_manifest_fkey`
    FOREIGN KEY (`manifest_id`) REFERENCES `canonical_trip_manifests` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `canonical_attempt_offer_fkey`
    FOREIGN KEY (`match_offer_id`, `manifest_id`)
    REFERENCES `matches` (`id`, `manifest_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `canonical_attempt_shape_chk` CHECK (
    `attempt_number` BETWEEN 1 AND 5 AND
    ((`outcome` = 'offered' AND `outcome_at` IS NULL) OR
     (`outcome` IN ('rejected', 'expired', 'system_invalidated') AND `outcome_at` IS NOT NULL))
  ),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
