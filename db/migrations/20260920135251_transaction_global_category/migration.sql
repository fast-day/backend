/*
  Warnings:

  - The values [service,refund] on the enum `TRANSACTION_CATEGORY_TYPE` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `icon` to the `transaction_categories` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TRANSACTION_CATEGORY_ICON" AS ENUM ('coin', 'gift', 'handbag', 'layers', 'pie', 'wallet', 'repeat', 'recipe', 'reply', 'cart', 'shop', 'stars', 'tools', 'card', 'undo', 'increase');

-- AlterEnum
BEGIN;
CREATE TYPE "TRANSACTION_CATEGORY_TYPE_new" AS ENUM ('system', 'custom');
ALTER TABLE "public"."transaction_categories" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "transaction_categories" ALTER COLUMN "type" TYPE "TRANSACTION_CATEGORY_TYPE_new" USING ("type"::text::"TRANSACTION_CATEGORY_TYPE_new");
ALTER TYPE "TRANSACTION_CATEGORY_TYPE" RENAME TO "TRANSACTION_CATEGORY_TYPE_old";
ALTER TYPE "TRANSACTION_CATEGORY_TYPE_new" RENAME TO "TRANSACTION_CATEGORY_TYPE";
DROP TYPE "public"."TRANSACTION_CATEGORY_TYPE_old";
ALTER TABLE "transaction_categories" ALTER COLUMN "type" SET DEFAULT 'custom';
COMMIT;

-- DropForeignKey
ALTER TABLE "transaction_categories" DROP CONSTRAINT "transaction_categories_company_id_fkey";

-- AlterTable
ALTER TABLE "transaction_categories" ADD COLUMN     "icon" "TRANSACTION_CATEGORY_ICON" NOT NULL,
ALTER COLUMN "company_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
