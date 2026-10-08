import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsISO8601,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";

export type Interval = {
  start: string;
  end: string;
};

export class IntervalDto {
  @ApiProperty({
    example: "2026-07-22T10:00",
    description: "Дата и время начала в формате ISO 8601",
    required: true,
  })
  @IsISO8601()
  start!: string;

  @ApiProperty({
    example: "2026-07-22T10:00",
    description: "Дата и время начала в формате ISO 8601",
    required: true,
  })
  @IsISO8601()
  end!: string;
}

export class ScheduleDto {
  @ApiProperty({
    example: "24-11-2025",
    description: "Дата в формате YYYY-MM-DD",
    required: true,
  })
  // @Matches(/^\d{2}-\d{2}-\d{4}$/, {
  //   message: "Дата должна быть в формате DD-MM-YYYY",
  // })
  // date!: string;
  @IsDateString()
  date!: string;

  @ApiProperty({
    type: [IntervalDto],
    example: [{ start: "10:00", end: "22:15" }],
    description: "Массив интервалов рабочего времени",
    required: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntervalDto)
  intervals!: IntervalDto[];

  @ApiProperty({
    example: "89e1ff87-f273-47a4-ab34-a90c716c59f0",
    description: "ID сотрудника",
    required: true,
  })
  @IsString()
  user_id!: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ScheduleSlotDto {
  @Matches(DATE_RE) date!: string;
  @Matches(TIME_RE) start!: string;
  @Matches(TIME_RE) end!: string;
}

export class BulkScheduleDto {
  @IsString() user_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots!: ScheduleSlotDto[];
}

export class BulkDayOffDto {
  @IsString() user_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(366)
  @Matches(DATE_RE, { each: true })
  dates!: string[];
}
