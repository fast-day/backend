import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({
    example: "user@example.com",
    required: true,
    description: "Email пользователя",
  })
  @IsString()
  @IsEmail()
  @IsNotEmpty({ message: "Обязательное поле" })
  email!: string;

  @ApiProperty({
    example: "+7 999 999 99 99",
    required: true,
    description: "Телефон",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  @IsNotEmpty({ message: "Обязательное поле" })
  phone!: string;

  @ApiProperty({ example: "Иван", required: true, description: "Имя" })
  @IsString()
  @IsNotEmpty({ message: "Обязательное поле" })
  first_name!: string;

  @ApiProperty({ example: "Иванов", required: true, description: "Фамилия" })
  @IsString()
  @IsNotEmpty({ message: "Обязательное поле" })
  last_name!: string;

  @ApiProperty({ example: "12345678", required: true, description: "Пароль" })
  @IsString()
  @MinLength(8, { message: "Пароль должен быть не меньше 8 символов" })
  @IsNotEmpty({ message: "Придумайте пароль" })
  password!: string;
}
