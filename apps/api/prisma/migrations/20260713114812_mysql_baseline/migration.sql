-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('passenger', 'driver', 'merchant', 'admin') NOT NULL,
    `demo_account` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `vehicle_type` VARCHAR(191) NOT NULL,
    `seats_total` INTEGER NOT NULL,
    `parcel_capacity` INTEGER NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `trust_score` INTEGER NOT NULL DEFAULT 70,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `driver_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_routes` (
    `id` VARCHAR(191) NOT NULL,
    `driver_id` VARCHAR(191) NOT NULL,
    `origin_label` VARCHAR(191) NOT NULL,
    `origin_lat` DECIMAL(9, 6) NOT NULL,
    `origin_lng` DECIMAL(9, 6) NOT NULL,
    `destination_label` VARCHAR(191) NOT NULL,
    `destination_lat` DECIMAL(9, 6) NOT NULL,
    `destination_lng` DECIMAL(9, 6) NOT NULL,
    `corridor_key` VARCHAR(191) NOT NULL,
    `seats_available` INTEGER NOT NULL,
    `parcel_capacity_available` INTEGER NOT NULL,
    `status` ENUM('inactive', 'active', 'assigned', 'on_trip', 'completed') NOT NULL DEFAULT 'inactive',
    `activated_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,

    INDEX `driver_routes_corridor_key_idx`(`corridor_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `passenger_requests` (
    `id` VARCHAR(191) NOT NULL,
    `passenger_id` VARCHAR(191) NOT NULL,
    `pickup_label` VARCHAR(191) NOT NULL,
    `pickup_lat` DECIMAL(9, 6) NOT NULL,
    `pickup_lng` DECIMAL(9, 6) NOT NULL,
    `destination_label` VARCHAR(191) NOT NULL,
    `destination_lat` DECIMAL(9, 6) NOT NULL,
    `destination_lng` DECIMAL(9, 6) NOT NULL,
    `preferred_time` DATETIME(3) NOT NULL,
    `passenger_count` INTEGER NOT NULL,
    `status` ENUM('draft', 'pending', 'matched', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    `source` VARCHAR(191) NOT NULL DEFAULT 'seed',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_orders` (
    `id` VARCHAR(191) NOT NULL,
    `merchant_id` VARCHAR(191) NOT NULL,
    `pickup_label` VARCHAR(191) NOT NULL,
    `pickup_lat` DECIMAL(9, 6) NOT NULL,
    `pickup_lng` DECIMAL(9, 6) NOT NULL,
    `status` ENUM('draft', 'submitted', 'batched', 'assigned', 'in_transit', 'completed') NOT NULL DEFAULT 'submitted',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parcels` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `destination_label` VARCHAR(191) NOT NULL,
    `destination_lat` DECIMAL(9, 6) NOT NULL,
    `destination_lng` DECIMAL(9, 6) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'batched', 'assigned', 'picked_up', 'in_transit', 'delivered') NOT NULL DEFAULT 'pending',
    `batch_id` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parcel_batches` (
    `id` VARCHAR(191) NOT NULL,
    `merchant_order_id` VARCHAR(191) NOT NULL,
    `driver_route_id` VARCHAR(191) NULL,
    `status` ENUM('created', 'proposed', 'assigned', 'picked_up', 'in_transit', 'delivered') NOT NULL DEFAULT 'created',
    `estimated_distance_saved` DECIMAL(10, 2) NOT NULL,
    `explanation` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matches` (
    `id` VARCHAR(191) NOT NULL,
    `driver_route_id` VARCHAR(191) NOT NULL,
    `passenger_request_id` VARCHAR(191) NULL,
    `merchant_order_id` VARCHAR(191) NULL,
    `parcel_batch_id` VARCHAR(191) NULL,
    `score` DECIMAL(5, 4) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `explanation` VARCHAR(191) NOT NULL,
    `scoring_breakdown` JSON NOT NULL,
    `status` ENUM('proposed', 'sent_to_driver', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'proposed',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comparison_runs` (
    `id` VARCHAR(191) NOT NULL,
    `scenario_key` VARCHAR(191) NOT NULL,
    `masari_trips` INTEGER NOT NULL,
    `nearest_driver_trips` INTEGER NOT NULL,
    `masari_estimated_distance` DECIMAL(10, 2) NOT NULL,
    `nearest_estimated_distance` DECIMAL(10, 2) NOT NULL,
    `masari_estimated_cost` DECIMAL(10, 2) NOT NULL,
    `nearest_estimated_cost` DECIMAL(10, 2) NOT NULL,
    `parcel_batching_benefit` VARCHAR(191) NOT NULL,
    `driver_utilization` DECIMAL(5, 2) NOT NULL,
    `winner` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trips` (
    `id` VARCHAR(191) NOT NULL,
    `driver_id` VARCHAR(191) NOT NULL,
    `driver_route_id` VARCHAR(191) NOT NULL,
    `passenger_request_id` VARCHAR(191) NULL,
    `merchant_order_id` VARCHAR(191) NULL,
    `parcel_batch_id` VARCHAR(191) NULL,
    `status` ENUM('created', 'accepted', 'pickup_started', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'created',
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `trips_driver_id_idx`(`driver_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location_events` (
    `id` VARCHAR(191) NOT NULL,
    `trip_id` VARCHAR(191) NOT NULL,
    `driver_id` VARCHAR(191) NOT NULL,
    `lat` DECIMAL(9, 6) NOT NULL,
    `lng` DECIMAL(9, 6) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `location_events_trip_id_sequence_idx`(`trip_id`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `demo_scenarios` (
    `id` VARCHAR(191) NOT NULL,
    `scenario_key` VARCHAR(191) NOT NULL,
    `corridor_key` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `seed_version` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `demo_scenarios_scenario_key_key`(`scenario_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_events` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `action` ENUM('auth_login', 'demo_reset', 'passenger_request_created', 'passenger_request_cancelled', 'driver_route_created', 'driver_route_deactivated', 'merchant_order_created', 'parcel_batch_created', 'comparison_run_created', 'match_accepted', 'match_rejected', 'trip_status_updated', 'location_recorded', 'tracking_simulation_step', 'driver_verification', 'match_decision', 'admin_action') NOT NULL,
    `entity_type` VARCHAR(191) NULL,
    `entity_id` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_events_action_idx`(`action`),
    INDEX `audit_events_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `driver_profiles` ADD CONSTRAINT `driver_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_routes` ADD CONSTRAINT `driver_routes_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passenger_requests` ADD CONSTRAINT `passenger_requests_passenger_id_fkey` FOREIGN KEY (`passenger_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_orders` ADD CONSTRAINT `merchant_orders_merchant_id_fkey` FOREIGN KEY (`merchant_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parcels` ADD CONSTRAINT `parcels_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `merchant_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parcel_batches` ADD CONSTRAINT `parcel_batches_merchant_order_id_fkey` FOREIGN KEY (`merchant_order_id`) REFERENCES `merchant_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parcel_batches` ADD CONSTRAINT `parcel_batches_driver_route_id_fkey` FOREIGN KEY (`driver_route_id`) REFERENCES `driver_routes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_driver_route_id_fkey` FOREIGN KEY (`driver_route_id`) REFERENCES `driver_routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_passenger_request_id_fkey` FOREIGN KEY (`passenger_request_id`) REFERENCES `passenger_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_merchant_order_id_fkey` FOREIGN KEY (`merchant_order_id`) REFERENCES `merchant_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_parcel_batch_id_fkey` FOREIGN KEY (`parcel_batch_id`) REFERENCES `parcel_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_driver_route_id_fkey` FOREIGN KEY (`driver_route_id`) REFERENCES `driver_routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_passenger_request_id_fkey` FOREIGN KEY (`passenger_request_id`) REFERENCES `passenger_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_merchant_order_id_fkey` FOREIGN KEY (`merchant_order_id`) REFERENCES `merchant_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_parcel_batch_id_fkey` FOREIGN KEY (`parcel_batch_id`) REFERENCES `parcel_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_events` ADD CONSTRAINT `location_events_trip_id_fkey` FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
