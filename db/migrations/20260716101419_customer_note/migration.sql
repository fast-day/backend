/*
  Warnings:

  - The values [new] on the enum `CUSTOMER_NOTE_TAG` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CUSTOMER_NOTE_TAG_new" AS ENUM ('session', 'progress', 'plan', 'important', 'administrative', 'general');
ALTER TABLE "public"."customer_note" ALTER COLUMN "tag" DROP DEFAULT;
ALTER TABLE "customer_note" ALTER COLUMN "tag" TYPE "CUSTOMER_NOTE_TAG_new" USING ("tag"::text::"CUSTOMER_NOTE_TAG_new");
ALTER TYPE "CUSTOMER_NOTE_TAG" RENAME TO "CUSTOMER_NOTE_TAG_old";
ALTER TYPE "CUSTOMER_NOTE_TAG_new" RENAME TO "CUSTOMER_NOTE_TAG";
DROP TYPE "public"."CUSTOMER_NOTE_TAG_old";
ALTER TABLE "customer_note" ALTER COLUMN "tag" SET DEFAULT 'general';
COMMIT;

-- AlterTable
ALTER TABLE "customer_note" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "tag" DROP NOT NULL,
ALTER COLUMN "tag" SET DEFAULT 'general';
