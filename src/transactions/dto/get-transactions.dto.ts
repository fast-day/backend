import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TRANSACTION_TYPE } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { GetQueryDto } from "src/shared/dto/query.dto";

export class GetTransactionsDto extends GetQueryDto {
  @ApiProperty({
    example: "2025-11-24",
    description: "Дата в формате YYYY-MM-DD",
    required: true,
  })
  @IsDateString()
  start_date!: string;

  @ApiProperty({
    example: "2026-09-13",
    description: "Дата в формате YYYY-MM-DD",
    required: true,
  })
  @IsDateString()
  end_date!: string;

  @ApiPropertyOptional({
    example: 137493,
    description: "ID Категории",
  })
  @IsString()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({
    enum: TRANSACTION_TYPE,
    example: TRANSACTION_TYPE.expense,
    description: "Тип транзакции",
  })
  @IsEnum(TRANSACTION_TYPE)
  @IsOptional()
  type?: TRANSACTION_TYPE;
}
