/*
  Warnings:

  - You are about to drop the column `has_seed_product_tour` on the `users` table. All the data in the column will be lost.
  - Changed the type of `content` on the `customer_note` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "customer_note" DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "onboarding_progress" ALTER COLUMN "is_dismissed" SET DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "is_deposit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "service_prices" ADD COLUMN     "cancellation_deadline_hours" INTEGER DEFAULT 24,
ADD COLUMN     "deposit_percent" INTEGER,
ADD COLUMN     "requires_deposit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "has_seed_product_tour",
ADD COLUMN     "has_seen_product_tour" BOOLEAN NOT NULL DEFAULT false;
