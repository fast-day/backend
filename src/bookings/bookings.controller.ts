import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { CompanyGuard } from "src/access/guard/company.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { Scopes } from "src/access/decorator/scopes.decorator";
import { BookingCreateDto } from "./dto/booking-create.dto";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { LocationGuard } from "src/access/guard/location.guard";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger/dist/decorators";
import { BookingStatusDto } from "./dto/booking-status.dto";
import { BookingUpdateDto } from "./dto/booking-update.dto";
import { AuthCustomerGuard } from "src/customers/guard/auth.guard";
import { AuthorizedCustomer } from "src/customers/decorators/authorized.decorator";
import { ICustomer } from "src/customers/types/customer.type";
import { BookingCreateCustomerDto } from "./dto/booking-create-customer.dto";
import {
  BookingListResponseDto,
  BookingResponseDto,
  ClientBookingResponseDto,
  CreateBookingResponseDto,
  SuccessResponseDto,
} from "./dto/booking-response.dto";
import { UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { GetBookingsDto } from "./dto/get-bookings.dto";
import { BookingCreateOrderDto } from "./dto/booking-create-order.dto";
import { BookingCustomerResponseDto } from "./dto/booking-customer-response.dto";

@ApiTags("Бронирование")
@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Создание бронирования (админ/менеджер)",
    description:
      "Создает новое бронирование от имени администратора или менеджера",
  })
  @ApiBody({
    type: BookingCreateDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Бронирование успешно создано",
    type: CreateBookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Post("booking")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("booking:create")
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: BookingCreateDto, @Req() req) {
    const companyId = req.user.companyId;
    return this.bookingsService.create(dto, companyId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение всех бронирований в локации",
    description: "Возвращает список всех бронирований для указанной локации",
  })
  @ApiParam({
    name: "location_id",
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список бронирований",
    type: BookingListResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @Get("bookings/location/:location_id")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, ScopeGuard)
  @Scopes("bookings:read")
  @HttpCode(HttpStatus.OK)
  getAll(
    @Param("location_id") locationId: string,
    @Query() query: GetBookingsDto,
    @Req() req,
  ) {
    const userId = req.user.id;
    return this.bookingsService.getAll(userId, locationId, query);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение детальной информации о бронировании",
    description: "Возвращает полную информацию о конкретном бронировании",
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
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @Get("booking/:booking_id")
  @UseGuards(AuthGuard, LoadUserGuard, ScopeGuard)
  @Scopes("booking-detail:read")
  @HttpCode(HttpStatus.OK)
  details(@Param("booking_id") bookingId: string) {
    return this.bookingsService.details(bookingId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение информации о бронировании клиента",
    description: "Возвращает полную информацию о бронированиях клиента",
  })
  @ApiParam({
    name: "customer_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID клиента",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Информация о бронированиях клиента",
    type: BookingCustomerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @Get("booking/customer/:customer_id")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("booking-customer-detail:read")
  @HttpCode(HttpStatus.OK)
  getCustomerBookings(@Req() req, @Param("customer_id") customerId: string) {
    const companyId = req.user.companyId;
    return this.bookingsService.getCustomerBookings(companyId, customerId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Редактирование бронирования",
    description: "Обновляет данные существующего бронирования",
  })
  @ApiParam({
    name: "booking_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID бронирования",
  })
  @ApiBody({
    type: BookingUpdateDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Бронирование обновлено",
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @Patch("booking/:booking_id")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("booking:update")
  @HttpCode(HttpStatus.OK)
  update(
    @Body() dto: BookingUpdateDto,
    @Param("booking_id") bookingId: string,
    @Req() req,
  ) {
    const companyId = req.user.companyId;
    return this.bookingsService.update(dto, bookingId, companyId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Изменение статуса бронирования",
    description: "Обновляет только статус бронирования",
  })
  @ApiParam({
    name: "booking_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID бронирования",
  })
  @ApiBody({
    type: BookingStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Статус обновлен",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @Put("booking/:booking_id")
  @UseGuards(AuthGuard, LoadUserGuard, ScopeGuard)
  @Scopes("booking:status")
  @HttpCode(HttpStatus.OK)
  statusUpdate(
    @Body() dto: BookingStatusDto,
    @Param("booking_id") bookingId: string,
  ) {
    return this.bookingsService.statusUpdate(dto, bookingId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Удаление бронирования",
    description: "Удаляет бронирование из системы",
  })
  @ApiParam({
    name: "booking_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID бронирования",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Бронирование удалено",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @Delete("booking/:booking_id")
  @UseGuards(AuthGuard, LoadUserGuard, ScopeGuard)
  @Scopes("booking:delete")
  @HttpCode(HttpStatus.OK)
  delete(@Param("booking_id") bookingId: string) {
    return this.bookingsService.delete(bookingId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение моих бронирований (для клиента)",
    description: "Возвращает список бронирований авторизованного клиента",
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список бронирований клиента",
    type: ClientBookingResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("bookings/me")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthCustomerGuard)
  // @Scopes("bookings-client-me:read")
  getMyBookings(@AuthorizedCustomer() customer: ICustomer) {
    return this.bookingsService.getMeBookings(customer.id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Создание бронирования со стороны клиента",
    description: "Позволяет авторизованному клиенту создать бронирование",
  })
  @ApiBody({
    type: BookingCreateCustomerDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Бронирование успешно создано",
    type: CreateBookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Post("booking/client")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthCustomerGuard)
  // @Scopes("bookings-client-me:create")
  createCustomerBooking(
    @Body() dto: BookingCreateCustomerDto,
    @AuthorizedCustomer() customer: ICustomer,
  ) {
    return this.bookingsService.createCustomerBooking(dto, customer.id);
  }

  /*
    ===== ПОДТВЕРЖДЕНИЕ ЗАКАЗА =====
  */
  @Patch("booking/:id/confirm")
  @UseGuards(AuthGuard, LoadUserGuard, ScopeGuard)
  @Scopes("bookings:write")
  @HttpCode(HttpStatus.OK)
  confirmBooking(
    @Param("id") id: string,
    @Body() dto: BookingCreateOrderDto,
    @Req() req,
  ) {
    const companyId = req.user.companyId;
    return this.bookingsService.confirmBooking(id, dto, companyId);
  }

  /*
    ===== ЗАВЕРШЕНИЕ БРОНИРОВАНИЯ =====
  */
  @Patch("booking/:id/complete")
  @UseGuards(AuthGuard, LoadUserGuard, ScopeGuard)
  @Scopes("bookings:write")
  @HttpCode(HttpStatus.OK)
  completeBooking(@Param("id") id: string) {
    return this.bookingsService.completeBooking(id);
  }
}
