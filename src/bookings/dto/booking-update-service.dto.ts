import { Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import { BookingServiceOverrideDto } from "src/orders/dto/calculate-price.dto";

export class UpdateBookingServicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceOverrideDto)
  services!: BookingServiceOverrideDto[];
}
