import { ApiProperty } from "@nestjs/swagger/dist/decorators";
import { IsBoolean, IsNumber, IsString } from "class-validator";

export class CheckInviteDto {
  @ApiProperty({
    example:
      "ee44e21d021c7c241b97b2d0c02b7f6d34abb97251c9f40cbb0feab45bd06eeb16ca4dae804ed5b35e24370d1d3537c3",
    required: true,
    description: "Токен",
  })
  @IsString()
  token!: string;
}

export class CheckInviteResponseDto {
  @ApiProperty({
    example: true,
    description: "Статус",
  })
  @IsBoolean()
  valid!: boolean;
}

export class CheckInviteResponseErrorDto {
  @ApiProperty({
    example: 404,
    description: "Статус",
  })
  @IsNumber()
  status!: number;

  @ApiProperty({
    example: "Ссылка устарела",
    description: "Заголовок",
  })
  @IsString()
  title!: string;

  @ApiProperty({
    example:
      "Срок действия вашей ссылки истек. Пожалуйста, проверьте правильность ссылки или запросите новую.",
    description: "Сообщение",
  })
  @IsString()
  message!: string;
}
