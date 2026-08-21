import { Module } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { BookingsController } from "./bookings.controller";
import { BookingsPublicController } from "./bookings-public.controller";
import { BookingsPublicService } from "./bookings-public.service";

@Module({
  controllers: [BookingsController, BookingsPublicController],
  providers: [BookingsService, BookingsPublicService],
  exports: [BookingsService],
})
export class BookingsModule {}
