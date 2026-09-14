/*
  Warnings:

  - The primary key for the `transaction_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `transaction_categories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `category_id` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_category_id_fkey";

-- AlterTable
ALTER TABLE "transaction_categories" DROP CONSTRAINT "transaction_categories_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "category_id",
ADD COLUMN     "category_id" INTEGER;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
