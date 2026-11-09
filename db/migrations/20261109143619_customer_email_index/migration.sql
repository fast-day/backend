-- DropIndex
DROP INDEX "customers_email_key";

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");
