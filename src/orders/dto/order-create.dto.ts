import { OrderStatus, PaymentType } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";

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

export class NewOrderCreateDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(PaymentType)
  @IsOptional()
  payment_method?: PaymentType;

  @IsString()
  @IsOptional()
  comment?: string;
}
