import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TRANSACTION_TYPE } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateTransactionDto {
  @ApiPropertyOptional({
    enum: TRANSACTION_TYPE,
    example: TRANSACTION_TYPE.expense,
    description: "Тип транзакции",
  })
  @IsEnum(TRANSACTION_TYPE)
  type!: TRANSACTION_TYPE;

  @ApiProperty({
    example: 5000,
    description: "Цена",
    required: true,
  })
  @IsNumber()
  amount!: number;

  @ApiProperty({
    example: "Описание",
    description: undefined,
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 137493,
    description: "ID Категории",
  })
  @IsNumber()
  @IsOptional()
  category_id?: number;
}
