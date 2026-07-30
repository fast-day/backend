-- CreateEnum
CREATE TYPE "CANCEL_REASON" AS ENUM ('client_cancelled', 'client_no_show', 'specialist_cancelled', 'other');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cancel_reason" "CANCEL_REASON",
ADD COLUMN     "cancelled_at" TIMESTAMP(3);
