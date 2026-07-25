-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "has_bookings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_customers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_employees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_orders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_services" BOOLEAN NOT NULL DEFAULT false;
