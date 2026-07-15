import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";

export class CustomerUpdateDocumentDto {
  @ApiProperty({
    example: "Название документа",
    description: "Первый документ",
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: "JSON",
    description: "Контент",
    required: false,
  })
  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @ApiProperty({
    example: false,
    description: "Закрепить",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_pinned?: boolean;

  @ApiProperty({
    example: false,
    description: "Архивировать",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_archived?: boolean;

  @ApiProperty({
    example: false,
    description: "Заморозить",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_locked?: boolean;
}
