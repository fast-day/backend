import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsPhoneNumber } from "class-validator";

export class SendCodeDto {
  @ApiProperty({
    example: "+7 (999) 999-99-99",
    description: "Номер телефона",
  })
  @IsPhoneNumber("RU")
  @IsNotEmpty({ message: "Обязательное поле" })
  phone!: string;
}

export class SendCodeResponseDto {
  @ApiProperty({
    example: true,
    description: "Статус",
  })
  @IsBoolean()
  success!: boolean;
}
