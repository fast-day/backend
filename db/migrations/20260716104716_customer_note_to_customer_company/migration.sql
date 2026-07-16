/*
  Warnings:

  - You are about to drop the column `customer_id` on the `customer_note` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `customer_note` table. All the data in the column will be lost.
  - Added the required column `customer_company_id` to the `customer_note` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "customer_note" DROP CONSTRAINT "customer_note_customer_id_fkey";

-- AlterTable
ALTER TABLE "customer_note" DROP COLUMN "customer_id",
DROP COLUMN "updated_at",
ADD COLUMN     "customer_company_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "customer_note" ADD CONSTRAINT "customer_note_customer_company_id_fkey" FOREIGN KEY ("customer_company_id") REFERENCES "customer_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
