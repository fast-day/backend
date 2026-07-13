import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateAddressDto {
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
  house?: string;

  @ApiProperty({
    example: "Екатеринбург",
    required: true,
    description: "Город",
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    example: "125075",
    required: false,
    description: "Почтовый индекс",
  })
  @IsString()
  @IsOptional()
  post_code?: string;

  @ApiProperty({
    example: "Россия",
    required: true,
    description: "Страна",
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    example: "Свердловская область",
    required: true,
    description: "Регион/область",
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({
    example: "Asia/Yekaterinburg",
    required: true,
    description: "Часовой пояс",
  })
  @IsString()
  timezone!: string;

  @ApiProperty({
    example: "Asia/Yekaterinburg",
    required: true,
    description: "+05:00",
  })
  @IsString()
  timezone_offset!: string;

  @ApiProperty({
    example: 56.838933,
    required: true,
    description: "Широта",
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsOptional()
  lat?: string;

  @ApiProperty({
    example: 60.595278,
    required: true,
    description: "Долгота",
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsOptional()
  lng?: string;
}

export class CreateLocationResponseDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "ID локации",
  })
  @IsUUID()
  @IsString()
  location_id!: string;

  @ApiProperty({
    example: "Яндекс",
    description: "Название локации",
  })
  @IsString()
  name!: string;
}
