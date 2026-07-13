-- AlterTable
ALTER TABLE `comparison_runs` MODIFY `parcel_batching_benefit` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `demo_scenarios` MODIFY `description` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `matches` MODIFY `explanation` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `parcel_batches` MODIFY `explanation` TEXT NOT NULL;
