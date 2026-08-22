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
import { DirectoriesService } from "./directories.service";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { CompanyGuard } from "src/access/guard/company.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { Scopes } from "src/access/decorator/scopes.decorator";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger/dist/decorators";
import { UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { DirectoryEmployee } from "./dto/employee.dto";
import { DirectoryLocation } from "./dto/location.dto";
import { DirectoryService } from "./dto/service.dto";
import { AuthorizationCustomer } from "src/customers/decorators/auth.decorator";
// import { LocationGuard } from "src/access/guard/location.guard";

@ApiTags("Директории")
@Controller("directory")
export class DirectoriesController {
  constructor(private readonly directoriesService: DirectoriesService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: "Список всех сотрудников работающих в компании" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список сотрудников",
    type: DirectoryEmployee,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("employees")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("directory:employees")
  @HttpCode(HttpStatus.OK)
  getEmployees(@Req() req) {
    const companyId = req.user.company.id;
    return this.directoriesService.employees(companyId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Список всех сотрудников работающих в локации" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список сотрудников работающих в локации",
    type: DirectoryEmployee,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("employees/:location_id")
  // @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, LocationGuard, ScopeGuard)
  // @Scopes("directory:location-employees")
  @HttpCode(HttpStatus.OK)
  getLocationEmployees(
    @Param("location_id") locationId: string,
    @Query("month") month?: string,
    @Query("year") year?: string,
  ) {
    return this.directoriesService.locationEmployees(locationId, month, year);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Список всех клиентов компании" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список клиентов",
    type: undefined,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("customers")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("directory:customers")
  @HttpCode(HttpStatus.OK)
  customersCompany(@Req() req) {
    const companyId = req.user.company.id;
    return this.directoriesService.customersCompany(companyId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Список всех локаций компании" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список локаций",
    type: DirectoryLocation,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("locations")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("directory:locations")
  @HttpCode(HttpStatus.OK)
  getLocations(@Req() req) {
    const companyId = req.user.company.id;
    return this.directoriesService.locations(companyId);
  }

  // ===== ДЛЯ КЛИЕНТА =====
  @AuthorizationCustomer()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Список всех локаций компании - для клиента" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список локаций",
    type: DirectoryLocation,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("locations/:company_name")
  @HttpCode(HttpStatus.OK)
  getBookingLocations(@Param("company_name") company_name: string) {
    return this.directoriesService.bookingLocations(company_name);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Список услуг компании" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список услуг",
    type: DirectoryService,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("services")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("directory:services")
  @HttpCode(HttpStatus.OK)
  getServices(@Req() req) {
    const companyId = req.user.company.id;
    return this.directoriesService.services(companyId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Список услуг локации" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список услуг локации",
    type: DirectoryService,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("services/:location_id")
  // @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, LocationGuard, ScopeGuard)
  // @Scopes("directory:location-services")
  @HttpCode(HttpStatus.OK)
  getLocationServices(@Param("location_id") locationId: string) {
    return this.directoriesService.locationServices(locationId);
  }

  /**
    ===== РАСПИСАНИЕ СОТРУДНИКА И СВОБОДНЫЕ СЛОТЫ =====
  **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Свободные слоты сотрудника" })
  @Get("employee/slots/:user_id/:location_id")
  getCustomerSlots(
    @Param("user_id") userId: string,
    @Param("location_id") locationId: string,
    @Query("date") date: string,
    @Query("duration") duration: number,
  ) {
    return this.directoriesService.employeeSlots(
      userId,
      locationId,
      date,
      duration,
    );
  }

  /**
    ===== СПЕЦИАЛИЗАЦИИ =====
  **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Специализации" })
  @Get("specializations")
  getSpecialization() {
    return this.directoriesService.getSpecialization();
  }

  /**
    ===== СПИСОК ГОРОДОВ =====
  **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Список городов" })
  @Get("cities")
  getCities() {
    return this.directoriesService.getCities();
  }
}
