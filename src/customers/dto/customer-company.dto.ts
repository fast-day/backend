import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from "class-validator";

export class CustomerCompanyDto {
  @ApiProperty({
    example: "+7 (999) 999-99-99",
    required: true,
    description: "Телефон",
  })
  @IsPhoneNumber("RU")
  @IsNotEmpty({ message: "Обязательное поле" })
  phone!: string;

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
  @IsOptional()
  last_name?: string;

  @ApiProperty({
    example: "Email",
    description: "example@gmail.com",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: "Толян - постоянный клиент",
    required: false,
    description: "Заметка",
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    example: false,
    required: false,
    description: "Статус",
  })
  @IsBoolean()
  @IsOptional()
  is_banned?: boolean;
}

export class CreateCustomerDataDto {
  @ApiProperty({
    example: "8c63a5f1-5648-4950-9507-04b9b81d71a8",
    description: "ID созданного клиента",
  })
  id!: string;

  @ApiProperty({
    example: false,
    description: "Заблокирован ли клиент",
  })
  isBanned!: boolean;

  @ApiProperty({
    example: "bro you idiot",
    description: "Заметка о клиенте",
    required: false,
  })
  note?: string;
}

export class CustomerCompanyResponseDto {
  @ApiProperty({
    example: true,
    description: "Статус операции",
  })
  success!: boolean;

  @ApiProperty({
    type: CreateCustomerDataDto,
    description: "Данные созданного клиента",
  })
  create!: CreateCustomerDataDto;
}
