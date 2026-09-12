import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsString } from "class-validator";

export class GetSlotsDto {
  @ApiProperty({
    example: "173828",
    description: "ID Локации",
    required: false,
    default: null,
  })
  @IsString()
  location_id!: number;

  @ApiProperty({
    example: 90,
    description: "Длительность",
    required: false,
    default: null,
  })
  @IsString()
  duration!: string;

  @ApiProperty({
    example: "12-09-2026",
    description: "Дата в формате YYYY-MM-DD",
    required: true,
  })
  @IsDateString()
  start_date!: string;

  @ApiProperty({
    example: "12-09-2026",
    description: "Дата в формате YYYY-MM-DD",
    required: true,
  })
  @IsDateString()
  end_date!: string;
}
