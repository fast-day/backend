import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { MinioService } from "src/minio/minio.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ICreateInvoiceParams } from "./types/create-invoice.type";
import { generateInvoicePdf } from "./utils/invoice-pdf.util";
import { Response } from "express";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly minioService: MinioService,
  ) {}

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

    const stream = await this.minioService.getFileStream(
      "invoices",
      `${invoice.tag}.pdf`,
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.tag}.pdf"`,
    });

    stream.pipe(res);
  }
}
