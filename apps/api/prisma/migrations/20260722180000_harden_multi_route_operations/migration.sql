-- Independent-review hardening for M7C1 operational invariants.
-- Forward-only: prior migrations and legacy null-mode rows remain unchanged.

ALTER TABLE `driver_routes`
  DROP FOREIGN KEY `driver_routes_route_version_id_fkey`;

ALTER TABLE `driver_routes`
  ADD CONSTRAINT `driver_routes_route_version_id_fkey`
    FOREIGN KEY (`route_version_id`) REFERENCES `service_route_versions` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `driver_routes_canonical_availability_shape_chk` CHECK (
    `canonical_availability_version` IS NULL OR
    (`canonical_availability_version` = 'canonical_route_v1' AND
     `route_version_id` IS NOT NULL AND `departure_at` IS NOT NULL AND
     `total_seats` BETWEEN 1 AND 8 AND `remaining_seats` IS NOT NULL AND
     `total_parcel_capacity` BETWEEN 0 AND 20 AND `remaining_parcel_capacity` IS NOT NULL AND
     `availability_status` IS NOT NULL)
  );

ALTER TABLE `passenger_requests`
  ADD UNIQUE INDEX `passenger_requests_route_ownership_key` (`id`, `route_version_id`),
  ADD CONSTRAINT `passenger_requests_canonical_count_chk` CHECK (
    `canonical_entry_version` IS NULL OR `passenger_count` BETWEEN 1 AND 8
  );

ALTER TABLE `matches`
  DROP CHECK `matches_canonical_shape_chk`,
  ADD UNIQUE INDEX `matches_route_ownership_key` (`id`, `route_version_id`),
  ADD CONSTRAINT `matches_canonical_shape_chk` CHECK (
    (`canonical_match_version` IS NULL AND `route_version_id` IS NULL) OR
    (`canonical_match_version` = 'canonical_route_v1' AND `route_version_id` IS NOT NULL)
  ),
  ADD CONSTRAINT `matches_driver_route_version_fkey`
    FOREIGN KEY (`driver_route_id`, `route_version_id`)
    REFERENCES `driver_routes` (`id`, `route_version_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_passenger_route_version_fkey`
    FOREIGN KEY (`passenger_request_id`, `route_version_id`)
    REFERENCES `passenger_requests` (`id`, `route_version_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `matches_merchant_route_version_fkey`
    FOREIGN KEY (`merchant_order_id`, `route_version_id`)
    REFERENCES `merchant_orders` (`id`, `route_version_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `trips`
  DROP CHECK `trips_canonical_shape_chk`,
  ADD CONSTRAINT `trips_canonical_shape_chk` CHECK (
    (`canonical_trip_version` IS NULL AND `route_version_id` IS NULL AND
     `route_snapshot_json` IS NULL AND `route_snapshot_checksum` IS NULL) OR
    (`canonical_trip_version` = 'canonical_trip_route_v1' AND `route_version_id` IS NOT NULL AND
     `route_snapshot_json` IS NOT NULL AND
     `route_snapshot_checksum` REGEXP '^[0-9a-f]{64}$')
  );

ALTER TABLE `capacity_reservations`
  ADD CONSTRAINT `capacity_reservations_match_route_fkey`
    FOREIGN KEY (`match_id`, `route_version_id`)
    REFERENCES `matches` (`id`, `route_version_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `capacity_reservations_terminal_reason_chk` CHECK (
    (`status` = 'held' AND `release_reason` IS NULL) OR
    (`status` = 'confirmed' AND `release_reason` IS NULL) OR
    (`status` = 'released' AND `release_reason` IN
      ('offer_rejected', 'offer_cancelled', 'operator_cancelled', 'test_cleanup')) OR
    (`status` = 'expired' AND `release_reason` = 'hold_expired')
  );
