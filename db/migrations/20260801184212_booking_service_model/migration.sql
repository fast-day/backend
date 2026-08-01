/*
  Warnings:

  - Made the column `duration` on table `booking_services` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unit_price` on table `booking_services` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "booking_services" ALTER COLUMN "duration" SET NOT NULL,
ALTER COLUMN "unit_price" SET NOT NULL;
