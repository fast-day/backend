import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BookingStatus, PaymentType } from "@prisma/client";

export class LocationInfoDto {
  @ApiProperty({ example: "a8f4ff39-f908-472e-bf19-259b557c952a" })
  id!: string;

  @ApiProperty({ example: "Яндекс test" })
  name!: string;

  @ApiPropertyOptional({ example: null })
  avatar?: string | null;

  @ApiPropertyOptional({ type: () => AddressDto })
  address?: AddressDto | null;
}

export class AddressDto {
  @ApiProperty({ example: "ул. Льва Толстого, д. 16" })
  street!: string;

  @ApiProperty({ example: "Санкт-Петербург" })
  city!: string;

  @ApiPropertyOptional({ example: null })
  house?: string | null;

  @ApiProperty({ example: "Россия" })
  country!: string;
}

export class EmployeeInfoDto {
  @ApiProperty({ example: "89e1ff87-f273-47a4-ab34-a90c716c59f0" })
  id!: string;

  @ApiProperty({ example: "Kirill" })
  first_name!: string;

  @ApiProperty({ example: "Kolesnikov" })
  last_name!: string;

  @ApiProperty({ example: "8 (961) 328-58-27" })
  phone!: string;

  @ApiPropertyOptional({ example: null })
  position?: string | null;

  @ApiPropertyOptional({ example: null })
  avatar?: string | null;
}

export class CustomerInfoDto {
  @ApiProperty({ example: "d91e3d55-6ba2-4c26-bd7a-55a7ce35e13b" })
  id!: string;

  @ApiPropertyOptional({ example: null })
  first_name?: string | null;

  @ApiPropertyOptional({ example: null })
  last_name?: string | null;

  @ApiProperty({ example: "+7 (961) 328-58-27" })
  phone!: string;

  @ApiPropertyOptional({ example: null })
  email?: string | null;

  @ApiPropertyOptional({ example: null })
  birthday?: string | null;

  @ApiPropertyOptional({ example: "null null" })
  name?: string;
}

export class ServicePriceDto {
  @ApiProperty({ example: 8000 })
  price!: number;

  @ApiPropertyOptional({ example: 1500 })
  cost_price?: number;
}

export class ServiceInfoDto {
  @ApiProperty({ example: "5d48c70b-c018-4e93-8673-b6be4f4fad93" })
  id!: string;

  @ApiProperty({ example: "Дизайн интерьера" })
  name!: string;

  @ApiPropertyOptional({ example: "Проектирование интерьеров" })
  public_name?: string;

  @ApiPropertyOptional({ example: "purple" })
  mark?: string;

  @ApiProperty({ example: 30 })
  duration!: number;

  @ApiPropertyOptional({ type: ServicePriceDto })
  price?: ServicePriceDto;

  @ApiPropertyOptional({ type: ServicePriceDto })
  prices?: ServicePriceDto;

  @ApiPropertyOptional({ example: null })
  category?: string | null;
}

export class OrderInfoDto {
  @ApiProperty({ example: "e4e79991-5c83-410c-a2f0-be9a888dd2d9" })
  id!: string;

  @ApiProperty({ enum: BookingStatus, example: "pending" })
  status!: string;

  @ApiProperty({ example: 8000 })
  subtotal!: number;

  @ApiPropertyOptional({ example: null })
  comment?: string | null;

  @ApiPropertyOptional({ example: null })
  discount?: number | null;

  @ApiProperty({ enum: PaymentType, example: "credit_card" })
  payment_method!: PaymentType;
}

export class BookingResponseDto {
  @ApiProperty({ example: "a81b90e4-5a76-4870-84be-c9732b9b22c1" })
  id!: string;

  @ApiProperty({ example: "Customer API" })
  name!: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.confirmed })
  status!: BookingStatus;

  @ApiProperty({ example: "10:00" })
  start_time?: string;

  @ApiProperty({ example: "12:45" })
  end_time?: string;

  @ApiProperty({ example: "29-10-2025" })
  date!: string;

  @ApiPropertyOptional({ example: null })
  comment?: string | null;

  @ApiProperty({ type: LocationInfoDto })
  location!: LocationInfoDto;

  @ApiProperty({ type: EmployeeInfoDto })
  employee!: EmployeeInfoDto;

  @ApiProperty({ type: CustomerInfoDto })
  customer!: CustomerInfoDto;

  @ApiProperty({ type: ServiceInfoDto })
  service!: ServiceInfoDto;

  @ApiPropertyOptional({ type: OrderInfoDto })
  order?: OrderInfoDto;
}

export class BookingListResponseDto {
  @ApiProperty({ example: "a81b90e4-5a76-4870-84be-c9732b9b22c1" })
  id!: string;

