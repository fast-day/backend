/*
  Warnings:

  - You are about to drop the column `receipt_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the `receipts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[invoice_id]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "INVOICE_TYPE" AS ENUM ('paid', 'refunded');

-- CreateEnum
CREATE TYPE "INVOICE_STATUS" AS ENUM ('success', 'failed');

-- AlterEnum
ALTER TYPE "COUNTER_TYPE" ADD VALUE 'invoice';

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_company_id_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_order_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_receipt_id_fkey";

-- DropIndex
DROP INDEX "transactions_receipt_id_key";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "receipt_id",
ADD COLUMN     "invoice_id" TEXT;

-- DropTable
DROP TABLE "receipts";

-- DropEnum
DROP TYPE "RECEIPT_STATUS";

-- DropEnum
DROP TYPE "RECEIPT_TYPE";

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tag" TEXT,
    "type" "INVOICE_TYPE" NOT NULL DEFAULT 'paid',
    "amount" INTEGER NOT NULL,
    "status" "INVOICE_STATUS" NOT NULL DEFAULT 'success',
    "snapshot" JSONB NOT NULL,
    "company_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tag_key" ON "invoices"("tag");

-- CreateIndex
CREATE INDEX "invoices_order_id_idx" ON "invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_company_id_tag_key" ON "invoices"("company_id", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_invoice_id_key" ON "transactions"("invoice_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
