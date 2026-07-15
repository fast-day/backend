import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CompanyService } from "./company.service";
import { CreateCompanyDto } from "./dto/create.dto";
import { Authorization } from "src/auth/decorators/auth.decorator";
import { Authorized } from "src/auth/decorators/authorized.decorator";
import { SpecializationService } from "./specialization.service";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  IndustryDto,
  SpecializationDto,
  SpecializationResponseDto,
} from "./dto/specialization/specialization.dto";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { Scopes } from "src/access/decorator/scopes.decorator";
import { AuthGuard } from "src/auth/guard/auth.guard";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger/dist/decorators";
import { NotFoundDto, UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { UploadAvatarDto } from "src/shared/dto/file-uploaddto";
import { GlobalSuccessDto } from "src/shared/dto/global.dto";
import { BufferedFile } from "src/minio/file.model";
import { UpdateCompanyDto } from "./dto/update.dto";
import { CompanyGuard } from "src/access/guard/company.guard";
import { MeDto } from "src/user/dto/me.dto";

@ApiTags("Компании")
@Controller("company")
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly specializationService: SpecializationService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Создание компании" })
  @ApiBody({ type: CreateCompanyDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "created",
    type: MeDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @UseGuards(AuthGuard, LoadUserGuard, ScopeGuard)
  @Scopes("company:create")
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateCompanyDto,
    @Authorized("id") userId: string,
  ) {
    return this.companyService.create(dto, userId);
  }

  @Patch()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Редактирование компании" })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("company:update")
  @HttpCode(HttpStatus.OK)
  async update(@Body() dto: UpdateCompanyDto, @Req() req) {
    const companyId = req.user.companyId;
    return this.companyService.update(companyId, dto);
  }

  // specializations
  @ApiExcludeEndpoint(true)
  @Post("admin/specialization/create")
  @UseGuards(AuthGuard, LoadUserGuard, ScopeGuard)
  @Scopes("programmer&developer:specialization_create")
  @HttpCode(HttpStatus.CREATED)
  createProjectWork(@Body() dto: SpecializationDto) {
    return this.specializationService.create(dto);
  }

  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Специализации" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: SpecializationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
    type: NotFoundDto,
  })
  @Get("specializations")
  @HttpCode(HttpStatus.OK)
  getProjectWorks() {
    return this.specializationService.getAll();
  }

  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Индустрии специализации" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: IndustryDto,
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
    type: NotFoundDto,
  })
  @Get("industry/:specialization_id")
  @HttpCode(HttpStatus.OK)
  getWorkSpecializations(@Param("specialization_id") specializationId: number) {
    return this.specializationService.getIndustry(specializationId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Загрузить логотип компании" })
  @ApiBody({ type: UploadAvatarDto })
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
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
    type: NotFoundDto,
  })
  @Post("upload/logo")
  @UseGuards(AuthGuard, LoadUserGuard, ScopeGuard)
  @Scopes("company-logo:upload")
  @UseInterceptors(FileInterceptor("file"))
  @HttpCode(HttpStatus.OK)
  upload(@UploadedFile() file: BufferedFile, @Req() req) {
    const companyId = req.user.companyId;
    return this.companyService.uploadLogo(file, companyId);
  }
}
