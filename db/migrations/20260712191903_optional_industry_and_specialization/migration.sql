-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT "companies_industry_id_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT "companies_specialization_id_fkey";

-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "specialization_id" DROP NOT NULL,
ALTER COLUMN "industry_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_specialization_id_fkey" FOREIGN KEY ("specialization_id") REFERENCES "specializations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
