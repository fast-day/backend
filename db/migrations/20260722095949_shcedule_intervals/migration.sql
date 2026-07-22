/*
  Warnings:

  - Changed the type of `start` on the `schedule_intervals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `end` on the `schedule_intervals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "schedule_intervals" DROP COLUMN "start",
ADD COLUMN     "start" TIME NOT NULL,
DROP COLUMN "end",
ADD COLUMN     "end" TIME NOT NULL;
