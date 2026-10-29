import { Transform } from "class-transformer";
import { IsPhoneNumber, IsString } from "class-validator";

export class AuthVerifyDto {
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  phone!: string;

  @IsString()
  code!: string;
}
