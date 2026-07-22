import { OrderStatus, PaymentType } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class BookingCreateOrderDto {
  @ApiProperty({
    enum: PaymentType,
    example: PaymentType.credit_card,
    description: "Способ оплаты",
    required: true,
  })
  @IsEnum(PaymentType)
  @IsOptional()
  payment_method?: PaymentType;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.paid,
    description: "Статус заказа",
    required: true,
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
