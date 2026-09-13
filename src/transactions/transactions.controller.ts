import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Body,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger/dist/decorators";
import { TransactionsService } from "./transactions.service";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { CompanyGuard } from "src/access/guard/company.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { Scopes } from "src/access/decorator/scopes.decorator";
import { GetTransactionsDto } from "./dto/get-transactions.dto";
import { UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { CreateTransactionDto } from "./dto/create-transaction.dto";

@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Создание транзакции",
    description: "Создание транзакции",
  })
  @ApiBody({ type: CreateTransactionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Транзакция успешно создана",
    type: undefined,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Post()
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("transactions:create")
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req, @Body() dto: CreateTransactionDto) {
    const companyId = req.user.companyId;
    return this.transactionsService.create(companyId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение списка транзакций",
    description: "Получение списка транзакций",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get()
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("transactions:write")
  @HttpCode(HttpStatus.OK)
  getAll(@Req() req, @Query() query: GetTransactionsDto) {
    const companyId = req.user.companyId;
    return this.transactionsService.getAll(companyId, query);
  }

  @Delete(":transaction_id")
  delete(@Param("transaction_id") transactionId: string) {
    return this.transactionsService.delete(transactionId);
  }
}
