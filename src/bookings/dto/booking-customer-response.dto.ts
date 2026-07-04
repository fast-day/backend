import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BookingStatus } from "@prisma/client";
import {
  EmployeeInfoDto,
  LocationInfoDto,
  OrderInfoDto,
  ServiceInfoDto,
} from "./booking-response.dto";

export class BookingCustomerResponseDto {
  @ApiProperty({ example: "a81b90e4-5a76-4870-84be-c9732b9b22c1" })
  id!: string;

  @ApiProperty({ example: "Customer API" })
  name!: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.confirmed })
  status!: BookingStatus;

  @ApiProperty({ example: "10:00" })
  start_time?: string;

  @ApiProperty({ example: "12:45" })
  end_time?: string;

  @ApiProperty({ example: "29-10-2025" })
  date!: string;

  @ApiPropertyOptional({ example: null })
  comment?: string | null;

  @ApiProperty({ type: LocationInfoDto })
  location!: LocationInfoDto;

  @ApiProperty({ type: EmployeeInfoDto })
  employee!: EmployeeInfoDto;

  @ApiProperty({ type: ServiceInfoDto })
  service!: ServiceInfoDto;

  @ApiPropertyOptional({ type: OrderInfoDto })
  order?: OrderInfoDto;
}
