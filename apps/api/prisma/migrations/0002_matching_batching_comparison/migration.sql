CREATE TYPE "ParcelBatchStatus" AS ENUM ('created', 'proposed', 'assigned', 'picked_up', 'in_transit', 'delivered');
CREATE TYPE "MatchStatus" AS ENUM ('proposed', 'sent_to_driver', 'accepted', 'rejected', 'expired');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'parcel_batch_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'comparison_run_created';

CREATE TABLE "parcel_batches" (
  "id" TEXT NOT NULL,
  "merchant_order_id" TEXT NOT NULL,
  "driver_route_id" TEXT,
  "status" "ParcelBatchStatus" NOT NULL DEFAULT 'created',
  "estimated_distance_saved" DECIMAL(10,2) NOT NULL,
  "explanation" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "parcel_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "matches" (
  "id" TEXT NOT NULL,
  "driver_route_id" TEXT NOT NULL,
  "passenger_request_id" TEXT,
  "merchant_order_id" TEXT,
  "parcel_batch_id" TEXT,
  "score" DECIMAL(5,4) NOT NULL,
  "method" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "scoring_breakdown" JSONB NOT NULL,
  "status" "MatchStatus" NOT NULL DEFAULT 'proposed',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comparison_runs" (
  "id" TEXT NOT NULL,
  "scenario_key" TEXT NOT NULL,
  "masari_trips" INTEGER NOT NULL,
  "nearest_driver_trips" INTEGER NOT NULL,
  "masari_estimated_distance" DECIMAL(10,2) NOT NULL,
  "nearest_estimated_distance" DECIMAL(10,2) NOT NULL,
  "masari_estimated_cost" DECIMAL(10,2) NOT NULL,
  "nearest_estimated_cost" DECIMAL(10,2) NOT NULL,
  "parcel_batching_benefit" TEXT NOT NULL,
  "driver_utilization" DECIMAL(5,2) NOT NULL,
  "winner" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comparison_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "parcel_batches" ADD CONSTRAINT "parcel_batches_merchant_order_id_fkey" FOREIGN KEY ("merchant_order_id") REFERENCES "merchant_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parcel_batches" ADD CONSTRAINT "parcel_batches_driver_route_id_fkey" FOREIGN KEY ("driver_route_id") REFERENCES "driver_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_driver_route_id_fkey" FOREIGN KEY ("driver_route_id") REFERENCES "driver_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_passenger_request_id_fkey" FOREIGN KEY ("passenger_request_id") REFERENCES "passenger_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_merchant_order_id_fkey" FOREIGN KEY ("merchant_order_id") REFERENCES "merchant_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_parcel_batch_id_fkey" FOREIGN KEY ("parcel_batch_id") REFERENCES "parcel_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
