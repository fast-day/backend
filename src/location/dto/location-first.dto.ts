import { ApiProperty } from "@nestjs/swagger/dist/decorators";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";

export class LocationAddressMapDto {
  @ApiProperty({
    example: 56.838933,
    required: true,
    description: "Широта",
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  lat!: string;

  @ApiProperty({
    example: 60.595278,
    required: true,
    description: "Долгота",
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  lng!: string;
}
export class LocationAddressDto {
  @ApiProperty({
    example: "ул. Льва Толстого, д. 16/Санкт-Петербург/Санкт-Петербург/Россия",
    description: "Полный адрес локации",
  })
  @IsString()
  full_address!: string;

  @ApiProperty({
    example: "ул. Вайнера",
    description: "Адрес",
  })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({
    example: "д. 15",
    description: "Адрес",
  })
  @IsString()
  @IsOptional()
  house?: string | null;

  @ApiProperty({
    example: "Екатеринбург",
    description: "Город",
  })
  @IsString()
  @IsOptional()
  city?: string | null;

  @ApiProperty({
    example: "Свердловская область",
    description: "Регион/область",
  })
  @IsString()
  @IsOptional()
  region?: string | null;

  @ApiProperty({
    example: "Россия",
    description: "Страна",
  })
  @IsString()
  @IsOptional()
  country?: string | null;

  @ApiProperty({
    example: "125075",
    description: "Почтовый индекс",
  })
  @IsString()
  @IsOptional()
  post_code?: string;

  @ApiProperty({
    example: {
      lat: 56.838933,
      lng: 60.595278,
    },
    description: "Координаты",
  })
  @ValidateNested()
  @Type(() => LocationAddressMapDto)
  map!: LocationAddressMapDto;
}

export class LocationFirstUsers {
  @ApiProperty({
    example: "97786513-20f0-434d-a9fe-b59b78f60e6d",
    description: "ID сотрудника",
  })
  @IsUUID()
  @IsString()
  id!: string;

  @ApiProperty({
    example: "Бобо",
    description: "Имя ",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "71657a704cb3726f8f1116879bd6f908.jpg",
    description: "Аватар",
  })
  @IsString()
  avatar!: string;
}

export class LocationFirstDto {
  @ApiProperty({
    example: "97786513-20f0-434d-a9fe-b59b78f60e6d",
    description: "ID локации",
  })
  @IsUUID()
  @IsString()
  id!: string;

  @ApiProperty({
    example: "Яндекс",
    description: "Название",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "71657a704cb3726f8f1116879bd6f908.jpg",
    description: "Иконка",
  })
  @IsString()
  @IsOptional()
  avatar?: string | null;

  @ApiProperty({
    example: false,
    required: false,
    description: "Статус",
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({
    example:
      "Штаб-квартира одной из крупнейших технологических компаний России.",
    description: "Описание",
  })
  @IsString()
  @IsOptional()
  description!: string | null;

  @ApiProperty({
    example: "Asia/Yekaterinburg",
    required: true,
    description: "Часовой пояс",
  })
  @IsString()
  timezone!: string;

  @ApiProperty({
    example: 2,
    description: "Количество пользователей",
  })
  @IsNumber()
  user_count!: number;

  @ApiProperty({
    example: [
      {
        id: "90dcc18b-44c1-4776-88cb-aa576f338de6",
        name: "Боб",
        avatar:
          "https://storage.domain.ru/71657a704cb3726f8f1116879bd6f908.jpg",
      },
      {
        id: "dba7afb9-4002-47c1-a4a1-2dd14aed11d6",
        name: "Толик",
        avatar: null,
      },
    ],
    description: "Сотрудники",
  })
  @IsArray()
  users!: LocationFirstUsers[];

  @ApiProperty({
    example: "8 999 999 99 99",
    description: "Номер телефона",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({
    example: ["Категория 1", "Категория 2", "Категория 3"],
    required: false,
    description: "Категории",
  })
  @IsArray()
  @IsString({ each: true })
  category!: string[];

  @ApiProperty({
    example: ["WiFi", "Кофе", "Печеньки"],
    required: false,
    description: "Комфорт",
  })
  @IsArray()
  @IsString({ each: true })
  comfort!: string[];

  @ApiProperty({
    example: {
      full_address:
        "ул. Льва Толстого, д. 16/Санкт-Петербург/Санкт-Петербург/Россия",
      street: "ул. Льва Толстого",
      house: "д. 16",
      city: "Санкт-Петербург",
      region: "Санкт-Петербург",
      country: "Россия",
      post_code: null,
      map: { lat: 56.838933, lng: 60.595278 },
    },
    description: "Адрес",
  })
  @ValidateNested()
  @Type(() => LocationAddressDto)
  address!: LocationAddressDto;
}
