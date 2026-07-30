import { ApiProperty } from "@nestjs/swagger";
import { DATE_TYPE, DAYS, MarkEnum, ServiceType } from "@prisma/client";
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class ServiceCreateDto {
  @ApiProperty({
    example: "Дев",
    description: "Название",
    required: true,
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "red | orange | green | blue | purple | teal | pink",
    description: "цвет (обозначение)",
  })
  @IsEnum(MarkEnum)
  mark!: MarkEnum;

  @ApiProperty({
    example: 1440,
    description: "Длительность",
  })
  @IsNumber()
  duration!: number;

  @ApiProperty({
    example: "online | offline",
    description: "Статус",
  })
  @IsEnum(ServiceType)
  type!: ServiceType;

  // @ApiProperty({
  //   example: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  //   description: "Рабочие дни",
  // })
  // @IsArray()
  // @IsEnum(DAYS, { each: true })
  // days!: DAYS[];

  @ApiProperty({
    example: "category",
    description: "Категория (не обязательно)",
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  // @ApiProperty({
  //   example: "07:00",
  //   description: "Время начала продаж",
  // })
  // @IsString()
  // time_start: string;

  // @ApiProperty({
  //   example: "09:00",
  //   description: "Время окончания продаж",
  // })
  // @IsString()
  // time_end: string;

  @ApiProperty({
    example: 1999,
    description: "Стоимость",
  })
  @IsNumber()
  price!: number;

  @ApiProperty({
    example: 299,
    description: "Себестоимость (не обязательно)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  cost_price?: number;

  @ApiProperty({
    example: 1299,
    description: "Цена со скидкой (не обязательно)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  discount_price?: number;

  @ApiProperty({
    example: "days | dates",
    description:
      "По какому принципу работает услуга (не обязательно) default: days",
    required: false,
  })
  @IsEnum(DATE_TYPE)
  date_type?: DATE_TYPE;

  @ApiProperty({
    example: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    description: "По каким дням работает скидка (не обязательно)",
    required: false,
  })
  @IsArray()
  @IsEnum(DAYS, { each: true })
  @IsOptional()
  discount_days?: DAYS[];

  @ApiProperty({
    example: "09:00",
    description: "Время начала скидок",
    required: false,
  })
  @IsString()
  @IsOptional()
  discount_time_start?: string;

  @ApiProperty({
    example: "15:00",
    description: "Время окончания скидок",
    required: false,
  })
  @IsString()
  @IsOptional()
  discount_time_end?: string;
}

export class ServiceCreateResponseDto {
  @ApiProperty({
    example: "5d48c70b-c018-4e93-8673-b6be4f4fad93",
    description: "ID",
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    example: "DEV",
    description: "Название",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "red | orange | green | blue | purple | teal | pink | primary",
    description: "цвет (обозначение)",
  })
  @IsEnum(MarkEnum)
  mark!: MarkEnum;

  @ApiProperty({
    example: 1440,
    description: "Длительность",
  })
  @IsNumber()
  duration!: number;

  @ApiProperty({
    example: "online | offline",
    description: "Статус",
  })
  @IsEnum(ServiceType)
  type!: ServiceType;
}

export class ServicesDto {
  @ApiProperty({
    example: "5d48c70b-c018-4e93-8673-b6be4f4fad93",
    description: "ID",
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    example: "Дев",
    description: "Название",
    required: true,
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "dev",
    description: "Публичное имя",
    required: false,
  })
  @IsString()
  @IsOptional({ each: true })
  public_name?: string;

  @ApiProperty({
    example: null,
    description: "Категория (не обязательно)",
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string | null;

  @ApiProperty({
    example: "red | orange | green | blue | purple | teal | pink",
    description: "цвет (обозначение)",
  })
  @IsEnum(MarkEnum)
  mark!: MarkEnum;

  @ApiProperty({
    example: 1440,
    description: "Длительность",
  })
  @IsNumber()
  duration!: number;

  @ApiProperty({
    example: "online | offline",
    description: "Статус",
  })
  @IsEnum(ServiceType)
  type!: ServiceType;

  @ApiProperty({
    example: 1999,
    description: "Стоимость",
  })
  @IsNumber()
  price!: number;

  @ApiProperty({
    example: 1,
    description: "Количество сотрудников (входящих в услугу)",
  })
  @IsNumber()
  @IsOptional()
  users_length?: string;

  @ApiProperty({
    example: 1,
    description: "Количество локаций (входящих в услугу)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  locations_length?: string;
}
