import { ApiProperty } from "@nestjs/swagger";
import { BookingStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class BookingStatusDto {
  @ApiProperty({
    enum: BookingStatus,
    example: BookingStatus.new,
    description: "Новый статус бронирования",
    required: true,
  })
  @IsEnum(BookingStatus)
  status!: BookingStatus;
}
