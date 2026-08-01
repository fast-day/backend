import { INVOICE_TYPE } from "@prisma/client";
import { generateInvoicePdf } from "../utils/invoice-pdf.util";

export interface ICreateInvoiceParams {
  orderId: string;
  companyId: string;
  amount: number;
  tag: string;
  type: INVOICE_TYPE;
  snapshot: object;
  pdfParams: Parameters<typeof generateInvoicePdf>[0];
}
