import { ApiProperty } from "@nestjs/swagger";
import { BookingStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { GetQueryDto } from "src/shared/dto/query.dto";
import { BookingSortOrder } from "./get-customer-bookings.dto";

export class GetBookingsDto extends GetQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customer?: string;

  // @ApiProperty({ required: false })
  // @IsOptional()
  // @IsString()
  // customer_phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  employee?: string;

  // @ApiProperty({ required: false })
  // @IsOptional()
  // @IsString()
  // employee_phone?: string;

  // @ApiProperty({ required: false })
  // @IsOptional()
  // @IsString()
  // service?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ required: false, enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({ required: false, enum: BookingSortOrder })
  @IsOptional()
  @IsEnum(BookingSortOrder)
  sort?: BookingSortOrder;
}

export class GetCalendarBookingsDto extends GetQueryDto {
  @ApiProperty({ required: true })
  @IsString()
  location!: string;

  @ApiProperty({ required: true })
  @IsDateString()
  start_date!: string;

  @ApiProperty({ required: true })
  @IsDateString()
  end_date!: string;
}

export { BookingSortOrder };
