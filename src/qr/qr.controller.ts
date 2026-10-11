import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { QrService } from "./qr.service";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
import { UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { CompanyGuard } from "src/access/guard/company.guard";
import { Response } from "express";
import { AuthGuard } from "src/auth/guard/auth.guard";

@Controller("qr")
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Скачать qr",
  })
  @ApiParam({
    name: "filename",
    example: "filename",
    description: "Название файла",
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
  @Get(":bucket/:file/download")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard)
  download(
    @Req() req,
    @Param("bucket") bucket: string,
    @Param("file") file: string,
    @Res() res: Response,
  ) {
    const companyId = req.user.companyId;
    return this.qrService.download(bucket, file, companyId, res);
  }
}
