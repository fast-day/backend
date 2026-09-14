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
  Patch,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger/dist/decorators";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { CompanyGuard } from "src/access/guard/company.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { Scopes } from "src/access/decorator/scopes.decorator";
import { NotFoundDto, UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { TransactionCategoriesService } from "./transaction-categories.service";
import {
  TransactionCategoryDto,
  UpdateTransactionCategoryDto,
} from "./dto/category.dto";
import { GetTransactionCategoryQueryDto } from "./dto/get-category-query.dto";

@ApiTags("Категории для транзакций")
@Controller("transactions/category")
export class TransactionCategoriesController {
  constructor(
    private readonly transactionCategoriesService: TransactionCategoriesService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Создание категории",
    description: "Создание категории",
  })
  @ApiBody({ type: TransactionCategoryDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Добавлена новая категория",
    type: undefined,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Post()
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("transactions-category:create")
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req, @Body() dto: TransactionCategoryDto) {
    const companyId = req.user.companyId;
    return this.transactionCategoriesService.create(companyId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Редактирование категории",
    description: "Редактирование категории",
  })
  @ApiBody({ type: UpdateTransactionCategoryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Категория обновлена",
    type: undefined,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Категория не найдена",
    type: NotFoundDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Patch(":category_id")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("transactions-category:update")
  @HttpCode(HttpStatus.CREATED)
  update(
    @Req() req,
    @Param("category_id") categoryId: number,
    @Body() dto: UpdateTransactionCategoryDto,
  ) {
    const companyId = req.user.companyId;
    return this.transactionCategoriesService.update(companyId, categoryId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Получение списка категорий",
    description: "Получение списка категорий",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: undefined,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get()
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("transactions-category:write")
  @HttpCode(HttpStatus.OK)
  getAll(@Req() req, @Query() query: GetTransactionCategoryQueryDto) {
    const companyId = req.user.companyId;
    return this.transactionCategoriesService.getAll(companyId, query);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Удаление категории",
    description: "Удаление категории",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Категория удалена",
    type: undefined,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Категория не найдена",
    type: NotFoundDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Delete(":category_id")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard, ScopeGuard)
  @Scopes("transactions-category:delete")
  @HttpCode(HttpStatus.OK)
  delete(@Req() req, @Param("category_id") categoryId: number) {
    const companyId = req.user.companyId;
    return this.transactionCategoriesService.delete(companyId, categoryId);
  }
}
