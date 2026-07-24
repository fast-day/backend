import { BookingStatus, BookingType } from "@prisma/client";
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class BookingCreateServiceUserDto {
  @ApiProperty({
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID сотрудника",
    required: true,
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    example: "Кирилл",
    description: "Имя сотрудника",
    required: false,
  })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiProperty({
    example: "Колесников",
    description: "Фамилия сотрудника",
    required: false,
  })
  @IsString()
  @IsOptional()
  last_name?: string;
}

export class BookingCreateServiceDto {
  @ApiProperty({
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID услуги",
    required: true,
  })
  @IsUUID()
  service_id!: string;

  @ApiProperty({
    example: 999,
    description: "Цена услуги",
    required: true,
  })
  @IsNumber()
  price!: number;

  @ApiProperty({
    example: 1,
    description: "Кол-во услуг",
    required: true,
  })
  @IsNumber()
  count!: number;

  @ApiProperty({
    example: "2026-07-22T10:00",
    description: "Дата и время начала в формате ISO 8601",
    required: true,
  })
  @IsISO8601()
  start_time!: string;

  @ApiProperty({
    example: 120,
    description: "Длительность",
    required: true,
  })
  @IsNumber()
  duration!: number;

  @ApiProperty({
    type: [BookingCreateServiceUserDto],
    example: [
      {
        id: "5d48c70b-c018-4e93-8673-b6be4f4fad93",
        first_name: "Кирилл",
        last_name: "Колесников",
      },
    ],
    description: "Список выбранных сотрудников",
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BookingCreateServiceUserDto)
  users!: BookingCreateServiceUserDto[];
}

export class BookingCreateCustomerDto {
  @ApiProperty({
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID клиента",
    required: true,
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    example: "Иван",
    description: "Имя клиента",
    required: false,
  })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiProperty({
    example: "Иванов",
    description: "Фамилия клиента",
    required: true,
  })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiProperty({
    example: "+7 (999) 999-99-99",
    description: "Номер клиента",
    required: false,
  })
  @ApiProperty({ example: "+7 (999) 999-99-99" })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;
}

export class BookingCreateDto {
  @ApiProperty({
    type: [BookingCreateServiceDto],
    example: [
      {
        service_id: "5d48c70b-c018-4e93-8673-b6be4f4fad93",
        price: 999,
        count: 1,
        start_time: "2026-07-22T10:00",
        duration: 120,
        users: [
          {
            id: "5d48c70b-c018-4e93-8673-b6be4f4fad93",
            first_name: "Кирилл",
            last_name: "Колесников",
          },
        ],
      },
    ],
    description: "Список выбранных услуг",
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BookingCreateServiceDto)
  services!: BookingCreateServiceDto[];

  @ApiProperty({
    example: [
      {
        id: "5d48c70b-c018-4e93-8673-b6be4f4fad93",
        first_name: "Кирилл",
        last_name: "Колесников",
        phone: "+7 (999) 999-99-99",
      },
    ],
    description: "Список клиентов записанных на услугу",
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BookingCreateCustomerDto)
  customers!: BookingCreateCustomerDto[];

  @ApiProperty({
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
    required: true,
  })
  @IsUUID()
  location_id!: string;

  @ApiProperty({
    example: "Комментарий...",
    description: "Комментарий",
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    enum: BookingStatus,
    example: BookingStatus.confirmed,
    description: "Статус бронирования",
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    enum: BookingType,
    example: BookingType.online,
    description: "Тип бронирования (онлайн | офлайн)",
  })
  @IsEnum(BookingType)
  @IsOptional()
  type?: BookingType;
}
