-- CreateEnum
CREATE TYPE "RECEIPT_TYPE" AS ENUM ('charge', 'refund');

-- CreateEnum
CREATE TYPE "RECEIPT_STATUS" AS ENUM ('success', 'failed');

-- CreateEnum
CREATE TYPE "TRANSACTION_TYPE" AS ENUM ('earning', 'refund_deduction');

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "type" "RECEIPT_TYPE" NOT NULL DEFAULT 'charge',
    "amount" INTEGER NOT NULL,
    "status" "RECEIPT_STATUS" NOT NULL DEFAULT 'success',
    "snapshot" JSONB NOT NULL,
    "order_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "TRANSACTION_TYPE" NOT NULL DEFAULT 'earning',
    "amount" INTEGER NOT NULL,
    "company_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "receipt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipts_order_id_idx" ON "receipts"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_receipt_id_key" ON "transactions"("receipt_id");

-- CreateIndex
CREATE INDEX "transactions_company_id_created_at_idx" ON "transactions"("company_id", "created_at");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
