import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class BlockDto {
  @IsString()
  id!: string;

  @IsString()
  type!: string;

  @IsOptional()
  props?: unknown;

  @IsOptional()
  content?: unknown;

  @IsOptional()
  children?: unknown;
}

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
    example: "[]",
    description: "Контент",
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  @IsOptional()
  content?: BlockDto[];

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
