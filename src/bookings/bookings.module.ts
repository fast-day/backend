import { Module } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { BookingsController } from "./bookings.controller";
import { OrdersModule } from "src/orders/orders.module";
import { BookingsPublicController } from "./bookings-public.controller";
import { BookingsPublicService } from "./bookings-public.service";

@Module({
  imports: [OrdersModule],
  controllers: [BookingsController, BookingsPublicController],
  providers: [BookingsService, BookingsPublicService],
})
export class BookingsModule {}
