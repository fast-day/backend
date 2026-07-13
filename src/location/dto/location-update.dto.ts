import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from "class-validator";
import { UpdateAddressDto } from "src/address/dto/update.dto";

export class LocationUpdateDto extends UpdateAddressDto {
  @ApiProperty({
    example: "Яндекс",
    required: false,
    description: "Название",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example:
      "Штаб-квартира одной из крупнейших технологических компаний России.",
    required: false,
    description: "Описание",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: "8 999 999 99 99",
    required: false,
    description: "Номер телефона",
  })
  @IsPhoneNumber("RU")
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: "Активна",
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({
    example: ["WiFi", "Кофе", "Печеньки"],
    required: false,
    description: "Комфорт",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  comfort?: string[];

  @ApiProperty({
    example: ["Категория 1", "Категория 2", "Категория 3"],
    required: false,
    description: "Категории",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  category?: string[];
}

export class LocationUpdateResponseDto {
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
}
