/*
  Warnings:

  - You are about to drop the column `employeeId` on the `bookings` table. All the data in the column will be lost.
  - Added the required column `date` to the `booking_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employee_id` to the `booking_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_time` to the `booking_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `booking_services` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_employeeId_fkey";

-- AlterTable
ALTER TABLE "booking_services" ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "employee_id" TEXT NOT NULL,
ADD COLUMN     "end_time" TEXT NOT NULL,
ADD COLUMN     "start_time" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "employeeId";

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
