/*
  Warnings:

  - You are about to drop the column `type` on the `locations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('online', 'offline');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "type" "BookingType" DEFAULT 'offline';

-- AlterTable
ALTER TABLE "locations" DROP COLUMN "type";
