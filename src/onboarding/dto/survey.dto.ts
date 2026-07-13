import { ApiProperty } from "@nestjs/swagger/dist/decorators";
import { ClientsRange } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class SurveyDto {
  @ApiProperty({
    example: "one_to_five",
    description: "кол-во клиентов",
  })
  @IsEnum(ClientsRange)
  clients_range!: ClientsRange;

  @ApiProperty({
    example: "я узнал о вас...",
    description: "Откуда узнали о нас",
    required: false,
  })
  @IsString()
  @IsOptional()
  source!: string;

  @ApiProperty({
    example: "моя цель...",
    description: "Какова ваша цель",
    required: false,
  })
  @IsString()
  @IsOptional()
  main_goal!: string;
}
