/*
  Warnings:

  - You are about to drop the column `time_zone` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the column `time_zone_offset` on the `settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "settings" DROP COLUMN "time_zone",
DROP COLUMN "time_zone_offset";
