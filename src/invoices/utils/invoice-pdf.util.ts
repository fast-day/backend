import PDFDocument from "pdfkit";
import path from "path";

const FONT_REGULAR = path.join(
  process.cwd(),
  "assets/fonts/Gilroy-Regular.ttf",
);
const FONT_BOLD = path.join(process.cwd(), "assets/fonts/Gilroy-Bold.ttf");

interface IInvoicePdfParams {
  tag: string;
  date: Date;
  timezone?: string; // по умолчанию Europe/Moscow
  seller: { name: string; inn?: string; kpp?: string; address?: string };
  buyer?: { name?: string; phone?: string; email?: string };
  items: { name: string; qty: number; price: number }[]; // цена за единицу, в рублях
  vat?: "none" | 5 | 7 | 10 | 20; // по умолчанию "none"
  paymentMethod: string; // "Банковская карта", "СБП", "Наличные"
  fiscal?: { fn: string; fd: string; fp: string; ofd?: string };
}

const R = "Gilroy-Regular";
const B = "Gilroy-Bold";
const GRAY = "#6b6f78";
const LINE = "#d9dce1";

const money = (n: number) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(n)
    .replace(/[\u00A0\u202F]/g, " ") + " ₽";

export function generateInvoicePdf(p: IInvoicePdfParams): Promise<Buffer> {
  return new Promise((res, rej) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);

    doc.registerFont(R, FONT_REGULAR);
    doc.registerFont(B, FONT_BOLD);

    const L = 50;
    const W = doc.page.width - 100;

    const hr = () => {
      doc.moveDown(0.5);
      doc
        .strokeColor(LINE)
        .lineWidth(1)
        .moveTo(L, doc.y)
        .lineTo(L + W, doc.y)
        .stroke();
      doc.moveDown(0.8);
    };

    const kv = (k: string, v?: string) => {
      if (!v) return;
      const y = doc.y;
      doc.font(R).fontSize(10).fillColor(GRAY).text(k, L, y, { width: 130 });
      doc.fillColor("#000").text(v, L + 130, y, { width: W - 130 });
      doc.moveDown(0.4);
    };

    const xs = [L, L + 250, L + 310, L + 400];
    const ws = [240, 50, 80, 95];
    const aligns = ["left", "right", "right", "right"] as const;

    const row = (cells: string[], font = R, color = "#000") => {
      if (doc.y > doc.page.height - 160) doc.addPage();
      const y = doc.y;
      doc.font(font).fontSize(10).fillColor(color);
      const h = doc.heightOfString(cells[0], { width: ws[0] });
      cells.forEach((c, i) =>
        doc.text(c, xs[i], y, { width: ws[i], align: aligns[i] }),
      );
      doc.y = y + h + 8;
    };

    const total = p.items.reduce((s, i) => s + i.qty * i.price, 0);
    const vat = p.vat ?? "none";
    const vatSum = vat === "none" ? 0 : (total * vat) / (100 + vat);

    const dt = new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: p.timezone ?? "Europe/Moscow",
    }).format(p.date);

    // Заголовок
    doc
      .font(B)
      .fontSize(20)
      .fillColor("#000")
      .text(`Чек №${p.tag}`, L, 50, { width: W });
    doc
      .font(R)
      .fontSize(10)
      .fillColor(GRAY)
      .text("Квитанция об оплате услуг", L, doc.y + 2, { width: W });
    hr();

    // Реквизиты
    kv("Дата и время", dt);
    kv("Продавец", p.seller.name);
    kv(
      "ИНН" + (p.seller.kpp ? " / КПП" : ""),
      p.seller.kpp ? `${p.seller.inn} / ${p.seller.kpp}` : p.seller.inn,
    );
    kv("Адрес расчётов", p.seller.address);
    kv("Покупатель", p.buyer?.name);
    kv("Телефон", p.buyer?.phone);
    kv("Email", p.buyer?.email);
    kv("Способ оплаты", p.paymentMethod);
    hr();

    // Таблица
    row(["Наименование", "Кол-во", "Цена", "Сумма"], R, GRAY);
    doc
      .strokeColor(LINE)
      .moveTo(L, doc.y - 4)
      .lineTo(L + W, doc.y - 4)
      .stroke();
    doc.moveDown(0.3);
    p.items.forEach((i) =>
      row([i.name, String(i.qty), money(i.price), money(i.qty * i.price)]),
    );
    hr();

    const line = (label: string, value: string, font = R, size = 10) => {
      const y = doc.y;
      doc.font(font).fontSize(size).fillColor("#000");
      doc.text(label, L, y, { width: 200 });
      doc.text(value, L + 200, y, { width: W - 200, align: "right" });
      doc.moveDown(0.5);
    };

    line("Итого", money(total), B, 14);
    line(
      vat === "none" ? "НДС" : `в том числе НДС ${vat}%`,
      vat === "none" ? "Без НДС" : money(vatSum),
    );

    // Фискальные данные (если чек пробит через онлайн-кассу)
    if (p.fiscal) {
      hr();
      kv("ФН", p.fiscal.fn);
      kv("ФД", p.fiscal.fd);
      kv("ФП", p.fiscal.fp);
      kv("ОФД", p.fiscal.ofd);
      kv("Сайт ФНС", "www.nalog.gov.ru");
    }

    doc.end();
  });
}
