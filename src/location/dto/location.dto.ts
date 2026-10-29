import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsPhoneNumber, IsString } from "class-validator";
import { CreateAddressDto } from "src/address/dto/create.dto";

export class LocationDto extends CreateAddressDto {
  @ApiProperty({
    example: "Яндекс",
    required: true,
    description: "Название",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example:
      "Штаб-квартира одной из крупнейших технологических компаний России.",
    required: false,
    description: "Описание",
  })
  @ApiProperty({})
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: "8 999 999 99 99",
    required: true,
    description: "Номер телефона",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  phone!: string;

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
