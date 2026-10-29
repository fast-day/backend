import { ApiProperty } from "@nestjs/swagger";
import { ROLE } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";

export class UserCreateDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty({ message: "Обязательное поле" })
  email!: string;

  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  @IsNotEmpty({ message: "Обязательное поле" })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: "Обязательное поле" })
  first_name!: string;
  last_name!: string;

  @IsString()
  @MinLength(8, { message: "Пароль должен быть не меньше 8 символов" })
  @IsNotEmpty({ message: "Придумайте пароль" })
  password!: string;
}

export class UserDetailDto {
  @ApiProperty({
    example: "2d3a9kd0-2592-44a0-b76f-58204i5e4k0d",
    description: "id",
  })
  @IsUUID()
  @IsString()
  id!: string;

  @ApiProperty({
    example: "example@gmail.com",
    description: "email",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "+7 999 999 99 99",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({
    example: "employee",
    description: "role",
  })
  @IsEnum(ROLE)
  role!: ROLE;

  @ApiProperty({
    example: "Имя",
    description: "first_name",
  })
  @IsString()
  first_name!: string;

  @ApiProperty({
    example: "Фамилия",
    description: "last_name",
  })
  @IsString()
  last_name!: string;

  @ApiProperty({
    example: "d01e304sc2hc4c9372849a41a182dj3f.jpeg",
    description: "avatar",
  })
  @IsString()
  avatar!: string;
}
