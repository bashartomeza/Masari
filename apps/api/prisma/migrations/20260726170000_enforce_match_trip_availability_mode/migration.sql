-- MySQL permits a composite foreign key to be bypassed when any child column is
-- NULL. Legacy matches and trips intentionally have no route_version_id, so add
-- non-null mode ownership keys in addition to the route-aware canonical keys.
ALTER TABLE `matches`
  ADD CONSTRAINT `matches_driver_route_mode_fkey`
    FOREIGN KEY (`driver_route_id`, `operational_mode`)
    REFERENCES `driver_routes` (`id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `trips`
  ADD CONSTRAINT `trips_driver_route_mode_fkey`
    FOREIGN KEY (`driver_route_id`, `operational_mode`)
    REFERENCES `driver_routes` (`id`, `operational_mode`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;
