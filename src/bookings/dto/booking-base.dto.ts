import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";

export class BookingDtoService {
  @ApiProperty({
    example: "82e930d8-c4b3-4d38-b166-f1d872189930",
    description: "Service ID",
    required: true,
  })
  @IsString()
  service_id!: string;

  @ApiProperty({
    example: 999,
    description: "Цена",
    required: true,
  })
  @IsNumber()
  price!: number;

  @ApiProperty({
    example: 2,
    description: "Количество услуг",
    required: false,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  count?: number;

  @ApiProperty({
    example: 90,
    description: "Длительность",
    required: false,
    default: null,
  })
  @IsNumber()
  @IsOptional()
  duration?: number;
}

export class BookingBaseDto {
  // @ApiProperty({
  //   example: "Customer API",
  //   description: "Название бронирования",
  //   required: false,
  // })
  // @IsString()
  // name!: string;

  @ApiProperty({
    example: "2026-07-22T10:00",
    description: "Дата и время начала в формате ISO 8601",
    required: true,
  })
  @IsISO8601()
  start_time!: string;

  @ApiProperty({
    example: "2026-07-22T10:00",
    description: "Дата и время начала в формате ISO 8601",
    required: true,
  })
  @IsISO8601()
  end_time!: string;

  @ApiProperty({
    example: "24-11-2025",
    description: "Дата в формате YYYY-MM-DD",
    required: true,
  })
  // @Matches(/^\d{2}-\d{2}-\d{4}$/, {
  //   message: "Дата должна быть в формате DD-MM-YYYY",
  // })
  // date!: string;
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({
    example: "Клиент просит напомнить за час",
    description: "Комментарий к бронированию",
  })
  @IsString()
  @IsOptional()
  comment?: string;

  // @ApiProperty({
  //   example: "5d48c70b-c018-4e93-8673-b6be4f4fad93",
  //   description: "ID услуги",
  //   required: true,
  // })
  // @IsUUID()
  // service_id!: string;

  @ApiProperty({
    type: [BookingDtoService],
    example: [
      {
        service_id: "82e930d8-c4b3-4d38-b166-f1d872189930",
        price: 999,
        count: 2,
        duration: 90,
      },
    ],
    description: "Список выбранных услуг",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingDtoService)
  services!: BookingDtoService[];

  @ApiProperty({
    example: "89e1ff87-f273-47a4-ab34-a90c716c59f0",
    description: "ID сотрудника",
    required: true,
  })
  @IsUUID()
  employee_id!: string;

  @ApiProperty({
    enum: PaymentType,
    example: PaymentType.credit_card,
    description: "Способ оплаты",
    required: true,
  })
  @IsEnum(PaymentType)
  payment_method!: PaymentType;
}
