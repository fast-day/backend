import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsPhoneNumber } from "class-validator";

export class SendCodeDto {
  @ApiProperty({
    example: "+7 (999) 999-99-99",
    description: "Номер телефона",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
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
