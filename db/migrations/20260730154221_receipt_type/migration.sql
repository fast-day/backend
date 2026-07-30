/*
  Warnings:

  - The values [charge,refund] on the enum `RECEIPT_TYPE` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RECEIPT_TYPE_new" AS ENUM ('paid', 'refunded');
ALTER TABLE "public"."receipts" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "receipts" ALTER COLUMN "type" TYPE "RECEIPT_TYPE_new" USING ("type"::text::"RECEIPT_TYPE_new");
ALTER TYPE "RECEIPT_TYPE" RENAME TO "RECEIPT_TYPE_old";
ALTER TYPE "RECEIPT_TYPE_new" RENAME TO "RECEIPT_TYPE";
DROP TYPE "public"."RECEIPT_TYPE_old";
ALTER TABLE "receipts" ALTER COLUMN "type" SET DEFAULT 'paid';
COMMIT;

-- AlterTable
ALTER TABLE "receipts" ALTER COLUMN "type" SET DEFAULT 'paid';
