import { ApiProperty, OmitType } from "@nestjs/swagger";
import { IsPhoneNumber, IsString, IsOptional, IsEmail } from "class-validator";
import { BookingCreateDto } from "../booking-create.dto";

class WidgetBookingDto extends OmitType(BookingCreateDto, ["customers"]) {}

export class WidgetBookingCreateDto extends WidgetBookingDto {
  @ApiProperty({
    example: "+7 (999) 999-99-99",
    description: "Номер клиента",
    required: false,
  })
  @ApiProperty({ example: "+7 (999) 999-99-99" })
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({
    example: "Иван",
    description: "Имя клиента",
    required: false,
  })
  @IsString()
  first_name!: string;

  @ApiProperty({
    example: "Иванов",
    description: "Фамилия клиента",
    required: true,
  })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiProperty({
    example: "example@gmail.com",
    description: "Email клиента",
    required: true,
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}
