import { ApiProperty } from "@nestjs/swagger";
import { CURRENCY } from "@prisma/client";
import { IsEnum, IsString, IsUUID } from "class-validator";

export class CreateCompanyDto {
  @ApiProperty({
    example: "Яндекс",
    required: true,
    description: "Название компании",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "RUB",
    required: true,
    description: "Валюта",
  })
  @IsString()
  currency!: CURRENCY;

  // @ApiProperty({
  //   example: "ул. Вайнера",
  //   required: false,
  //   description: "Адрес",
  // })
  // @IsString()
  // @IsOptional()
  // street?: string;

  // @ApiProperty({
  //   example: "д. 15",
  //   required: false,
  //   description: "Адрес",
  // })
  // @IsString()
  // @IsOptional()
  // house?: string;

  // @ApiProperty({
  //   example: "Екатеринбург",
  //   required: true,
  //   description: "Город",
  // })
  // @IsString()
  // city!: string;

  // @ApiProperty({
  //   example: "125075",
  //   required: false,
  //   description: "Почтовый индекс",
  // })
  // @IsString()
  // @IsOptional()
  // post_code?: string;

  // @ApiProperty({
  //   example: "Россия",
  //   required: true,
  //   description: "Страна",
  // })
  // @IsString()
  // country!: string;

  // @ApiProperty({
  //   example: "Свердловская область",
  //   required: true,
  //   description: "Регион/область",
  // })
  // @IsString()
  // region!: string;

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

  // @ApiProperty({
  //   example: 56.838933,
  //   required: true,
  //   description: "Широта",
  // })
  // @IsNumber({ maxDecimalPlaces: 6 })
  // lat!: string;

  // @ApiProperty({
  //   example: 60.595278,
  //   required: true,
  //   description: "Долгота",
  // })
  // @IsNumber({ maxDecimalPlaces: 6 })
  // lng!: string;

  // @ApiProperty({
  //   example: 10,
  //   required: true,
  //   description: "ID специализации",
  // })
  // @IsNumber()
  // specialization!: number;

  // @ApiProperty({
  //   example: 1,
  //   required: true,
  //   description: "ID индустрии",
  // })
  // @IsNumber()
  // industry!: number;
}

export class CreateCompanyResponseDto {
  @ApiProperty({
    example: "97786513-20f0-434d-a9fe-b59b78f60e6d",
    description: "ID компании",
  })
  @IsUUID()
  @IsString()
  id!: string;

  @ApiProperty({
    example: "Яндекс",
    description: "Название компании",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "RUB",
    required: true,
    description: "Валюта",
  })
  @IsEnum(CURRENCY)
  currency!: CURRENCY;
}
