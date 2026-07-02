CREATE TYPE "UserRole" AS ENUM ('passenger', 'driver', 'merchant', 'admin');
CREATE TYPE "DriverRouteStatus" AS ENUM ('inactive', 'active', 'assigned', 'on_trip', 'completed');
CREATE TYPE "RequestStatus" AS ENUM ('draft', 'pending', 'matched', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE "MerchantOrderStatus" AS ENUM ('draft', 'submitted', 'batched', 'assigned', 'in_transit', 'completed');
CREATE TYPE "ParcelStatus" AS ENUM ('pending', 'batched', 'assigned', 'picked_up', 'in_transit', 'delivered');
CREATE TYPE "AuditAction" AS ENUM ('auth_login', 'demo_reset', 'passenger_request_created', 'passenger_request_cancelled', 'driver_route_created', 'driver_route_deactivated', 'merchant_order_created', 'parcel_batch_created', 'comparison_run_created', 'driver_verification', 'match_decision', 'admin_action');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "demo_account" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "driver_profiles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "vehicle_type" TEXT NOT NULL,
  "seats_total" INTEGER NOT NULL,
  "parcel_capacity" INTEGER NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "trust_score" INTEGER NOT NULL DEFAULT 70,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "driver_routes" (
  "id" TEXT NOT NULL,
  "driver_id" TEXT NOT NULL,
  "origin_label" TEXT NOT NULL,
  "origin_lat" DECIMAL(9,6) NOT NULL,
  "origin_lng" DECIMAL(9,6) NOT NULL,
  "destination_label" TEXT NOT NULL,
  "destination_lat" DECIMAL(9,6) NOT NULL,
  "destination_lng" DECIMAL(9,6) NOT NULL,
  "corridor_key" TEXT NOT NULL,
  "seats_available" INTEGER NOT NULL,
  "parcel_capacity_available" INTEGER NOT NULL,
  "status" "DriverRouteStatus" NOT NULL DEFAULT 'inactive',
  "activated_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "driver_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "passenger_requests" (
  "id" TEXT NOT NULL,
  "passenger_id" TEXT NOT NULL,
  "pickup_label" TEXT NOT NULL,
  "pickup_lat" DECIMAL(9,6) NOT NULL,
  "pickup_lng" DECIMAL(9,6) NOT NULL,
  "destination_label" TEXT NOT NULL,
  "destination_lat" DECIMAL(9,6) NOT NULL,
  "destination_lng" DECIMAL(9,6) NOT NULL,
  "preferred_time" TIMESTAMP(3) NOT NULL,
  "passenger_count" INTEGER NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'pending',
  "source" TEXT NOT NULL DEFAULT 'seed',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "passenger_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "merchant_orders" (
  "id" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "pickup_label" TEXT NOT NULL,
  "pickup_lat" DECIMAL(9,6) NOT NULL,
  "pickup_lng" DECIMAL(9,6) NOT NULL,
  "status" "MerchantOrderStatus" NOT NULL DEFAULT 'submitted',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parcels" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "destination_label" TEXT NOT NULL,
  "destination_lat" DECIMAL(9,6) NOT NULL,
  "destination_lng" DECIMAL(9,6) NOT NULL,
  "size" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "status" "ParcelStatus" NOT NULL DEFAULT 'pending',
  "batch_id" TEXT,
  CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demo_scenarios" (
  "id" TEXT NOT NULL,
  "scenario_key" TEXT NOT NULL,
  "corridor_key" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "seed_version" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demo_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "action" "AuditAction" NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "driver_profiles_user_id_key" ON "driver_profiles"("user_id");
CREATE INDEX "driver_routes_corridor_key_idx" ON "driver_routes"("corridor_key");
CREATE UNIQUE INDEX "demo_scenarios_scenario_key_key" ON "demo_scenarios"("scenario_key");
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");
CREATE INDEX "audit_events_user_id_idx" ON "audit_events"("user_id");

ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "driver_routes" ADD CONSTRAINT "driver_routes_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "passenger_requests" ADD CONSTRAINT "passenger_requests_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_orders" ADD CONSTRAINT "merchant_orders_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "merchant_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
