-- AlterEnum
ALTER TYPE "MarkEnum" ADD VALUE 'primary';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "mark" "MarkEnum" DEFAULT 'orange',
ALTER COLUMN "status" SET DEFAULT 'new';

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'unpaid';

-- CreateTable
CREATE TABLE "order_booking_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_booking_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_booking_history_booking_id_order_id_idx" ON "order_booking_history"("booking_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_booking_history_order_id_booking_id_key" ON "order_booking_history"("order_id", "booking_id");

-- AddForeignKey
ALTER TABLE "order_booking_history" ADD CONSTRAINT "order_booking_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_booking_history" ADD CONSTRAINT "order_booking_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
