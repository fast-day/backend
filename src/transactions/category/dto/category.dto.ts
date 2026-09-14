import { ApiProperty, PartialType } from "@nestjs/swagger";
import { MarkEnum } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class TransactionCategoryDto {
  @ApiProperty({
    example: "Название",
    description: "Название категории",
    required: true,
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "red | orange | green | blue | purple | teal | pink",
    description: "цвет (обозначение)",
  })
  @IsEnum(MarkEnum)
  @IsOptional()
  mark?: MarkEnum;
}

export class UpdateTransactionCategoryDto extends PartialType(
  TransactionCategoryDto,
) {}
