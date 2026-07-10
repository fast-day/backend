import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
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
    example: "10:00",
    description: "Время начала в формате HH:MM",
    required: true,
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Время должно быть в формате HH:MM",
  })
  start!: string;

  @ApiProperty({
    example: "22:15",
    description: "Время окончания в формате HH:MM",
    required: true,
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Время должно быть в формате HH:MM",
  })
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
