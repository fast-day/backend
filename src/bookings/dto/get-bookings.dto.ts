import { ApiProperty } from "@nestjs/swagger";
import { BookingStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { GetQueryDto } from "src/shared/dto/query.dto";

export enum BookingSortOrder {
  NEWEST = "newest",
  OLDEST = "oldest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
}

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
