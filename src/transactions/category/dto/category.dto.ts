import { ApiProperty, PartialType } from "@nestjs/swagger";
import { MarkEnum, TRANSACTION_CATEGORY_ICON } from "@prisma/client";
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

  @ApiProperty({
    example:
      "coin | gift | handbag | ayers | pie | wallet | repeat | recipe | reply | cart | shop | stars | tools | card | undo | increase",
    description: "Иконка категории",
  })
  @IsEnum(TRANSACTION_CATEGORY_ICON)
  icon!: TRANSACTION_CATEGORY_ICON;
}

export class UpdateTransactionCategoryDto extends PartialType(
  TransactionCategoryDto,
) {}
