/*
  Warnings:

  - A unique constraint covering the columns `[public_code]` on the table `locations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "public_code" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "locations_public_code_key" ON "locations"("public_code");
