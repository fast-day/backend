-- AlterTable
ALTER TABLE "address" ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "region" DROP NOT NULL,
ALTER COLUMN "position_lat" DROP NOT NULL,
ALTER COLUMN "position_lng" DROP NOT NULL;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "time_zone" TEXT,
ADD COLUMN     "time_zone_offset" TEXT;
