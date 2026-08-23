import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SendCodeDto, SendCodeResponseDto } from "./dto/send-code.dto";
import { VerifyCodeDto, VerifyCodeResponseDto } from "./dto/verify.dto";
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
import { CustomersAppService } from "./customers-app.service";

@ApiTags("Клиенты - приложние")
@Controller()
export class CustomersAppController {
  constructor(private readonly customersAppService: CustomersAppService) {}

  @ApiOperation({ summary: "Вход/регистрация" })
  @ApiBody({ type: SendCodeDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: SendCodeResponseDto,
  })
  @Post("customer/auth/send-code")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: SendCodeDto) {
    return this.customersAppService.sendCode(dto);
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
    return this.customersAppService.verifyCode(dto, customerIp);
  }

  @Get("customer/me")
  @AuthorizationCustomer()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Получение личной информации" })
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
    return this.customersAppService.getMe(customerId);
  }

  @Get("check/customer/auth")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Проверка валидности токена" })
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
}
