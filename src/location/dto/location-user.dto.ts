import { ApiProperty } from "@nestjs/swagger/dist/decorators";
import { ROLE, UserStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";

class UserProfileDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "ID локации",
  })
  @IsUUID()
  @IsString()
  id!: string;

  @ApiProperty({
    example: "example@gmail.com",
    description: "Email",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "Имя Фамилия",
    description: "Полное имя",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "8 999 999 99 99",
    description: "Номер телефона",
  })
  @IsPhoneNumber("RU")
  phone!: string;

  @ApiProperty({
    example: "71657a704cb3726f8f1116879bd6f908.jpg",
    description: "Аватар",
  })
  @IsString()
  avatar!: string;

  @ApiProperty({
    example: "active",
    description: "Статус",
  })
  @IsEnum(UserStatus)
  status!: UserStatus;

  @ApiProperty({
    example: "Глав. Разработчик",
    description: "Позиция",
  })
  @IsString()
  position!: string;
}

export class LocationUserDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "user id",
  })
  @IsUUID()
  @IsString()
  user_id!: string;

  @ApiProperty({
    example: "employee",
    description: "Роль",
  })
  @IsEnum(ROLE)
  role!: ROLE;

  @ApiProperty({
    example: false,
    description: "Заблокирован",
  })
  @IsBoolean()
  is_banned!: boolean;

  @ApiProperty({
    example: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "example@gmail.com",
      name: "Имя Фамилия",
      avatar: "71657a704cb3726f8f1116879bd6f908.jpg",
      phone: "8 999 999 99 99",
      status: "active",
      position: "Глав. Разработчик",
    },
  })
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile!: UserProfileDto;
}
