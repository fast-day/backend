import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { Authorization } from "src/auth/decorators/auth.decorator";
import { Authorized } from "src/auth/decorators/authorized.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { BufferedFile } from "src/minio/file.model";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger/dist/decorators";
import { MeDto } from "./dto/me.dto";
import {
  ConflictDto,
  NotFoundDto,
  UnAuthorizedDto,
} from "src/shared/dto/errors.dto";
import { GlobalSuccessDto } from "src/shared/dto/global.dto";
import { UploadAvatarDto } from "src/shared/dto/file-uploaddto";
import { UserDetailDto } from "./dto/user.dto";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { CompanyGuard } from "src/access/guard/company.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { Scopes } from "src/access/decorator/scopes.decorator";
import { LoadUserGuard } from "./guard/user.guard";
import { ChangePasswordDto } from "./dto/change-password.dto";

@ApiTags("Личная информация")
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
    --- ИНФОРМАЦИЯ О ПРОФИЛЕ --- 
  **/
  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Инфо о профиле" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: MeDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @HttpCode(HttpStatus.OK)
  @Get("me")
  getUser(@Authorized("id") userId: string) {
    return this.userService.findById(userId);
  }

  /** 
    --- ПОИСК ПОЛЬЗОВАТЕЛЯ ПО EMAIL ---
  **/
  @ApiBearerAuth()
  @ApiOperation({ summary: "Получить пользователя по email" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: UserDetailDto,
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
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "conflict",
    type: ConflictDto,
  })
  @Get("user/:email")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("user-find:email")
  @HttpCode(HttpStatus.OK)
  getByEmail(@Req() req, @Param("email") email: string) {
    const companyId = req.user.companyId;
    return this.userService.findUserByEmil(email, companyId);
  }

  /**
    --- ЗАГРУЗКА АВАТАРКИ ПРОФИЛЯ ---
  **/
  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Загрузить аватар" })
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
  @Post("user/avatar/:user_id")
  @UseInterceptors(FileInterceptor("file"))
  @HttpCode(HttpStatus.OK)
  upload(@UploadedFile() file: BufferedFile, @Param("user_id") userId: string) {
    return this.userService.uploadAvatar(file, userId);
  }

  /**
    --- ПРАВА ДОСТУПА ---
  **/
  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Права доступа" })
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
  @Get("me/permission")
  // @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  getPermission(@Authorized("id") userId: string) {
    return this.userService.permission(userId);
  }

  @Post("me/change-password")
  @ApiOperation({ summary: "Изменение пароля" })
  @ApiBody({ type: ChangePasswordDto })
  @UseGuards(AuthGuard, LoadUserGuard)
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: ChangePasswordDto, @Authorized("id") userId: string) {
    return this.userService.changePassword(dto, userId);
  }
}
