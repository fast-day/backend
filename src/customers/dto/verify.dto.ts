import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsNumber, IsPhoneNumber, IsString } from "class-validator";

export class VerifyCodeDto {
  @ApiProperty({
    example: "+7 (999) 999-99-99",
    description: "Номер телефона",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  @IsNotEmpty({ message: "Обязательное поле" })
  phone!: string;

  @ApiProperty({
    example: 2610,
    description: "Код (4 цифры)",
  })
  @IsNumber()
  code!: number;
}

export class VerifyCodeResponseDto {
  @ApiProperty({
    example: "Oifdkjf1NiIs4fsInR5cCsdakskpX...",
    description: "Токен",
  })
  @IsString()
  access_token!: string;

  @ApiProperty({
    example: "9vld446ad3778c02483dsdd84riof86...",
    description: "Рефреш токен",
  })
  @IsString()
  refresh_token!: number;
}
