/*
  Warnings:

  - You are about to drop the column `date` on the `booking_services` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `booking_services` table. All the data in the column will be lost.
  - Changed the type of `end_time` on the `booking_services` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `start_time` on the `booking_services` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "booking_services" DROP CONSTRAINT "booking_services_employee_id_fkey";

-- DropIndex
DROP INDEX "booking_services_serviceId_idx";

-- AlterTable
ALTER TABLE "booking_services" DROP COLUMN "date",
DROP COLUMN "price",
ADD COLUMN     "unit_price" INTEGER,
DROP COLUMN "end_time",
ADD COLUMN     "end_time" TIMESTAMP(3) NOT NULL,
DROP COLUMN "start_time",
ADD COLUMN     "start_time" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "booking_services_serviceId_employee_id_idx" ON "booking_services"("serviceId", "employee_id");

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
