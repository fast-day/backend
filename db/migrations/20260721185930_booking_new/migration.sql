/*
  Warnings:

  - You are about to drop the column `date` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `end_time` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `bookings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_employeeId_fkey";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "date",
DROP COLUMN "employeeId",
DROP COLUMN "end_time",
DROP COLUMN "start_time";
