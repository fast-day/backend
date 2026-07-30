/*
  Warnings:

  - A unique constraint covering the columns `[company_id,tag]` on the table `receipts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `company_id` to the `receipts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "COUNTER_TYPE" AS ENUM ('order', 'receipt');

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "company_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "company_counters" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "COUNTER_TYPE" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "company_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_counters_company_id_type_key" ON "company_counters"("company_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_company_id_tag_key" ON "receipts"("company_id", "tag");

-- AddForeignKey
ALTER TABLE "company_counters" ADD CONSTRAINT "company_counters_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
