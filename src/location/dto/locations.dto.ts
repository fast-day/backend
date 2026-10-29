import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class LocationAddressDto {
  @ApiProperty({
    example: "ул. Льва Толстого, д. 16/Санкт-Петербург/Санкт-Петербург/Россия",
    description: "Полный адрес локации",
  })
  @IsString()
  full_address!: string;

  @ApiProperty({
    example: "ул. Вайнера",
    required: false,
    description: "Адрес",
  })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({
    example: "д. 15",
    required: false,
    description: "Адрес",
  })
  @IsString()
  @IsOptional()
  house?: string | null;

  @ApiProperty({
    example: "Екатеринбург",
    required: true,
    description: "Город",
  })
  @IsString()
  @IsOptional()
  city?: string | null;

  @ApiProperty({
    example: "Свердловская область",
    required: true,
    description: "Регион/область",
  })
  @IsString()
  @IsOptional()
  region?: string | null;

  @ApiProperty({
    example: "Россия",
    required: true,
    description: "Страна",
  })
  @IsString()
  @IsOptional()
  country?: string | null;
}

export class LocationsDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "ID локации",
  })
  @IsUUID()
  @IsString()
  id!: string;

  @ApiProperty({
    example: "Яндекс",
    required: true,
    description: "Название",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "71657a704cb3726f8f1116879bd6f908.jpg",
    required: true,
    description: "Иконка",
  })
  @IsString()
  @IsOptional()
  avatar?: string | null;

  @ApiProperty({
    example:
      "Штаб-квартира одной из крупнейших технологических компаний России.",
    required: false,
    description: "Описание",
  })
  @IsString()
  @IsOptional()
  description!: string | null;

  @ApiProperty({
    example: "8 999 999 99 99",
    required: true,
    description: "Номер телефона",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({
    example: false,
    required: false,
    description: "Статус",
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

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
    },
    description: "Адрес",
  })
  @ValidateNested({ each: true })
  @Type(() => LocationAddressDto)
  address!: LocationAddressDto;
}