  @ApiProperty({ example: "Customer API" })
  name!: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.confirmed })
  status!: BookingStatus;

  @ApiProperty({ example: "10:00" })
  start_time!: string;

  @ApiProperty({ example: "12:45" })
  end_time!: string;

  @ApiProperty({ example: "29-10-2025" })
  date!: string;

  @ApiPropertyOptional({ example: null })
  comment?: string | null;

  @ApiProperty({ type: CustomerInfoDto })
  customer!: CustomerInfoDto;

  @ApiProperty({ type: EmployeeInfoDto })
  employee!: EmployeeInfoDto;
}

export class CreateBookingResponseDto {
  @ApiProperty({ example: "a81b90e4-5a76-4870-84be-c9732b9b22c1" })
  id!: string;

  @ApiProperty({ example: "Customer API" })
  name!: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.confirmed })
  status!: BookingStatus;

  @ApiProperty({ example: "29-10-2025" })
  date!: string;

  @ApiProperty({ type: LocationInfoDto })
  location!: LocationInfoDto;

  @ApiProperty({ type: EmployeeInfoDto })
  employee!: EmployeeInfoDto;

  @ApiProperty({ type: ServiceInfoDto })
  service!: ServiceInfoDto;

  @ApiProperty({ type: OrderInfoDto })
  order!: OrderInfoDto;
}

export class UpdateBookingResponseDto {
  @ApiProperty({ example: "a81b90e4-5a76-4870-84be-c9732b9b22c1" })
  id!: string;

  @ApiProperty({ example: "Customer API" })
  name!: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.confirmed })
  status!: BookingStatus;
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

export class ClientLocationInfoDto {
  @ApiProperty({
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
  })
  id!: string;

  @ApiProperty({
    example: "Яндекс test",
    description: "Название локации",
  })
  name!: string;

  @ApiPropertyOptional({
    example: null,
    description: "URL аватара локации",
  })
  avatar?: string | null;

  @ApiProperty({
    type: AddressDto,
    description: "Адрес локации",
  })
  address!: AddressDto;
}

export class ClientEmployeeInfoDto {
  @ApiProperty({
    example: "89e1ff87-f273-47a4-ab34-a90c716c59f0",
    description: "ID сотрудника",
  })
  id!: string;

  @ApiProperty({
    example: "Kirill",
    description: "Имя",
  })
  first_name!: string;

  @ApiProperty({
    example: "Kolesnikov",
    description: "Фамилия",
  })
  last_name!: string;

  @ApiProperty({
    example: "8 (961) 328-58-27",
    description: "Телефон",
  })
  phone!: string;

  @ApiPropertyOptional({
    example: null,
    description: "URL аватара",
  })
  avatar?: string | null;

  @ApiPropertyOptional({
    example: null,
    description: "Должность",
  })
  position?: string | null;
}

export class ClientServiceInfoDto {
  @ApiProperty({
    example: "Дизайн интерьера",
    description: "Название услуги",
  })
  name!: string;

  @ApiPropertyOptional({
    example: "Проектирование интерьеров",
    description: "Публичное название",
  })
  public_name?: string;

  @ApiPropertyOptional({
    example: "purple",
    description: "Цветовая метка",
  })
  mark?: string;

  @ApiProperty({
    example: 30,
    description: "Длительность в минутах",
  })
  duration!: number;

  @ApiPropertyOptional({
    example: null,
    description: "Категория услуги",
  })
  category?: string | null;
}

export class ClientBookingResponseDto {
  @ApiProperty({
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID бронирования",
  })
  id!: string;

  @ApiProperty({
    example: "Customer API",
    description: "Название бронирования",
  })
  name!: string;

  @ApiProperty({
    enum: BookingStatus,
    example: BookingStatus.confirmed,
    description: "Статус бронирования",
  })
  status!: BookingStatus;

  @ApiProperty({
    example: "10:00",
    description: "Время начала",
  })
  start_time!: string;

  @ApiProperty({
    example: "12:45",
    description: "Время окончания",
  })
  end_time!: string;

  @ApiProperty({
    example: "24-02-2026",
    description: "Дата бронирования",
  })
  date!: string;

  @ApiProperty({
    type: ClientEmployeeInfoDto,
    description: "Информация о сотруднике",
  })
  employee!: ClientEmployeeInfoDto;

  @ApiProperty({
    type: ClientLocationInfoDto,
    description: "Информация о локации",
  })
  location!: ClientLocationInfoDto;

  @ApiProperty({
    type: ClientServiceInfoDto,
    description: "Информация об услуге",
  })
  service!: ClientServiceInfoDto;
}
