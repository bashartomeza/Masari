-- Follow-up independent-review hardening for M7C1.
-- Normalize cross-table operational mode and quarantine repeatedly invalid expiry candidates.

ALTER TABLE `driver_routes`
  ADD COLUMN `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'legacy';

UPDATE `driver_routes`
SET `operational_mode` = 'canonical_route_v1'
WHERE `canonical_availability_version` = 'canonical_route_v1';

ALTER TABLE `driver_routes`
  ADD UNIQUE INDEX `driver_routes_mode_ownership_key` (`id`, `operational_mode`),
  ADD CONSTRAINT `driver_routes_operational_mode_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_availability_version` IS NULL) OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_availability_version` = 'canonical_route_v1')
  );

ALTER TABLE `matches`
  ADD COLUMN `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'legacy';

UPDATE `matches`
SET `operational_mode` = 'canonical_route_v1'
WHERE `canonical_match_version` = 'canonical_route_v1';

ALTER TABLE `matches`
  DROP CHECK `matches_canonical_shape_chk`,
  ADD UNIQUE INDEX `matches_mode_ownership_key` (`id`, `operational_mode`),
  ADD CONSTRAINT `matches_canonical_shape_chk` CHECK (
    (`operational_mode` = 'legacy' AND `canonical_match_version` IS NULL AND `route_version_id` IS NULL) OR
    (`operational_mode` = 'canonical_route_v1' AND
     `canonical_match_version` = 'canonical_route_v1' AND `route_version_id` IS NOT NULL)
  ),
  ADD CONSTRAINT `matches_driver_route_mode_fkey`
    FOREIGN KEY (`driver_route_id`, `operational_mode`)
    REFERENCES `driver_routes` (`id`, `operational_mode`) ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE `capacity_reservations`
  ADD COLUMN `operational_mode` VARCHAR(50) NOT NULL DEFAULT 'canonical_route_v1',
  ADD COLUMN `expiry_failure_count` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `expiry_last_failed_at` DATETIME(3) NULL,
  ADD INDEX `capacity_reservations_expiry_retry_idx`
    (`status`, `expiry_failure_count`, `expires_at`),
  ADD CONSTRAINT `capacity_reservations_operational_mode_chk` CHECK (
    `operational_mode` = 'canonical_route_v1'
  ),
  ADD CONSTRAINT `capacity_reservations_expiry_failure_chk` CHECK (
    `expiry_failure_count` BETWEEN 0 AND 3
  ),
  ADD CONSTRAINT `capacity_reservations_driver_route_mode_fkey`
    FOREIGN KEY (`driver_route_id`, `operational_mode`)
    REFERENCES `driver_routes` (`id`, `operational_mode`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `capacity_reservations_match_mode_fkey`
    FOREIGN KEY (`match_id`, `operational_mode`)
    REFERENCES `matches` (`id`, `operational_mode`) ON DELETE RESTRICT ON UPDATE RESTRICT;
