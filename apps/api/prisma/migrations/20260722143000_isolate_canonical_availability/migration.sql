-- M7C1 compatibility correction: M7B-linked demo DriverRoute rows are legacy
-- supply. A separate marker isolates newly entered canonical availability from
-- the deterministic corridor matcher and batcher.
ALTER TABLE `driver_routes`
  ADD COLUMN `canonical_availability_version` VARCHAR(50) NULL,
  ADD INDEX `driver_routes_canonical_availability_status_departure_idx`
    (`canonical_availability_version`, `availability_status`, `departure_at`),
  ADD CONSTRAINT `driver_routes_canonical_availability_version_chk`
    CHECK (`canonical_availability_version` IS NULL OR `canonical_availability_version` = 'canonical_route_v1');
