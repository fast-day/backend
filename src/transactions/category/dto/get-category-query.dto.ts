import { ApiProperty } from "@nestjs/swagger";
import { MarkEnum } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class GetTransactionCategoryQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: MarkEnum })
  @IsOptional()
  @IsEnum(MarkEnum)
  mark?: MarkEnum;
}
