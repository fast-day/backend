import { Module } from "@nestjs/common";
import { LocationService } from "./location.service";
import { LocationController } from "./location.controller";
import { AddressModule } from "src/address/address.module";
import { ScheduleModule } from "src/schedule/schedule.module";

@Module({
  imports: [AddressModule, ScheduleModule],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
