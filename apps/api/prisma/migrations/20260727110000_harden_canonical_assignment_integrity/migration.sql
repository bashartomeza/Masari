-- Independent-review hardening for M7C3A.
-- Forward-only: migrations 1-15 remain byte-stable.

ALTER TABLE `canonical_demand_dispatches`
  DROP FOREIGN KEY `canonical_dispatch_active_offer_fkey`,
  DROP FOREIGN KEY `canonical_dispatch_assigned_trip_fkey`;

ALTER TABLE `trips`
  DROP FOREIGN KEY `trips_canonical_match_fkey`,
  DROP CHECK `trips_canonical_shape_chk`,
  ADD COLUMN `canonical_assignment_key` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN `canonical_availability_key` VARCHAR(191) NULL;

ALTER TABLE `matches`
  DROP CHECK `matches_canonical_shape_chk`,
  ADD COLUMN `demand_checksum` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN `active_driver_route_key` VARCHAR(191) NULL,
  ADD COLUMN `accepted_driver_route_key` VARCHAR(191) NULL,
  ADD COLUMN `canonical_assignment_key` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL;

-- M7C3A is not production-enabled. Existing local/demo offers are fingerprinted
-- with a migration sentinel so an in-flight offer is invalidated safely instead
-- of accepting a demand whose original payload cannot be reconstructed.
UPDATE `matches`
SET `demand_checksum` = SHA2(CONCAT('pre-migration:', `id`), 256)
WHERE `operational_mode` = 'canonical_route_v1';

UPDATE `matches`
SET
  `active_driver_route_key` = CASE WHEN `status` = 'sent_to_driver' THEN `driver_route_id` ELSE NULL END,
  `accepted_driver_route_key` = CASE WHEN `status` = 'accepted' THEN `driver_route_id` ELSE NULL END,
  `canonical_assignment_key` = CASE
    WHEN `status` = 'accepted' THEN SHA2(CONCAT(
      CHAR_LENGTH(`dispatch_id`), ':', `dispatch_id`, '|',
      CHAR_LENGTH(`driver_route_id`), ':', `driver_route_id`, '|',
      CHAR_LENGTH(`route_version_id`), ':', `route_version_id`, '|',
      CHAR_LENGTH(`operational_mode`), ':', `operational_mode`, '|',
      CHAR_LENGTH(IF(`passenger_request_id` IS NULL, 'merchant_order', 'passenger')), ':',
        IF(`passenger_request_id` IS NULL, 'merchant_order', 'passenger'), '|',
      CHAR_LENGTH(COALESCE(`passenger_request_id`, `merchant_order_id`)), ':',
        COALESCE(`passenger_request_id`, `merchant_order_id`)
    ), 256)
    ELSE NULL
  END
WHERE `operational_mode` = 'canonical_route_v1';

UPDATE `trips`
SET
  `canonical_availability_key` = `driver_route_id`,
  `canonical_assignment_key` = SHA2(CONCAT(
    CHAR_LENGTH(`canonical_dispatch_id`), ':', `canonical_dispatch_id`, '|',
    CHAR_LENGTH(`driver_route_id`), ':', `driver_route_id`, '|',
    CHAR_LENGTH(`route_version_id`), ':', `route_version_id`, '|',
    CHAR_LENGTH(`operational_mode`), ':', `operational_mode`, '|',
    CHAR_LENGTH(IF(`passenger_request_id` IS NULL, 'merchant_order', 'passenger')), ':',
      IF(`passenger_request_id` IS NULL, 'merchant_order', 'passenger'), '|',
    CHAR_LENGTH(COALESCE(`passenger_request_id`, `merchant_order_id`)), ':',
      COALESCE(`passenger_request_id`, `merchant_order_id`)
  ), 256)
WHERE `operational_mode` = 'canonical_route_v1';

