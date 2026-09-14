-- CreateEnum
CREATE TYPE "TRANSACTION_CATEGORY_TYPE" AS ENUM ('service', 'refund', 'custom');

-- AlterTable
ALTER TABLE "transaction_categories" ADD COLUMN     "type" "TRANSACTION_CATEGORY_TYPE" NOT NULL DEFAULT 'custom';
