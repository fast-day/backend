import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from "class-validator";
import { RoleIds } from "src/role/types/role.type";

export class EmployeeDto {
  @ApiProperty({
    example: "example@gmail.com",
    required: true,
    description: "Email",
  })
  @IsString()
  @IsEmail()
  @IsNotEmpty({ message: "Обязательное поле" })
  email!: string;

  @ApiProperty({
    example: "+7 999 999 99 99",
    required: true,
    description: "Номер телефона",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  @IsNotEmpty({ message: "Обязательное поле" })
  phone!: string;

  @ApiProperty({
    example: "Вова",
    required: true,
    description: "Имя",
  })
  @IsString()
  @IsNotEmpty({ message: "Обязательное поле" })
  first_name!: string;

  @ApiProperty({
    example: "Пупкин",
    required: false,
    description: "Фамилия",
  })
  @IsString()
  @IsOptional()
  last_name!: string;

  @ApiProperty({
    example: 3,
    required: true,
    description: "ID роли",
  })
  @IsNumber()
  role!: RoleIds;

  @ApiProperty({
    example: "Финансовый аналитик",
    required: true,
    description: "Должность",
  })
  @IsString()
  position!: string;

  @ApiProperty({
    example: "0f626ad0-aa27-4755-8da6-5d16f474a127",
    required: true,
    description: "ID локации",
  })
  @IsUUID()
  @IsString()
  location_id!: string;

  @ApiProperty({
    example: "06.09.2006",
    required: false,
    description: "День рождения",
  })
  @IsString()
  @IsOptional()
  birthdate?: string;

  @ApiProperty({
    example: "Крутой чувак",
    required: false,
    description: "Заметка/Описание",
  })
  @IsString()
  @IsOptional()
  note?: string;
}

class EmployeeResDetail {
  @IsString()
  action!: string;
}

export class CreateEmployeeResponse {
  @ApiProperty({
    example: true,
    description: "Успешно",
  })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({
    example: "Приглашене отправлено на почту",
    description: "Сообщение",
  })
  @IsString()
  message!: string;

  @ApiProperty({
    example: {
      action: "invite",
    },
    description: "Действие",
  })
  @Type(() => EmployeeResDetail)
  detail!: EmployeeResDetail;
}

export class InviteEmployeeConflict {
  @ApiProperty({
    example: 409,
    description: "Статус",
  })
  @IsNumber()
  status!: number;

  @ApiProperty({
    example: "Ошибка",
    description: "Заголовок",
  })
  @IsString()
  title!: string;

  @ApiProperty({
    example: "Пользователь уже привязан к указанной локации.",
    description: "Детали",
  })
  @IsString()
  detail!: string;
}
