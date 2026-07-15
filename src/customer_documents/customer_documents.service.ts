import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { GetCustomerDocumentsQueryDto } from "./dto/get-customer-documents-query.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";
import { CustomerCreateDocumentDto } from "./dto/customer-create-document.dto";
import { buildFileUrl } from "src/shared/utils/build-url";
import { getFullName } from "src/shared/utils/get-full-name.util";
import { CustomerUpdateDocumentDto } from "./dto/customer-update-document.dto";

@Injectable()
export class CustomerDocumentsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getAll(
    customerId: string,
    authorId: string,
    companyId: string,
    query: GetCustomerDocumentsQueryDto,
  ) {
    const customer = await this.prismaService.customerCompany.findUnique({
      where: { id: customerId, companyId },
      select: { customerId: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка клиент не найден",
          detail: "Не удалось получить информацию о клиенте",
          meta: { customer_id: customerId },
        },
        HttpStatus.NOT_FOUND,
      );

    const { search, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const where = {
      customerId: customer.customerId,
      authorId,
      ...(search && { name: search }),
    };

    const [documents, total] = await Promise.all([
      this.prismaService.customerNote.findMany({
        where,
        select: {
          id: true,
          name: true,
          tag: true,
          content: true,
          isPinned: true,
          isArchived: true,
          isLocked: true,
          createdAt: true,
        },
        skip,
        take: limit,
      }),
      this.prismaService.customerNote.count({ where }),
    ]);

    const data = documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      content: doc.content,
      is_pinned: doc.isPinned,
      is_archived: doc.isArchived,
      is_locked: doc.isLocked,
      created: {
        date: doc.createdAt.toISOString().split("T")[0],
        time: doc.createdAt.toISOString().split("T")[1].slice(0, 5),
      },
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  async create(
    dto: CustomerCreateDocumentDto,
    customerId: string,
    authorId: string,
    bookingId?: string,
  ) {
    const customer = await this.prismaService.customerCompany.findUnique({
      where: { id: customerId },
      select: { customerId: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка клиент не найден",
          detail: "Не удалось получить информацию о клиенте",
          meta: { customer_id: customerId },
        },
        HttpStatus.NOT_FOUND,
      );

    const docs = await this.prismaService.customerNote.create({
      data: {
        name: dto.name,
        customerId: customer.customerId,
        authorId,
        bookingId,
      },
      select: {
        id: true,
        name: true,
        tag: true,
        content: true,
        isPinned: true,
        isArchived: true,
        isLocked: true,
        createdAt: true,
      },
    });

    return {
      id: docs.id,
      name: docs.name,
      content: docs.content,
      is_pinned: docs.isPinned,
      is_archived: docs.isArchived,
      is_locked: docs.isLocked,
      created: {
        date: docs.createdAt.toISOString().split("T")[0],
        time: docs.createdAt.toISOString().split("T")[1].slice(0, 5),
      },
    };
  }

  async getById(customerId: string, authorId: string, documentId: string) {
    const customer = await this.prismaService.customerCompany.findUnique({
      where: { id: customerId },
      select: { customerId: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка клиент не найден",
          detail: "Не удалось получить информацию о клиенте",
          meta: { customer_id: customerId },
        },
        HttpStatus.NOT_FOUND,
      );

    const docs = await this.prismaService.customerNote.findUnique({
      where: { id: documentId, customerId: customer.customerId, authorId },
      select: {
        id: true,
        name: true,
        tag: true,
        content: true,
        isPinned: true,
        isArchived: true,
        isLocked: true,
        createdAt: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatar: true,
            birthday: true,
          },
        },
      },
    });

    if (!docs)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка документ не найден",
          detail: "Не удалось открыть документ",
          meta: { customer_id: customerId, document_id: documentId },
        },
        HttpStatus.NOT_FOUND,
      );

    return {
      id: docs.id,
      name: docs.name,
      content: docs.content,
      is_pinned: docs.isPinned,
      is_archived: docs.isArchived,
      is_locked: docs.isLocked,
      created: {
        date: docs.createdAt.toISOString().split("T")[0],
        time: docs.createdAt.toISOString().split("T")[1].slice(0, 5),
      },
      customer: {
        first_name: docs.customer.firstName,
        last_name: docs.customer.lastName,
        full_name: getFullName(docs.customer.firstName, docs.customer.lastName),
        email: docs.customer.email,
        phone: docs.customer.phone,
        birthday: docs.customer.birthday,
        avatar: buildFileUrl(docs.customer.avatar),
      },
    };
  }

  async update(
    dto: CustomerUpdateDocumentDto,
    customerId: string,
    authorId: string,
    documentId: string,
  ) {
    const customer = await this.prismaService.customerCompany.findUnique({
      where: { id: customerId },
      select: { customerId: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка клиент не найден",
          detail: "Не удалось получить информацию о клиенте",
          meta: { customer_id: customerId },
        },
        HttpStatus.NOT_FOUND,
      );

    const docs = await this.prismaService.customerNote.findUnique({
      where: { id: documentId, customerId: customer.customerId, authorId },
      select: { id: true },
    });

    if (!docs)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка документ не найден",
          detail: "Не удалось открыть документ",
          meta: { customer_id: customerId, document_id: documentId },
        },
        HttpStatus.NOT_FOUND,
      );

    const newDocs = await this.prismaService.customerNote.update({
      where: { id: documentId, customerId: customer.customerId, authorId },
      data: {
        name: dto.name,
        content: dto.content,
        isPinned: dto.is_pinned,
        isArchived: dto.is_archived,
        isLocked: dto.is_locked,
      },
      select: {
        id: true,
        name: true,
        tag: true,
        content: true,
        isPinned: true,
        isArchived: true,
        isLocked: true,
        createdAt: true,
      },
    });

    return {
      id: newDocs.id,
      name: newDocs.name,
      content: newDocs.content,
      is_pinned: newDocs.isPinned,
      is_archived: newDocs.isArchived,
      is_locked: newDocs.isLocked,
      created: {
        date: newDocs.createdAt.toISOString().split("T")[0],
        time: newDocs.createdAt.toISOString().split("T")[1].slice(0, 5),
      },
    };
  }
}
