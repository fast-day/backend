import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { MinioService } from "src/minio/minio.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ICreateInvoiceParams } from "./types/create-invoice.type";
import { generateInvoicePdf } from "./utils/invoice-pdf.util";
import { Response } from "express";
import { formatDateInTimezone } from "src/bookings/utils/format-time.util";
import { DEFAULT_TIMEZONE } from "src/shared/constant/timezone.constant";
import { GetInvoicesDto } from "./dto/get-invoices.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  private readonly logger = new Logger(InvoicesService.name);

  async createInvoiceWithPdf(
    t: Prisma.TransactionClient,
    params: ICreateInvoiceParams,
  ): Promise<string> {
    const invoice = await t.invoice.create({
      data: {
        orderId: params.orderId,
        companyId: params.companyId,
        amount: params.amount,
        tag: params.tag,
        type: params.type,
        status: "success",
        snapshot: params.snapshot,
      },
      select: { id: true, tag: true },
    });

    const pdf = await generateInvoicePdf(params.pdfParams);
    const fileName = `${invoice.tag}.pdf`;
    await this.minioService.uploadDocument(
      "invoices",
      pdf,
      fileName,
      "application/pdf",
    );

    return invoice.id;
  }

  private async safeGetFileStream(key: string, invoiceId: string) {
    try {
      return await this.minioService.getFileStream("invoices", key);
    } catch {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Файл не найден",
          detail: "Документ отсутствует в базе",
          meta: { invoice_id: invoiceId, file_key: key },
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async download(invoiceId: string, companyId: string, res: Response) {
    const invoice = await this.prismaService.invoice.findFirst({
      where: { id: invoiceId, companyId },
      select: { id: true, tag: true },
    });

    if (!invoice?.tag)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Файл не найден",
          detail: "Для этого чека нет сохранённого документа",
          meta: { invoice_id: invoiceId },
        },
        HttpStatus.NOT_FOUND,
      );

    const stream = await this.safeGetFileStream(
      `${invoice.tag}.pdf`,
      invoiceId,
    );

    stream.on("error", (err) => {
      this.logger.error(`Invoice stream failed: ${err.message}`, {
        invoiceId,
        fileKey: invoice.tag,
      });
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          title: "Ошибка при отправке файла",
          detail: "Не удаось передать документ",
        });
      } else {
        res.destroy();
      }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.tag}.pdf"`,
    });

    stream.pipe(res);
  }

  async getAll(companyId: string, query: GetInvoicesDto) {
    const { status, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(status && { status }),
    };

    const [invoices, total] = await Promise.all([
      this.prismaService.invoice.findMany({
        where,
        select: {
          id: true,
          tag: true,
          type: true,
          amount: true,
          status: true,
          orderId: true,
          createdAt: true,
          order: {
            select: {
              tag: true,
            },
          },
          company: {
            select: {
              locations: {
                select: {
                  address: {
                    select: { timezone: true },
                  },
                },
                take: 1,
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prismaService.invoice.count({ where }),
    ]);

    const data = invoices.map((invoice) => {
      const timezone =
        invoice.company.locations[0].address?.timezone ?? DEFAULT_TIMEZONE;

      return {
        id: invoice.id,
        order_id: invoice.orderId,
        order_tag: invoice.order.tag,
        tag: invoice.tag,
        type: invoice.type,
        amount: invoice.amount,
        status: invoice.status,
        date: formatDateInTimezone(invoice.createdAt, timezone),
      };
    });

    return buildPaginatedResponse(data, total, page, limit);
  }
}
