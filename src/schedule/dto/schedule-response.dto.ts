import { ApiProperty } from "@nestjs/swagger";
import { IntervalDto } from "./schedule.dto";

export class ScheduleResponseDto {
  @ApiProperty({
    example: 1,
    description: "ID расписания",
  })
  id!: number;

  @ApiProperty({
    example: "31-12-2025",
    description: "Дата в формате DD-MM-YYYY",
  })
  date!: string;

  @ApiProperty({
    type: [IntervalDto],
    example: [{ start: "10:00", end: "22:15" }],
    description: "Массив интервалов рабочего времени",
  })
  intervals!: IntervalDto[];
}

export class UserInfoDto {
  @ApiProperty({
    example: "9e282713-cba7-4d49-a431-a6f00e3d4635",
    description: "ID пользователя",
  })
  id!: string;

  @ApiProperty({
    example: "Kirill Kolesnikov",
    description: "Имя пользователя",
  })
  name!: string;

  @ApiProperty({
    example: "8 (961) 328-58-27",
    description: "Телефон",
  })
  phone!: string;

  @ApiProperty({
    example: null,
    description: "Должность",
    nullable: true,
  })
  position!: string | null;

  @ApiProperty({
    example: false,
    description: "Заблокирован ли пользователь",
  })
  is_banned!: boolean;
}

export class ScheduleDetailResponseDto extends ScheduleResponseDto {
  @ApiProperty({
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
  })
  location_id!: string;

  @ApiProperty({
    type: UserInfoDto,
    description: "Информация о сотруднике",
  })
  user!: UserInfoDto;
}

export class CreateScheduleResponseDto {
  @ApiProperty({
    example: 1,
    description: "ID созданного расписания",
  })
  id!: number;

  @ApiProperty({
    example: "31-12-2025",
    description: "Дата в формате DD-MM-YYYY",
  })
  date!: string;
}

export class BulkScheduleResponseDto {
  @ApiProperty({ example: ["2026-10-02", "2026-10-09"] })
  dates!: string[];

  @ApiProperty({ example: 2, description: "Сколько расписаний создано" })
  created!: number;

  @ApiProperty({
    example: 1,
    description: "Сколько старых расписаний заменено",
  })
  replaced!: number;
}

export class BulkDayOffResponseDto {
  @ApiProperty({ example: ["2026-10-02", "2026-10-09"] })
  dates!: string[];

  @ApiProperty({ example: 2, description: "Сколько расписаний удалено" })
  deleted!: number;
}
