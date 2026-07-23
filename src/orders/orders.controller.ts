import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import {
  ApiBearerAuth,
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

@ApiTags("Заказы")
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
