import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { InvoicesModule } from "src/invoices/invoices.module";
import { BookingsModule } from "src/bookings/bookings.module";

@Module({
  imports: [InvoicesModule, BookingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
