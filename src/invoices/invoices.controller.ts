import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { Scopes } from "src/access/decorator/scopes.decorator";
import { CompanyGuard } from "src/access/guard/company.guard";
import { Response } from "express";
import { GetInvoicesDto } from "./dto/get-invoices.dto";

@ApiTags("Чеки")
@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /*
    ===== СКАЧИВАНИЕ ЧЕКА =====
  */
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Скачать чек",
  })
  @ApiParam({
    name: "invoice_id",
    example: "a81b90e4-5a76-4870-84be-c9732b9b22c1",
    description: "ID чеека",
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
  @Get("invoice/:invoice_id/download")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("invoice:download")
  download(
    @Req() req,
    @Param("invoice_id") invoiceId: string,
    @Res() res: Response,
  ) {
    const companyId = req.user.companyId;
    return this.invoicesService.download(invoiceId, companyId, res);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение всех чеков",
    description: "Возвращает список всех чеков",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список чеков",
    type: undefined,
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
  @Get("invoice")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("invoices:read")
  @HttpCode(HttpStatus.OK)
  getAll(@Query() query: GetInvoicesDto, @Req() req) {
    const companyId = req.user.companyId;
    return this.invoicesService.getAll(companyId, query);
  }
}