ALTER TABLE `matches`
  ADD UNIQUE INDEX `matches_active_driver_route_key_key` (`active_driver_route_key`),
  ADD UNIQUE INDEX `matches_accepted_driver_route_key_key` (`accepted_driver_route_key`),
  ADD UNIQUE INDEX `matches_active_dispatch_ownership_key` (`id`, `active_dispatch_key`),
  ADD UNIQUE INDEX `matches_assignment_ownership_key` (`id`, `canonical_assignment_key`),
  ADD CONSTRAINT `matches_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_match_version` IS NULL AND
     `route_version_id` IS NULL AND `dispatch_id` IS NULL AND `reservation_id` IS NULL AND
     `attempt_number` IS NULL AND `offered_at` IS NULL AND `expires_at` IS NULL AND
     `accepted_at` IS NULL AND `rejected_at` IS NULL AND `expired_at` IS NULL AND
     `reject_reason` IS NULL AND `score_version` IS NULL AND `active_dispatch_key` IS NULL AND
     `accepted_dispatch_key` IS NULL AND `demand_checksum` IS NULL AND
     `active_driver_route_key` IS NULL AND `accepted_driver_route_key` IS NULL AND
     `canonical_assignment_key` IS NULL)
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_match_version` = 'canonical_route_match_v1' AND
     `route_version_id` IS NOT NULL AND `dispatch_id` IS NOT NULL AND
     `reservation_id` IS NOT NULL AND `attempt_number` BETWEEN 1 AND 5 AND
     `offered_at` IS NOT NULL AND `expires_at` > `offered_at` AND
     `parcel_batch_id` IS NULL AND `demand_checksum` IS NOT NULL AND
     `demand_checksum` REGEXP '^[0-9a-f]{64}$' AND
     ((`passenger_request_id` IS NOT NULL AND `merchant_order_id` IS NULL) OR
      (`merchant_order_id` IS NOT NULL AND `passenger_request_id` IS NULL)) AND
     `score_version` = 'canonical_route_match_v1' AND `expiry_failure_count` BETWEEN 0 AND 3 AND
     ((`status` = 'sent_to_driver' AND `active_dispatch_key` = `dispatch_id` AND
       `accepted_dispatch_key` IS NULL AND `accepted_at` IS NULL AND `rejected_at` IS NULL AND
       `expired_at` IS NULL AND `reject_reason` IS NULL AND
       `active_driver_route_key` IS NOT NULL AND
       `active_driver_route_key` = `driver_route_id` AND `accepted_driver_route_key` IS NULL AND
       `canonical_assignment_key` IS NULL) OR
      (`status` = 'accepted' AND `active_dispatch_key` IS NULL AND
       `accepted_dispatch_key` = `dispatch_id` AND `accepted_at` IS NOT NULL AND
       `rejected_at` IS NULL AND `expired_at` IS NULL AND `reject_reason` IS NULL AND
       `active_driver_route_key` IS NULL AND `accepted_driver_route_key` IS NOT NULL AND
       `accepted_driver_route_key` = `driver_route_id` AND
       `canonical_assignment_key` IS NOT NULL AND
       `canonical_assignment_key` = SHA2(CONCAT(
         CHAR_LENGTH(`dispatch_id`), ':', `dispatch_id`, '|',
         CHAR_LENGTH(`driver_route_id`), ':', `driver_route_id`, '|',
         CHAR_LENGTH(`route_version_id`), ':', `route_version_id`, '|',
         CHAR_LENGTH(`operational_mode`), ':', `operational_mode`, '|',
         CHAR_LENGTH(IF(`passenger_request_id` IS NULL, 'merchant_order', 'passenger')), ':',
           IF(`passenger_request_id` IS NULL, 'merchant_order', 'passenger'), '|',
         CHAR_LENGTH(COALESCE(`passenger_request_id`, `merchant_order_id`)), ':',
           COALESCE(`passenger_request_id`, `merchant_order_id`)
       ), 256)) OR
      (`status` = 'rejected' AND `active_dispatch_key` IS NULL AND
       `accepted_dispatch_key` IS NULL AND `accepted_at` IS NULL AND
       `rejected_at` IS NOT NULL AND `expired_at` IS NULL AND `reject_reason` IS NOT NULL AND
       `active_driver_route_key` IS NULL AND `accepted_driver_route_key` IS NULL AND
       `canonical_assignment_key` IS NULL) OR
      (`status` = 'expired' AND `active_dispatch_key` IS NULL AND
       `accepted_dispatch_key` IS NULL AND `accepted_at` IS NULL AND
       `rejected_at` IS NULL AND `expired_at` IS NOT NULL AND `reject_reason` IS NULL AND
       `active_driver_route_key` IS NULL AND `accepted_driver_route_key` IS NULL AND
       `canonical_assignment_key` IS NULL)))
  );

ALTER TABLE `trips`
  ADD UNIQUE INDEX `trips_canonical_availability_key_key` (`canonical_availability_key`),
  ADD UNIQUE INDEX `trips_match_assignment_key` (`canonical_match_id`, `canonical_assignment_key`),
  ADD UNIQUE INDEX `trips_dispatch_ownership_key` (`id`, `canonical_dispatch_id`),
  ADD CONSTRAINT `trips_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_trip_version` IS NULL AND
     `route_version_id` IS NULL AND `route_snapshot_json` IS NULL AND
     `route_snapshot_checksum` IS NULL AND `route_snapshot_schema_version` IS NULL AND
     `canonical_match_id` IS NULL AND `canonical_dispatch_id` IS NULL AND
     `canonical_assignment_key` IS NULL AND `canonical_availability_key` IS NULL)
    OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_trip_version` = 'canonical_route_trip_v1' AND
     `route_version_id` IS NOT NULL AND `route_snapshot_json` IS NOT NULL AND
     `route_snapshot_checksum` IS NOT NULL AND
     `route_snapshot_checksum` REGEXP '^[0-9a-f]{64}$' AND
     `route_snapshot_schema_version` = 'canonical_route_snapshot_v1' AND
     `canonical_match_id` IS NOT NULL AND `canonical_dispatch_id` IS NOT NULL AND
     `canonical_availability_key` IS NOT NULL AND
     `canonical_availability_key` = `driver_route_id` AND
     `canonical_assignment_key` IS NOT NULL AND
     `canonical_assignment_key` = SHA2(CONCAT(
       CHAR_LENGTH(`canonical_dispatch_id`), ':', `canonical_dispatch_id`, '|',
       CHAR_LENGTH(`driver_route_id`), ':', `driver_route_id`, '|',
       CHAR_LENGTH(`route_version_id`), ':', `route_version_id`, '|',
       CHAR_LENGTH(`operational_mode`), ':', `operational_mode`, '|',
       CHAR_LENGTH(IF(`passenger_request_id` IS NULL, 'merchant_order', 'passenger')), ':',
         IF(`passenger_request_id` IS NULL, 'merchant_order', 'passenger'), '|',
       CHAR_LENGTH(COALESCE(`passenger_request_id`, `merchant_order_id`)), ':',
         COALESCE(`passenger_request_id`, `merchant_order_id`)
     ), 256) AND
     `parcel_batch_id` IS NULL AND
     ((`passenger_request_id` IS NOT NULL AND `merchant_order_id` IS NULL) OR
      (`merchant_order_id` IS NOT NULL AND `passenger_request_id` IS NULL)))
  ),
  ADD CONSTRAINT `trips_canonical_assignment_fkey`
    FOREIGN KEY (`canonical_match_id`, `canonical_assignment_key`)
    REFERENCES `matches` (`id`, `canonical_assignment_key`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `canonical_demand_dispatches`
  ADD UNIQUE INDEX `canonical_dispatch_active_offer_ownership_key` (`active_match_offer_id`, `id`),
  ADD UNIQUE INDEX `canonical_dispatch_assigned_trip_ownership_key` (`assigned_trip_id`, `id`),
  ADD CONSTRAINT `canonical_dispatch_active_offer_fkey`
    FOREIGN KEY (`active_match_offer_id`, `id`)
    REFERENCES `matches` (`id`, `active_dispatch_key`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_dispatch_assigned_trip_fkey`
    FOREIGN KEY (`assigned_trip_id`, `id`)
    REFERENCES `trips` (`id`, `canonical_dispatch_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;
