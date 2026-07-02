CREATE TYPE "TripStatus" AS ENUM ('created', 'accepted', 'pickup_started', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'match_accepted';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'match_rejected';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'trip_status_updated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'location_recorded';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'tracking_simulation_step';

CREATE TABLE "trips" (
  "id" TEXT NOT NULL,
  "driver_id" TEXT NOT NULL,
  "driver_route_id" TEXT NOT NULL,
  "passenger_request_id" TEXT,
  "merchant_order_id" TEXT,
  "parcel_batch_id" TEXT,
  "status" "TripStatus" NOT NULL DEFAULT 'created',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "location_events" (
  "id" TEXT NOT NULL,
  "trip_id" TEXT NOT NULL,
  "driver_id" TEXT NOT NULL,
  "lat" DECIMAL(9,6) NOT NULL,
  "lng" DECIMAL(9,6) NOT NULL,
  "source" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "location_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trips_driver_id_idx" ON "trips"("driver_id");
CREATE INDEX "location_events_trip_id_sequence_idx" ON "location_events"("trip_id", "sequence");

ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_route_id_fkey" FOREIGN KEY ("driver_route_id") REFERENCES "driver_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_passenger_request_id_fkey" FOREIGN KEY ("passenger_request_id") REFERENCES "passenger_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_merchant_order_id_fkey" FOREIGN KEY ("merchant_order_id") REFERENCES "merchant_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_parcel_batch_id_fkey" FOREIGN KEY ("parcel_batch_id") REFERENCES "parcel_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "location_events" ADD CONSTRAINT "location_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
