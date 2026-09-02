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
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { BookingsPublicService } from "./bookings-public.service";
import { GetPublicBookingDto } from "./dto/public/employee-query.dto";
import { CreateBookingResponseDto } from "./dto/booking-response.dto";
import { WidgetBookingCreateDto } from "./dto/public/booking-create.dto";

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
  getServices(@Param("user_id") userId: string) {
    return this.bookingService.services(userId);
  }

  @ApiOperation({
    summary: "Получение информации о выбранной услуге",
  })
  @Get("booking/widgets/services/:service_id")
  @HttpCode(HttpStatus.OK)
  getService(@Param("service_id") serviceId: string) {
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
}
