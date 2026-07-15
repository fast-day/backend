import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class UnAuthorizedDto {
  @ApiProperty({
    example: "Unauthorized",
    description: "Error message",
  })
  @IsString()
  message!: string;

  @ApiProperty({
    example: 401,
    description: "Error status",
  })
  @IsNumber()
  status!: number;
}

export class NotFoundDto {
  @ApiProperty({
    example: 404,
    description: "Error status",
  })
  @IsNumber()
  status!: number;

  @ApiProperty({
    example: "Not Found",
    description: "Error title",
  })
  @IsString()
  title!: string;

  @ApiProperty({
    example: "Not Found Detail",
    description: "Error message",
  })
  @IsString()
  detail!: string;
}

export class ConflictDto {
  @ApiProperty({
    example: 409,
    description: "Error status",
  })
  @IsNumber()
  status!: number;

  @ApiProperty({
    example: "Заголовок",
    description: "Error title",
  })
  @IsString()
  title!: string;

  @ApiProperty({
    example: "Детали",
    description: "Error message",
  })
  @IsString()
  detail!: string;

  @ApiProperty({
    example: {
      user_id: "Например id пользователя",
    },
    description: "Error message",
  })
  @IsString()
  meta!: string;
}
