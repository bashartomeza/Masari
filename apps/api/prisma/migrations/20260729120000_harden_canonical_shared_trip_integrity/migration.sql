-- Forward-only hardening for the M7C3C1 shared-trip aggregate. Migrations 1-17
-- remain immutable; this migration adds ownership constraints and database-side
-- lifecycle guards that Prisma schema syntax cannot fully represent.

ALTER TABLE `matches`
  ADD UNIQUE INDEX `matches_manifest_id_key` (`manifest_id`),
  ADD UNIQUE INDEX `matches_manifest_reservation_key` (`reservation_id`, `manifest_id`),
  ADD CONSTRAINT `matches_manifest_reservation_fkey`
    FOREIGN KEY (`reservation_id`, `manifest_id`)
    REFERENCES `capacity_reservations` (`id`, `manifest_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `capacity_reservations`
  ADD UNIQUE INDEX `capacity_reservations_match_manifest_key` (`match_id`, `manifest_id`),
  ADD CONSTRAINT `capacity_reservations_match_manifest_fkey`
    FOREIGN KEY (`match_id`, `manifest_id`)
    REFERENCES `matches` (`id`, `manifest_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `canonical_trip_manifests`
  ADD UNIQUE INDEX `canonical_manifest_reservation_ownership_key` (`reservation_id`, `id`),
  ADD CONSTRAINT `canonical_manifest_reservation_ownership_fkey`
    FOREIGN KEY (`reservation_id`, `id`)
    REFERENCES `capacity_reservations` (`id`, `manifest_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `canonical_manifest_lifecycle_timestamps_chk` CHECK (
    (`lifecycle_status` = 'building' AND
      `offered_at` IS NULL AND `accepted_at` IS NULL AND `rejected_at` IS NULL AND
      `expired_at` IS NULL AND `dissolved_at` IS NULL) OR
    (`lifecycle_status` = 'offered' AND
      `offered_at` IS NOT NULL AND `accepted_at` IS NULL AND `rejected_at` IS NULL AND
      `expired_at` IS NULL AND `dissolved_at` IS NULL) OR
    (`lifecycle_status` = 'accepted' AND
      `offered_at` IS NOT NULL AND `accepted_at` IS NOT NULL AND `rejected_at` IS NULL AND
      `expired_at` IS NULL AND `dissolved_at` IS NULL) OR
    (`lifecycle_status` = 'rejected' AND
      `offered_at` IS NOT NULL AND `accepted_at` IS NULL AND `rejected_at` IS NOT NULL AND
      `expired_at` IS NULL AND `dissolved_at` IS NULL) OR
    (`lifecycle_status` = 'expired' AND
      `offered_at` IS NOT NULL AND `accepted_at` IS NULL AND `rejected_at` IS NULL AND
      `expired_at` IS NOT NULL AND `dissolved_at` IS NULL) OR
    (`lifecycle_status` = 'dissolved' AND
      `offered_at` IS NOT NULL AND `accepted_at` IS NULL AND `rejected_at` IS NULL AND
      `expired_at` IS NULL AND `dissolved_at` IS NOT NULL)
  );

-- MySQL triggers can have a single SET statement without client-side DELIMITER
-- directives. Assigning NULL to the guarded NOT NULL enum makes an invalid
-- mutation fail atomically while remaining compatible with Prisma Migrate.
CREATE TRIGGER `canonical_manifest_update_guard`
BEFORE UPDATE ON `canonical_trip_manifests`
FOR EACH ROW
SET NEW.`lifecycle_status` = IF(
  NEW.`id` <=> OLD.`id` AND
  NEW.`operational_mode` <=> OLD.`operational_mode` AND
  NEW.`match_version` <=> OLD.`match_version` AND
  NEW.`trip_version` <=> OLD.`trip_version` AND
  NEW.`capacity_model` <=> OLD.`capacity_model` AND
  NEW.`route_version_id` <=> OLD.`route_version_id` AND
  NEW.`driver_route_id` <=> OLD.`driver_route_id` AND
  NEW.`member_count` <=> OLD.`member_count` AND
  NEW.`passenger_request_count` <=> OLD.`passenger_request_count` AND
  NEW.`passenger_seat_count` <=> OLD.`passenger_seat_count` AND
  NEW.`merchant_order_count` <=> OLD.`merchant_order_count` AND
  NEW.`parcel_unit_count` <=> OLD.`parcel_unit_count` AND
  NEW.`manifest_fingerprint` <=> OLD.`manifest_fingerprint` AND
  NEW.`manifest_schema_version` <=> OLD.`manifest_schema_version` AND
  NEW.`created_at` <=> OLD.`created_at` AND
  (OLD.`lifecycle_status` = 'building' OR NEW.`offered_revision` <=> OLD.`offered_revision`) AND
  (
    NEW.`lifecycle_status` = OLD.`lifecycle_status` OR
    (OLD.`lifecycle_status` = 'building' AND NEW.`lifecycle_status` = 'offered') OR
    (OLD.`lifecycle_status` = 'offered' AND
      NEW.`lifecycle_status` IN ('accepted', 'rejected', 'expired', 'dissolved')) OR
    NEW.`lifecycle_status` = 'dissolved'
  ),
  NEW.`lifecycle_status`,
  NULL
);

CREATE TRIGGER `canonical_manifest_member_update_guard`
BEFORE UPDATE ON `canonical_trip_manifest_members`
FOR EACH ROW
SET NEW.`member_status` = IF(
  NEW.`id` <=> OLD.`id` AND
  NEW.`manifest_id` <=> OLD.`manifest_id` AND
  NEW.`dispatch_id` <=> OLD.`dispatch_id` AND
  NEW.`operational_mode` <=> OLD.`operational_mode` AND
  NEW.`demand_type` <=> OLD.`demand_type` AND
  NEW.`demand_id` <=> OLD.`demand_id` AND
  NEW.`passenger_request_id` <=> OLD.`passenger_request_id` AND
  NEW.`merchant_order_id` <=> OLD.`merchant_order_id` AND
  NEW.`member_sequence` <=> OLD.`member_sequence` AND
  NEW.`passenger_seats` <=> OLD.`passenger_seats` AND
  NEW.`parcel_units` <=> OLD.`parcel_units` AND
  NEW.`pickup_stop_id` <=> OLD.`pickup_stop_id` AND
  NEW.`drop_off_stop_id` <=> OLD.`drop_off_stop_id` AND
  CAST(NEW.`destination_summary_json` AS CHAR) <=> CAST(OLD.`destination_summary_json` AS CHAR) AND
  NEW.`demand_fingerprint` <=> OLD.`demand_fingerprint` AND
  NEW.`attempt_number` <=> OLD.`attempt_number` AND
  NEW.`route_version_id` <=> OLD.`route_version_id` AND
  NEW.`created_at` <=> OLD.`created_at` AND
  (
    NEW.`member_status` = OLD.`member_status` OR
    (OLD.`member_status` = 'active' AND
      NEW.`member_status` IN ('accepted', 'released', 'invalidated'))
  ),
  NEW.`member_status`,
  NULL
);

CREATE TRIGGER `canonical_shared_match_update_guard`
BEFORE UPDATE ON `matches`
FOR EACH ROW
SET NEW.`status` = IF(
  NOT (
    COALESCE(OLD.`canonical_match_version`, '') = 'canonical_shared_trip_match_v1' OR
    COALESCE(NEW.`canonical_match_version`, '') = 'canonical_shared_trip_match_v1'
  ) OR (
    NEW.`id` <=> OLD.`id` AND
    NEW.`driver_route_id` <=> OLD.`driver_route_id` AND
    NEW.`route_version_id` <=> OLD.`route_version_id` AND
    NEW.`canonical_match_version` <=> OLD.`canonical_match_version` AND
    NEW.`operational_mode` <=> OLD.`operational_mode` AND
    NEW.`reservation_id` <=> OLD.`reservation_id` AND
    NEW.`manifest_id` <=> OLD.`manifest_id` AND
    NEW.`method` <=> OLD.`method` AND
    NEW.`score_version` <=> OLD.`score_version` AND
    NEW.`offered_at` <=> OLD.`offered_at` AND
    NEW.`expires_at` <=> OLD.`expires_at` AND
    NEW.`created_at` <=> OLD.`created_at` AND
    (
      NEW.`status` = OLD.`status` OR
      (OLD.`status` = 'sent_to_driver' AND
        NEW.`status` IN ('accepted', 'rejected', 'expired', 'invalidated'))
    )
  ),
  NEW.`status`,
  NULL
);

CREATE TRIGGER `canonical_shared_reservation_update_guard`
BEFORE UPDATE ON `capacity_reservations`
FOR EACH ROW
SET NEW.`status` = IF(
  (OLD.`manifest_id` IS NULL AND NEW.`manifest_id` IS NULL) OR (
    NEW.`id` <=> OLD.`id` AND
    NEW.`driver_route_id` <=> OLD.`driver_route_id` AND
    NEW.`route_version_id` <=> OLD.`route_version_id` AND
    NEW.`manifest_id` <=> OLD.`manifest_id` AND
    NEW.`reservation_type` <=> OLD.`reservation_type` AND
    NEW.`seats_reserved` <=> OLD.`seats_reserved` AND
    NEW.`parcel_units_reserved` <=> OLD.`parcel_units_reserved` AND
    NEW.`expires_at` <=> OLD.`expires_at` AND
    NEW.`idempotency_fingerprint` <=> OLD.`idempotency_fingerprint` AND
    NEW.`operational_mode` <=> OLD.`operational_mode` AND
    NEW.`capacity_model` <=> OLD.`capacity_model` AND
    NEW.`reservation_fingerprint` <=> OLD.`reservation_fingerprint` AND
    NEW.`created_at` <=> OLD.`created_at` AND
    (
      NEW.`match_id` <=> OLD.`match_id` OR
      (OLD.`match_id` IS NULL AND NEW.`match_id` IS NOT NULL) OR
      (OLD.`match_id` IS NOT NULL AND NEW.`match_id` IS NULL AND
        NEW.`status` = 'released' AND NEW.`release_reason` = 'test_cleanup')
    ) AND
    (
      NEW.`status` = OLD.`status` OR
      (OLD.`status` = 'held' AND NEW.`status` IN ('confirmed', 'released', 'expired')) OR
      (NEW.`status` = 'released' AND NEW.`release_reason` = 'test_cleanup')
    )
  ),
  NEW.`status`,
  NULL
);

CREATE TRIGGER `canonical_demand_attempt_update_guard`
BEFORE UPDATE ON `canonical_demand_attempts`
FOR EACH ROW
SET NEW.`outcome` = IF(
  NEW.`id` <=> OLD.`id` AND
  NEW.`dispatch_id` <=> OLD.`dispatch_id` AND
  NEW.`driver_route_id` <=> OLD.`driver_route_id` AND
  NEW.`manifest_id` <=> OLD.`manifest_id` AND
  NEW.`match_offer_id` <=> OLD.`match_offer_id` AND
  NEW.`attempt_number` <=> OLD.`attempt_number` AND
  NEW.`created_at` <=> OLD.`created_at` AND
  (
    NEW.`outcome` = OLD.`outcome` OR
    (OLD.`outcome` = 'offered' AND
      NEW.`outcome` IN ('rejected', 'expired', 'system_invalidated'))
  ),
  NEW.`outcome`,
  NULL
);
