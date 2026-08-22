import { Module } from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { BookingsController } from "./bookings.controller";
import { BookingsPublicController } from "./bookings-public.controller";
import { BookingsPublicService } from "./bookings-public.service";
import { BookingValidationService } from "./validation/booking-validation.service";
import { CustomerChecksService } from "src/customers/customer-checks.service";

@Module({
  controllers: [BookingsController, BookingsPublicController],
  providers: [
    BookingsService,
    BookingsPublicService,
    BookingValidationService,
    CustomerChecksService,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
