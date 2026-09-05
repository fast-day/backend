import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from "class-validator";
import { RoleIds } from "src/role/types/role.type";

export class EmployeeUpdateDto {
  @ApiProperty({
    example: "+7 999 999 99 99",
    required: true,
    description: "Номер телефона",
  })
  @IsPhoneNumber("RU")
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
    example: 2,
    required: true,
    description: "ID роли",
  })
  @IsNumber()
  @IsOptional()
  role?: RoleIds;

  @ApiProperty({
    example: "Финансовый аналитик",
    required: true,
    description: "Должность",
  })
  @IsString()
  @IsOptional()
  position?: string;

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

  @ApiProperty({
    example: false,
    required: false,
    description: "Заблокирован",
  })
  @IsBoolean()
  @IsOptional()
  is_banned?: boolean;
}

export class EmployeeUpdateResponseDto {
  @ApiProperty({
    example: "875b35d2-bce6-4844-b9a6-4f97b5a5e88e",
    description: "ID сотрудника",
  })
  @IsUUID()
  @IsString()
  user_id!: string;

  @ApiProperty({
    example: true,
    description: "Статус",
  })
  @IsBoolean()
  @IsOptional()
  success!: boolean;
}
