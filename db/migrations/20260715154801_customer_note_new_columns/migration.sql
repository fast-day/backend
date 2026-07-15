/*
  Warnings:

  - Added the required column `name` to the `customer_note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tag` to the `customer_note` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CUSTOMER_NOTE_TAG" AS ENUM ('new', 'general');

-- AlterTable
ALTER TABLE "customer_note" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "tag" "CUSTOMER_NOTE_TAG" NOT NULL;
