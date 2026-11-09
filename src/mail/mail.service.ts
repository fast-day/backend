import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BookingStatus } from "@prisma/client";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { getFullName } from "src/shared/utils/get-full-name.util";

interface IBookingWithRelationService {
  booking_service_id: string;
  booking_service_start_time: string;
  booking_service_end_time: string;
  booking_service_duration: number;
  booking_service_price: number;
  booking_service_count: number;
  service: {
    service_id: string;
    name: string;
    duration: number;
    avatar: string | null;
    prices: {
      price?: number | null;
      cost_price?: number | null;
    };
  };
}

interface BookingWithRelations {
  id: string;
  status: BookingStatus;
  tag: string | null;
  start_time: string;
  calendar: {
    google: string;
    outlook: string;
    apple: string;
  };
  end_time: string;
  date: string;
  comment: string | null;
  customer: {
    id: string;
    phone: string;
    full_name: string;
    first_name: string | null;
    last_name: string | null;
    avatar: string | null;
  };
  services: IBookingWithRelationService[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly url = "https://postbox.cloud.yandex.net";
  private readonly from: string;
  private readonly client: SESv2Client;

  constructor(conf: ConfigService) {
    this.from = conf.getOrThrow<string>("MAIL_FROM");
    this.client = new SESv2Client({
      region: "ru-central1",
      endpoint: this.url,
      credentials: {
        accessKeyId: conf.getOrThrow<string>("YANDEX_POSTBOX_KEY_ID"),
        secretAccessKey: conf.getOrThrow<string>("YANDEX_POSTBOX_SECRET"),
      },
    });
  }

  async send(to: string, subject: string, html: string, text?: string) {
    try {
      await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: this.from,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: "UTF-8" },
              Body: {
                Html: { Data: html, Charset: "UTF-8" },
                ...(text && { Text: { Data: text, Charset: "UTF-8" } }),
              },
            },
          },
        }),
      );
    } catch (e) {
      this.logger.error(
        `Mail to ${to} failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async sendLocationAddedNotify(email: string, name: string) {
    try {
      await this.send(
        email,
        name,
        this.locationAddedTemplate(name),
        "Вас добавили в новую локацию",
      );
    } catch (err) {
      this.logger.error(`Ошибка отправки уведомления ${email}`, err);
    }
  }

  async sendInviteNotify(email: string, name: string, url: string) {
    try {
      await this.send(
        email,
        name,
        this.inviteTemplate(name, url),
        "Приглашение на регистрацию",
      );
    } catch (err) {
      console.log("Приглашение на регистрацию err", err);
      this.logger.error(`Ошибка отправки приглашения ${email}`, err);
    }
  }

  async systemSendNewBookingNotify(
    email: string,
    booking: BookingWithRelations,
  ) {
    try {
      await this.send(
        email,
        "У вас новая запись",
        this.newBookingTemplate(booking),
        `Новая запись от ${booking.customer.full_name}`,
      );
    } catch (err) {
      this.logger.error(
        `Ошибка отправки уведомления психологу о записи ${email}`,
        err,
      );
    }
  }

  async sendCustomerNewBookingNotify(
    email: string | null,
    booking: BookingWithRelations,
  ) {
    if (!email) return;

    try {
      await this.send(
        email,
        "Новая запись",
        this.customerBooked(booking),
        `Запись успешно оформлена`,
      );
    } catch (err) {
      this.logger.error(
        `Ошибка отправки уведомления клиенту о записи ${email}`,
        err,
      );
    }
  }

  private inviteTemplate(name: string, inviteUrl: string): string {
    return `
    <div style="background:#f5f0eb;padding:24px;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#fffcf9;border-radius:10px;overflow:hidden;border:1px solid #e1dcd6;">
        <div style="background:#322c27;padding:28px 36px 24px;">
          <span style="font-size:18px;font-weight:bold;color:#efeae4;letter-spacing:0.04em;">FastDay</span>
        </div>
        <div style="padding:32px 36px;">
          <p style="font-size:20px;font-weight:bold;color:#322c27;margin:0 0 6px;">Привет, ${name}! 👋</p>
          <p style="font-size:14px;color:#5b5046;margin:0 0 28px;">Вас пригласили зарегистрироваться в системе. Нажмите кнопку ниже, чтобы завершить регистрацию.</p>
          <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;background:#322c27;color:#efeae4;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;margin-bottom:28px;">
            Завершить регистрацию →
          </a>
          <p style="font-size:12px;color:#8a7f76;margin:0;">Ссылка действует 7 дней. Если вы не ожидали это письмо — просто проигнорируйте его.</p>
        </div>
        <div style="background:#efeae4;padding:20px 36px;border-top:1px solid #e1dcd6;font-size:12px;color:#8a7f76;line-height:1.6;">
          Это письмо отправлено автоматически — отвечать на него не нужно.
        </div>
      </div>
    </div>
  `;
  }

  private locationAddedTemplate(name: string): string {
    return `
      <div style="background:#f5f0eb;padding:24px;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:#fffcf9;border-radius:10px;overflow:hidden;border:1px solid #e1dcd6;">
          <div style="background:#322c27;padding:28px 36px 24px;">
            <span style="font-size:18px;font-weight:bold;color:#efeae4;letter-spacing:0.04em;">FastDay</span>
          </div>
          <div style="padding:32px 36px;">
            <p style="font-size:20px;font-weight:bold;color:#322c27;margin:0 0 6px;">Привет, ${name}! 👋</p>
            <p style="font-size:14px;color:#5b5046;margin:0 0 28px;">Вас добавили в новую локацию. Войдите в систему, чтобы увидеть детали.</p>
            <a href="${process.env.CRM_URL}" style="display:inline-block;padding:14px 28px;background:#322c27;color:#efeae4;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
              Открыть систему →
            </a>
          </div>
          <div style="background:#efeae4;padding:20px 36px;border-top:1px solid #e1dcd6;font-size:12px;color:#8a7f76;line-height:1.6;">
            Это письмо отправлено автоматически — отвечать на него не нужно.
          </div>
        </div>
      </div>
    `;
  }

  private customerBooked(booking: BookingWithRelations): string {
    const { tag, services, date, start_time, calendar } = booking;

    const formatted = new Date(`${date}T${start_time}:00`).toLocaleString(
      "ru-RU",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const h = (s: string) => s.replace(/&/g, "&amp;");

    const servicesHtml = services
      .map(
        (s) => `
        <tr>
          <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; opacity: 0.5; font-size: 15px;">
            Услуга
          </td>
          <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; font-size: 15px; text-align: right;">
            ${s.service.name}
          </td>
        </tr>
      `,
      )
      .join("");

    return `
    <div style="width: 100%; max-width: 600px; margin: 24px auto; border: 1px solid #5b50461a; border-radius: 32px; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif; color: #322c27; overflow: hidden;">

      <div style="padding: 24px 32px; border-bottom: 1px solid #eceef2;">
        <span style="display: inline-block; padding: 8px 16px; border-radius: 16px; background-color: #5b504614; color: #322c27; font-size: 20px; font-weight: 600;">
          FastDay
        </span>
      </div>

      <div style="padding: 32px 32px 0;">
        <h1 style="margin: 16px 0 0; color: #322c27; font-size: 32px; font-weight: 700; line-height: 40px;">
          Ваша запись подтверждена
        </h1>
      </div>

      <div style="padding: 28px 32px 0;">
        <div style="padding: 20px 24px; border-left: 4px solid #5b5046; border-radius: 16px; background-color: #5b504614; color: #322c27; font-size: 22px; font-weight: 700; line-height: 30px;">
          ${formatted}
        </div>
      </div>

      <div style="padding: 16px 32px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; opacity: 0.5; font-size: 15px;">
              Номер записи
            </td>
            <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; font-size: 15px; text-align: right;">
              ${tag}
            </td>
          </tr>

          ${servicesHtml}

          <tr>
            <td style="padding: 20px 0; color: #322c27; font-size: 15px; font-weight: 700;">
              Итого
            </td>
            <td style="padding: 20px 0; color: #322c27; font-size: 15px; font-weight: 700; text-align: right;">
              ${services.reduce((sum, s) => sum + Number(s.booking_service_price), 0).toLocaleString("ru-RU")} руб.
            </td>
          </tr>
        </table>
      </div>

      <div style="padding: 16px 32px 28px; color: #322c27; font-size: 14px; line-height: 24px; text-align: center;">
        Добавить в календарь:
        <a href="${h(calendar.google)}" style="color: #5b5046; font-weight: 600; text-decoration: none;">Google</a>
        ·
        <a href="${h(calendar.outlook)}" style="color: #5b5046; font-weight: 600; text-decoration: none;">Outlook</a>
        ·
        <a href="${h(calendar.apple)}" style="color: #5b5046; font-weight: 600; text-decoration: none;">Apple</a>
      </div>

    </div>
  `;
  }

  private newBookingTemplate(booking: BookingWithRelations): string {
    const { customer, services, date, start_time, comment, tag } = booking;

    const bookingUrl = `${process.env.APP_BASE_URL}/bookings/${booking.id}`;

    const formatted = new Date(`${date}T${start_time}:00`).toLocaleString(
      "ru-RU",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const servicesHtml = services
      .map(
        (s) => `
        <tr>
          <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; opacity: 0.5; font-size: 15px;">
            Услуга
          </td>
          <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; font-size: 15px; text-align: right;">
            ${s.service.name}
          </td>
        </tr>
      `,
      )
      .join("");

    return `
    <div style="width: 100%; max-width: 600px; margin: 24px auto; border: 1px solid #5b50461a; border-radius: 32px; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif; color: #322c27; overflow: hidden;">

      <div style="padding: 24px 32px; border-bottom: 1px solid #eceef2;">
        <span style="display: inline-block; padding: 8px 16px; border-radius: 16px; background-color: #5b504614; color: #322c27; font-size: 20px; font-weight: 600;">
          FastDay
        </span>
      </div>

      <div style="padding: 32px 32px 0;">
        <p style="margin: 0; color: #5b5046; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
          Новая запись
        </p>

        <h1 style="margin: 16px 0 0; color: #322c27; font-size: 32px; font-weight: 700; line-height: 40px;">
          У вас новая запись
        </h1>
      </div>

      <div style="padding: 28px 32px 0;">
        <div style="padding: 20px 24px; border-left: 4px solid #5b5046; border-radius: 16px; background-color: #5b504614; color: #322c27; font-size: 22px; font-weight: 700; line-height: 30px;">
          ${formatted}
        </div>
      </div>

      <div style="padding: 16px 32px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; opacity: 0.5; font-size: 15px;">
              Номер записи
            </td>
            <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; font-size: 15px; text-align: right;">
              ${tag}
            </td>
          </tr>

          ${servicesHtml}

          <tr>
            <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; opacity: 0.5; font-size: 15px;">
              Клиент
            </td>
            <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; font-size: 15px; text-align: right;">
              ${getFullName(customer.first_name, customer.last_name)}
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; color: #322c27; opacity: 0.5; font-size: 15px;">
              Номер телефона
            </td>
            <td style="padding: 20px 0; border-bottom: 1px solid #eceef2; font-size: 15px; text-align: right;">
              <a href="tel:${customer.phone}" style="color: #322c27; text-decoration: underline;">
                ${customer.phone}
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 0; color: #322c27; opacity: 0.5; font-size: 15px; vertical-align: top;">
              Комментарий
            </td>
            <td style="padding: 20px 0; color: #322c27; font-size: 15px; text-align: right; white-space: pre-wrap;">
              ${comment || "Не указан"}
            </td>
          </tr>
        </table>
      </div>

      <div style="padding: 24px 32px 32px;">
        <a href="${bookingUrl}" style="display: block; padding: 18px 16px; border-radius: 16px; background-color: #322c27; color: #ffffff; font-size: 17px; font-weight: 600; text-align: center; text-decoration: none;">
          Детали записи
        </a>
      </div>

    </div>
  `;
  }
}
