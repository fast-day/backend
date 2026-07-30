/*
  Warnings:

  - A unique constraint covering the columns `[tag]` on the table `receipts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "tag" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "receipts_tag_key" ON "receipts"("tag");
