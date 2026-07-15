import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CustomerCreateDocumentDto {
  @ApiProperty({
    example: "Название документа",
    description: "Первый документ",
  })
  @IsString()
  name!: string;
}
