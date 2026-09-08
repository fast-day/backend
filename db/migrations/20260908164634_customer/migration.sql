/*
  Warnings:

  - A unique constraint covering the columns `[public_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "customer_companies" ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "public_code" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_public_code_key" ON "users"("public_code");
