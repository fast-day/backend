import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CustomerDocumentsService } from "./customer_documents.service";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GetCustomerDocumentsQueryDto } from "./dto/get-customer-documents-query.dto";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { CompanyGuard } from "src/access/guard/company.guard";
import { Authorized } from "src/auth/decorators/authorized.decorator";
import { CustomerCreateDocumentDto } from "./dto/customer-create-document.dto";
import { CustomerUpdateDocumentDto } from "./dto/customer-update-document.dto";

@ApiTags("Документы клиента")
@Controller()
export class CustomerDocumentsController {
  constructor(
    private readonly customerDocumentsService: CustomerDocumentsService,
  ) {}

  /*
    ===== СОЗДАНИЕ ДОКУМЕНТА =====
  */
  @ApiOperation({ summary: "Создание документа" })
  @ApiBody({ type: CustomerCreateDocumentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
  })
  @Post("customer/:customer_id/document")
  @UseGuards(AuthGuard, CompanyGuard)
  @HttpCode(HttpStatus.OK)
  create(
    @Param("customer_id") customerId: string,
    @Authorized("id") userId: string,
    @Body() dto: CustomerCreateDocumentDto,
  ) {
    return this.customerDocumentsService.create(dto, customerId, userId);
  }

  /*
    ===== ПОЛУЧЕНИЕ СПИСКА ДОКУМЕНТОВ КЛИЕНТА =====
  */
  @ApiOperation({ summary: "Получить документы клиента" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
  })
  @Get("customer/:customer_id/documents")
  @UseGuards(AuthGuard, CompanyGuard)
  @HttpCode(HttpStatus.OK)
  getAll(
    @Param("customer_id") customerId: string,
    @Authorized("id") userId: string,
    @Query() query: GetCustomerDocumentsQueryDto,
    @Req() req,
  ) {
    const companyId = req.user.companyId;
    return this.customerDocumentsService.getAll(
      customerId,
      userId,
      companyId,
      query,
    );
  }

  /*
    ===== ПОЛУЧЕНИЕ ДОКУМЕНТА =====
  */
  @ApiOperation({ summary: "Получение документа" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
  })
  @Get("customer/:customer_id/documents/:document_id")
  @UseGuards(AuthGuard, CompanyGuard)
  @HttpCode(HttpStatus.OK)
  getById(
    @Param("customer_id") customerId: string,
    @Param("document_id") documentId: string,
    @Authorized("id") userId: string,
  ) {
    return this.customerDocumentsService.getById(
      customerId,
      userId,
      documentId,
    );
  }

  /*
    ===== РЕДАКТИРОВАНИЕ ДОКУМЕНТА =====
  */
  @ApiOperation({ summary: "Редактирование документа" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
  })
  @Patch("customer/:customer_id/documents/:document_id")
  @UseGuards(AuthGuard, CompanyGuard)
  @HttpCode(HttpStatus.OK)
  update(
    @Param("customer_id") customerId: string,
    @Param("document_id") documentId: string,
    @Authorized("id") userId: string,
    @Body() dto: CustomerUpdateDocumentDto,
  ) {
    return this.customerDocumentsService.update(
      dto,
      customerId,
      userId,
      documentId,
    );
  }
}
