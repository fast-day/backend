import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { SendCodeDto, SendCodeResponseDto } from "./dto/send-code.dto";
import { VerifyCodeDto, VerifyCodeResponseDto } from "./dto/verify.dto";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { CompanyGuard } from "src/access/guard/company.guard";
import {
  CustomerCompanyDto,
  CustomerCompanyResponseDto,
} from "./dto/customer-company.dto";
import { Scopes } from "src/access/decorator/scopes.decorator";
import { AuthGuard } from "src/auth/guard/auth.guard";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger/dist/decorators";
import { GlobalSuccessDto } from "src/shared/dto/global.dto";
import { NotFoundDto, UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { AuthCustomerGuard } from "./guard/auth.guard";
import { AuthorizationCustomer } from "./decorators/auth.decorator";
import { AuthorizedCustomer } from "./decorators/authorized.decorator";
import { CustomerMeDto } from "./dto/customer.dto";
import { LocationGuard } from "src/access/guard/location.guard";
import { GetCustomersDto } from "./dto/get-customers.dto";
import { Authorized } from "src/auth/decorators/authorized.decorator";

@ApiTags("Клиенты")
@Controller()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiOperation({ summary: "Вход/регистрация клиента" })
  @ApiBody({ type: SendCodeDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: SendCodeResponseDto,
  })
  @Post("customer/auth/send-code")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: SendCodeDto) {
    return this.customersService.sendCode(dto);
  }

  @ApiOperation({ summary: "Подтверждение кода" })
  @ApiBody({ type: VerifyCodeDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: VerifyCodeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Неверный код",
    type: NotFoundDto,
  })
  @Post("customer/auth/verify")
  @HttpCode(HttpStatus.OK)
  verify(@Body() dto: VerifyCodeDto, @Ip() customerIp) {
    return this.customersService.verifyCode(dto, customerIp);
  }

  @Get("customer/me")
  @AuthorizationCustomer()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Получение личной информации клиента" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: CustomerMeDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @HttpCode(HttpStatus.OK)
  getMe(@AuthorizedCustomer("id") customerId: string) {
    return this.customersService.getMe(customerId);
  }

  @Get("check/customer/auth")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Проверка валидности токена для клиента" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: GlobalSuccessDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @UseGuards(AuthCustomerGuard)
  @HttpCode(HttpStatus.OK)
  check() {
    return { success: true };
  }

  /**
    ===== ОТ ЛИЦА КОМПАНИИ =====
  **/

  /** === СОЗДАНИЕ КЛИЕНТА === **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Создание клиента от лица компании" })
  @ApiBody({ type: CustomerCompanyDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "success",
    type: CustomerCompanyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Post("company/customer")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("company-customer:create")
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CustomerCompanyDto, @Req() req) {
    const companyId = req.user.companyId;
    return this.customersService.createForCompany(dto, companyId);
  }

  /** === СПИСОК КЛИЕНТОВ === **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Просмотр клиентов локации" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: undefined,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("company/customer")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("company-customers:read")
  @HttpCode(HttpStatus.OK)
  getCustomerForLocation(@Query() query: GetCustomersDto, @Req() req) {
    const companyId = req.user.companyId;
    return this.customersService.getCustomerForLocation(companyId, query);
  }

  /** === ДЕТАЛЬНАЯ ИНФОРМАЦИЮ О КЛИЕНТЕ === **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Детальная информация о клиенте" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: undefined,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("company/customer/:customer_id")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, CompanyGuard, ScopeGuard)
  @Scopes("company-customer:read")
  @HttpCode(HttpStatus.OK)
  getCustomerDetailForLocation(
    @Param("customer_id") customerId: string,
    @Authorized("id") userId: string,
    @Req() req,
  ) {
    const companyId = req.user.companyId;
    return this.customersService.getCustomerDetailForLocation(
      customerId,
      companyId,
      userId,
    );
  }

  /** === ИНФОРМАЦИЮ О БРОНИ КЛИЕНТА === **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Информация о бронирований клиента" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: undefined,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("customer/bookings/:customer_id")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, CompanyGuard, ScopeGuard)
  @Scopes("company-customer-bookings:read")
  @HttpCode(HttpStatus.OK)
  getCustomerBookingsForLocation(
    @Param("customer_id") customerId: string,

    @Req() req,
  ) {
    const companyId = req.user.companyId;
    return this.customersService.getCustomerBookingsForLocation(
      customerId,
      companyId,
    );
  }
}
