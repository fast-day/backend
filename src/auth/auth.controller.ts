import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Ip } from "src/shared/decorators/ip.decorator";
import { RefreshRequestDto } from "./dto/refresh.dto";
import { Response } from "express";
import { IS_DEV_ENV, SAME_SITE } from "src/shared/utils/is-dev";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger/dist/decorators";
import { AuthGuard } from "./guard/auth.guard";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { GlobalSuccessDto } from "src/shared/dto/global.dto";
import { UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { LogoutDto } from "./dto/logout.dto";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { Authorized } from "./decorators/authorized.decorator";

@ApiTags("Авторизация")
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("auth/register")
  @ApiOperation({ summary: "Регистрация" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "success",
    type: AuthResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto, @Ip() userIp) {
    return this.authService.register(dto, userIp);
  }

  @Post("auth/login")
  @ApiOperation({ summary: "Авторизация" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: AuthResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Ip() userIp) {
    return this.authService.login(dto, userIp);
  }

  @Post("auth/refresh")
  @ApiOperation({ summary: "Refresh" })
  @ApiBody({ type: RefreshRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: RefreshRequestDto,
  })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshRequestDto,
    @Ip() userIp: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } =
      await this.authService.refreshTokens(
        dto.refresh_token,
        dto.old_token,
        userIp,
      );

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: !IS_DEV_ENV,
      sameSite: SAME_SITE,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { access_token };
  }

  @Get("check/auth")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Проверка авторизации" })
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
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  checkAuth() {
    return { success: true };
  }

  @Post("auth/logout")
  @ApiOperation({ summary: "Выход" })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: GlobalSuccessDto,
  })
  @UseGuards(AuthGuard, LoadUserGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: LogoutDto, @Authorized("id") userId: string) {
    return this.authService.logout(dto.token, userId);
  }
}
