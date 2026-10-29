import { ApiProperty } from "@nestjs/swagger/dist/decorators";
import { CURRENCY, ROLE } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";

class RoleDto {
  @ApiProperty({
    example: 1,
    description: "role id",
  })
  @IsNumber()
  id!: number;
}

class MeLocationsDto {
  @ApiProperty({
    example: "2d3a9kd0-2592-44a0-b76f-58204i5e4k0d",
    description: "location id",
  })
  @IsUUID()
  @IsString()
  id!: string;

  @ApiProperty({
    example: "Яндекс",
    default: "location name",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "71657a704cb3726f8f1116879bd6f908.jpg",
    default: "location avatar",
  })
  @IsString()
  @IsOptional()
  avatar!: string | null;
}

class CompanyIndustryDto {
  @ApiProperty({
    example: 1,
    description: "industry id",
  })
  @IsNumber()
  id!: number;

  @ApiProperty({
    example: "IT",
    description: "industry name",
  })
  @IsString()
  name!: string;
}

class MeCompanyDto {
  @ApiProperty({
    example: "2d3a9kd0-2592-44a0-b76f-58204i5e4k0d",
    description: "company id",
  })
  @IsUUID()
  @IsString()
  id!: string;

  @ApiProperty({
    example: "Яндекс",
    default: "company name",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "RUB",
    default: "currency",
  })
  @IsEnum(CURRENCY)
  currency!: CURRENCY;

  @ApiProperty({
    example: { id: 1, name: "IT" },
    description: "industry",
  })
  @ValidateNested()
  @Type(() => CompanyIndustryDto)
  industry!: CompanyIndustryDto;

  @ApiProperty({
    example: "IT",
    default: "specialization",
  })
  @IsString()
  specialization!: string;
}

export class MeDto {
  @ApiProperty({
    example: "2d3a9kd0-2592-44a0-b76f-58204i5e4k0d",
    description: "id",
  })
  @IsUUID()
  @IsString()
  id!: string;

  @ApiProperty({
    example: "example@gmail.com",
    description: "email",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "+7 999 999 99 99",
  })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsPhoneNumber()
  phone!: string;

  @ApiProperty({
    example: "employee",
    description: "role",
  })
  @IsEnum(ROLE)
  role!: ROLE;

  @ApiProperty({
    example: { id: 1 },
    description: "role",
  })
  @ValidateNested()
  @Type(() => RoleDto)
  role_id!: RoleDto;

  @ApiProperty({
    example: "Имя",
    description: "first_name",
  })
  @IsString()
  first_name!: string;

  @ApiProperty({
    example: "Фамилия",
    description: "last_name",
  })
  @IsString()
  last_name!: string;

  @ApiProperty({
    example: "Имя Фамилия",
    description: "full_name",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: "d01e304sc2hc4c9372849a41a182dj3f.jpeg",
    description: "avatar",
  })
  @IsString()
  avatar!: string;

  @ApiProperty({
    example: [
      {
        id: "ebcf6b9f-1183-4ab6-b8a5-0a0cb4f64879",
        name: "Яндекс",
        avatar: "71657a704cb3726f8f1116879bd6f908.jpg",
      },
    ],
    description: "locations",
  })
  @ValidateNested()
  @Type(() => MeLocationsDto)
  locations!: MeLocationsDto[];

  @ApiProperty({
    example: {
      id: "473c1f1f-5d29-4cef-bd1e-317f93494d48",
      name: "Яндекс",
      currency: "RUB",
      industry: { id: 1, name: "IT" },
      specialization: "IT",
    },
  })
  @ValidateNested()
  @Type(() => MeCompanyDto)
  company!: MeCompanyDto;
}
