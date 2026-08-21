import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class GetPublicBookingDto {
  @ApiProperty({ required: true })
  @IsString()
  user_id!: string;

  @ApiProperty({ required: true })
  @IsString()
  location_id!: string;
}
