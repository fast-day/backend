-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "ClientsRange" AS ENUM ('zero', 'one_to_five', 'six_to_fifteen', 'sixteen_plus');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "public_code" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "type" "LocationType" DEFAULT 'offline';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "public_code" SERIAL NOT NULL;

-- CreateTable
CREATE TABLE "onboarding_survey" (
    "id" TEXT NOT NULL,
    "clients_range" "ClientsRange",
    "source" TEXT,
    "main_goal" TEXT,
    "companyId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_note" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_survey_companyId_key" ON "onboarding_survey"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_public_code_key" ON "bookings"("public_code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_public_code_key" ON "orders"("public_code");

-- AddForeignKey
ALTER TABLE "onboarding_survey" ADD CONSTRAINT "onboarding_survey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_note" ADD CONSTRAINT "customer_note_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_note" ADD CONSTRAINT "customer_note_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_note" ADD CONSTRAINT "customer_note_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

