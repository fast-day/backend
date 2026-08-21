import { OrderStatus, PaymentType } from "@prisma/client";
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { BookingServiceOverrideDto } from "./calculate-price.dto";
import { Type } from "class-transformer";

export class OrderCreateDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(PaymentType)
  @IsOptional()
  payment_method?: PaymentType;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @IsString({ each: true })
  booking_ids?: string[];
}

export class DraftOrderDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(PaymentType)
  @IsOptional()
  payment_method?: PaymentType;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceOverrideDto)
  @IsOptional()
  services?: BookingServiceOverrideDto[];
}
