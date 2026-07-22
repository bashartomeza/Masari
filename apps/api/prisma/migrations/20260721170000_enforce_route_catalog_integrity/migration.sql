-- A current version must be owned by the ServiceRoute that points to it.
-- This is forward-only; the original M7B migration remains immutable.
ALTER TABLE `service_routes`
  DROP FOREIGN KEY `service_routes_current_version_id_fkey`;

ALTER TABLE `service_route_versions`
  ADD UNIQUE INDEX `service_route_versions_route_ownership_key` (`service_route_id`, `id`);

ALTER TABLE `service_routes`
  ADD UNIQUE INDEX `service_routes_owned_current_key` (`id`, `current_version_id`),
  ADD CONSTRAINT `service_routes_owned_current_version_fkey`
    FOREIGN KEY (`id`, `current_version_id`)
    REFERENCES `service_route_versions` (`service_route_id`, `id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
