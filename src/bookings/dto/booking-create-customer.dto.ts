import { BookingStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { BookingBaseDto } from "./booking-base.dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BookingCreateCustomerOldDto extends BookingBaseDto {
  @ApiProperty({
    example: "x5-retail-group",
    description: "Название компании (slug)",
    required: true,
  })
  @IsString()
  company!: string;

  @ApiProperty({
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
    required: true,
  })
  @IsUUID()
  location_id!: string;

  @ApiPropertyOptional({
    enum: BookingStatus,
    example: BookingStatus.pending,
    description: "Статус бронирования",
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}
