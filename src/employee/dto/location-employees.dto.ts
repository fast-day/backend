import { ApiProperty } from "@nestjs/swagger/dist/decorators";
import { UserStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsObject,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from "class-validator";

export class LocationEmployeesDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "user id",
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
    example: "Имя",
    description: "Имя",
  })
  @IsString()
  fist_name!: string;

  @ApiProperty({
    example: "Фамилия",
    description: "Фамилия",
  })
  @IsString()
  last_name!: string;

  @ApiProperty({
    example: "8 999 999 99 99",
    description: "Номер телефона",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
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

  @ApiProperty({
    example: { id: 3, name: "Администратор" },
    required: true,
    description: "Объект роли с ID и названием",
    type: () => ({
      id: { type: Number, description: "ID роли" },
      name: { type: String, description: "Название роли" },
    }),
  })
  @IsObject()
  role!: {
    id: number;
    name: string;
  };

  @ApiProperty({
    example: false,
    description: "Статус",
  })
  @IsString()
  is_banned!: boolean;
}
