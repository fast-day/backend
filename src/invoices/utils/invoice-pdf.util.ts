import PDFDocument from "pdfkit";
import path from "path";

const FONT_REGULAR = path.join(
  process.cwd(),
  "assets/fonts/Gilroy-Regular.ttf",
);
const FONT_BOLD = path.join(process.cwd(), "assets/fonts/Gilroy-Bold.ttf");

export function generateInvoicePdf(params: { tag: string }): Promise<Buffer> {
  return new Promise((res, rej) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);

    doc.registerFont("Gilroy-Regular", FONT_REGULAR);
    doc.registerFont("Gilroy-Bold", FONT_BOLD);

    doc
      .font("Gilroy-Bold")
      .fontSize(24)
      .text(`Чек №${params.tag}`, { align: "center" });

    doc.end();
  });
}
