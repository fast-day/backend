import { PaymentType } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export class OrderPaidDto {
  @IsEnum(PaymentType)
  payment_method!: PaymentType;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsNumber()
  @IsOptional()
  subtotal?: number;
}
