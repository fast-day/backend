import { ApiProperty } from "@nestjs/swagger";

export class CustomerMeDto {
  @ApiProperty({
    example: "8c63a5f1-5648-4950-9507-04b9b81d71a8",
    description: "ID клиента",
  })
  id!: string;

  @ApiProperty({
    example: null,
    description: "ID клиента",
  })
  avatar!: string | null;

  @ApiProperty({
    example: "Имя | null",
    description: "Имя клиента",
  })
  first_name!: string | null;

  @ApiProperty({
    example: null,
    description: "Фамилия клиента",
  })
  last_name!: string | null;

  @ApiProperty({
    example: "example@gmail.com | null",
    description: "Email клиента",
  })
  email!: string | null;

  @ApiProperty({
    example: "+7 (999) 999-99-99",
    description: "Номер клиента",
  })
  phone!: string;

  @ApiProperty({
    example: null,
    description: "День рождения клиента",
  })
  birthday!: string | null;
}
