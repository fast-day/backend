import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class BookingServiceOverrideDto {
  @IsUUID()
  booking_service_id!: string;

  @IsInt()
  @Min(1)
  count!: number;
}

export class CalculatePriceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceOverrideDto)
  services!: BookingServiceOverrideDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;
}
