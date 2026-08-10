import { ApiProperty } from "@nestjs/swagger";
import { INVOICE_STATUS } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";
import { GetQueryDto } from "src/shared/dto/query.dto";

export class GetInvoicesDto extends GetQueryDto {
  @ApiProperty({ required: false, enum: INVOICE_STATUS })
  @IsOptional()
  @IsEnum(INVOICE_STATUS)
  status?: INVOICE_STATUS;
}
