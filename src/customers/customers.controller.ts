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
  Version,
} from "@nestjs/common";
import { CustomersService } from "./customers.service";
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
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger/dist/decorators";
import { UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { LocationGuard } from "src/access/guard/location.guard";
import { GetCustomersDto } from "./dto/get-customers.dto";
import { Authorized } from "src/auth/decorators/authorized.decorator";
import { GetBookingsDto } from "src/bookings/dto/get-bookings.dto";

@ApiTags("Клиенты")
@Controller()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /** === СОЗДАНИЕ КЛИЕНТА === **/
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Создание клиента от лица компании (старый вариант)",
  })
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
  createOld(@Body() dto: CustomerCompanyDto, @Req() req) {
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

  /**
    ===== ИНФОРМАЦИЮ О БРОНИ КЛИЕНТА =====
  **/
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
    @Query() query: Omit<GetBookingsDto, "customer">,
    @Req() req,
  ) {
    const companyId = req.user.companyId;
    return this.customersService.getCustomerBookingsForLocation(
      customerId,
      companyId,
      query,
    );
  }

  /**
    ===== ПРОВЕРКА НА СУЩЕСТВОВАНИЕ КЛИЕНТА В КОМПАНИИ =====
  **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Проверка на существование клиента в компании" })
  @ApiParam({
    name: "phone",
    example: "+7 (999) 999 99-99",
    description: "Номер телефона",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("customer/check/:phone")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("company-customer:check")
  @HttpCode(HttpStatus.OK)
  checkCustomerInCompany(@Param("phone") phone: string, @Req() req) {
    const companyId = req.user.companyId;
    return this.customersService.checkCustomerInCompany(phone, companyId);
  }

  /** === СОЗДАНИЕ КЛИЕНТА === **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Создание клиента" })
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
  @Version("2")
  @Post("company/customer")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("company-customer:create")
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CustomerCompanyDto, @Req() req) {
    const companyId = req.user.companyId;
    return this.customersService.createCustomer(dto, companyId);
  }
}
