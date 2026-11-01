import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { BookingsPublicService } from "./bookings-public.service";
import { GetPublicBookingDto } from "./dto/public/employee-query.dto";
import {
  BookingResponseDto,
  CreateBookingResponseDto,
} from "./dto/booking-response.dto";
import { WidgetBookingCreateDto } from "./dto/public/booking-create.dto";
import { GetSlotsDto } from "./dto/public/slot-query.dto";

@ApiTags("Публичная запись")
@Controller()
export class BookingsPublicController {
  constructor(private readonly bookingService: BookingsPublicService) {}

  @ApiOperation({
    summary: "Получение данных о сотруднике",
  })
  @Get("booking/widgets/:public_name")
  @HttpCode(HttpStatus.OK)
  check(
    @Param("public_name") publicName: string,
    @Query() query: GetPublicBookingDto,
  ) {
    return this.bookingService.check(publicName, query);
  }

  @ApiOperation({
    summary: "Получение списка услуг пользователя",
  })
  @Get("booking/widgets/services/:user_id")
  @HttpCode(HttpStatus.OK)
  getServices(@Param("user_id") publicCode: number) {
    return this.bookingService.services(publicCode);
  }

  @ApiOperation({
    summary: "Получение свободных слотов",
  })
  @Get("booking/widgets/slots/:user_id")
  @HttpCode(HttpStatus.OK)
  getSlots(@Param("user_id") publicCode: number, @Query() query: GetSlotsDto) {
    return this.bookingService.slots(publicCode, query);
  }

  @ApiOperation({
    summary: "Получение информации о выбранной услуге",
  })
  @Get("booking/widgets/service/:service_id")
  @HttpCode(HttpStatus.OK)
  getService(@Param("service_id") serviceId: number) {
    return this.bookingService.service(serviceId);
  }

  @ApiOperation({
    summary: "Создание бронирования",
    description: "Позволяет осуществить запись",
  })
  @ApiBody({
    type: WidgetBookingCreateDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Бронирование успешно создано",
    type: CreateBookingResponseDto,
  })
  @Post("booking/widgets/:public_name/create")
  @HttpCode(HttpStatus.CREATED)
  createCustomerBooking(
    @Param("public_name") publicName: string,
    @Body() dto: WidgetBookingCreateDto,
  ) {
    return this.bookingService.createBooking(dto, publicName);
  }

  @ApiOperation({
    summary: "Получение детальной информации о бронировании",
  })
  @ApiParam({
    name: "booking_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID бронирования",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Детальная информация",
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @Get("booking/widgets/:booking_id")
  @HttpCode(HttpStatus.OK)
  details(@Param("booking_id") bookingId: string) {
    return this.bookingService.details(bookingId);
  }
}
