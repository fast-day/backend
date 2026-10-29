import { Transform } from "class-transformer";
import { IsPhoneNumber } from "class-validator";

export class AuthPhoneDto {
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  phone!: string;
}
