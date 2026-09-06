/*
  Warnings:

  - A unique constraint covering the columns `[public_code]` on the table `services` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "services" ADD COLUMN     "public_code" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "services_public_code_key" ON "services"("public_code");
