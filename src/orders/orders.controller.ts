import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { LocationGuard } from "src/access/guard/location.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { Scopes } from "src/access/decorator/scopes.decorator";
import { GetOrdersDto } from "./dto/get-orders.dto";
import { UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { CompanyGuard } from "src/access/guard/company.guard";
import { OrderPaidDto } from "./dto/order-paid.dto";
import { DraftOrderDto } from "./dto/order-create.dto";
import { CalculatePriceDto } from "./dto/calculate-price.dto";

@ApiTags("Заказы")
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /*
    ===== ОПЛАТА ЗАКАЗА =====
  */
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Оплата заказа",
  })
  @ApiParam({
    name: "order_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID заказа",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: undefined,
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
  @Post("orders/:order_id/paid")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("orders:write")
  @HttpCode(HttpStatus.OK)
  paidOrder(
    @Req() req,
    @Param("order_id") orderId: string,
    @Body() dto: OrderPaidDto,
  ) {
    const companyId = req.user.companyId;
    return this.ordersService.paidOrder(dto, orderId, companyId);
  }

  /*
    ===== СОЗДАНИЕ ЗАКАЗА =====
  */
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Создание заказа",
  })
  @ApiParam({
    name: "booking_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID Записи",
  })
  @ApiBody({
    type: DraftOrderDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: undefined,
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
  @Post("orders/:booking_id/draft")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("orders:draft")
  @HttpCode(HttpStatus.OK)
  draft(
    @Req() req,
    @Param("booking_id") bookingId: string,
    @Body() dto: DraftOrderDto,
  ) {
    const companyId = req.user.companyId;
    return this.ordersService.draft(dto, bookingId, companyId);
  }

  /*
    ===== ПЕРЕСЧЕТ ЗАКАЗА =====
  */
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Пересчет заказа",
  })
  @ApiParam({
    name: "booking_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID Записи",
  })
  @ApiBody({
    type: CalculatePriceDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: undefined,
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
  @Post("orders/:booking_id/calculate")
  @UseGuards(AuthGuard, CompanyGuard, ScopeGuard)
  // @Scopes("orders:calculate")
  @HttpCode(HttpStatus.OK)
  calculate(
    @Req() req,
    @Param("booking_id") bookingId: string,
    @Body() dto: CalculatePriceDto,
  ) {
    const companyId = req.user.companyId;
    return this.ordersService.calculatePrice(bookingId, companyId, dto);
  }

  /*
    ===== ОТМЕНА ЗАКАЗА =====
  */
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Отмена заказа",
  })
  @ApiParam({
    name: "booking_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID Заказа",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: undefined,
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
  @Post("orders/:order_id/cancel")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("orders:cancel")
  @HttpCode(HttpStatus.OK)
  cancel(@Req() req, @Param("order_id") orderId: string) {
    const companyId = req.user.companyId;
    return this.ordersService.cancel(orderId, companyId);
  }

  /*
    ===== ВОЗВРАТ СРЕДСТВ =====
  */
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Возврат средств",
  })
  @ApiParam({
    name: "booking_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID Заказа",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: undefined,
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
  @Post("orders/:order_id/refund")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("orders:refund")
  @HttpCode(HttpStatus.OK)
  refund(@Req() req, @Param("order_id") orderId: string) {
    const companyId = req.user.companyId;
    return this.ordersService.refundOrder(orderId, companyId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение всех заказов компании",
    description: "Возвращает список всех заказов",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("orders")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, ScopeGuard)
  @Scopes("orders:read")
  @HttpCode(HttpStatus.OK)
  getAll(@Query() query: GetOrdersDto, @Req() req) {
    const companyId = req.user.companyId;
    return this.ordersService.getAll(companyId, query);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение детальной информации о заказе",
    description: "Возвращает полную информацию о конкретном заказе",
  })
  @ApiParam({
    name: "order_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID заказа",
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
  @Get("orders/:order_id")
  @UseGuards(AuthGuard, LoadUserGuard, ScopeGuard)
  @Scopes("booking-detail:read")
  @HttpCode(HttpStatus.OK)
  details(@Param("order_id") orderId: string, @Req() req) {
    const companyId = req.user.companyId;
    return this.ordersService.details(orderId, companyId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение информации о заказах клиента",
    description: "Возвращает полную информацию о заказах клиента",
  })
  @ApiParam({
    name: "customer_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID клиента",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Информация о заказах клиента",
    type: undefined,
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
  @Get("orders/customer/:customer_id")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("order-customer-detail:read")
  @HttpCode(HttpStatus.OK)
  getCustomerBookings(
    @Req() req,
    @Param("customer_id") customerId: string,
    @Query() query: GetOrdersDto,
  ) {
    const companyId = req.user.companyId;
    return this.ordersService.getCustomerOrders(companyId, customerId, query);
  }
}
