import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { BookingStatus } from "@prisma/client";

interface IBookingWithRelationService {
  booking_service_id: string;
  booking_service_price: number | null;
  booking_service_count: number;
  booking_service_duration: number | null;
  service: {
    id: string;
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
  end_time: string;
  date: Date;
  comment: string | null;
  customer: {
    id: string;
    phone: string;
    full_name: string;
    first_name: string | null;
    last_name: string | null;
    avatar: string | null;
  };
  employee: {
    id: string;
    first_name: string;
    last_name: string | null;
    full_name: string;
    avatar: string | null;
    phone: string;
  };
  services: IBookingWithRelationService[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiUrl =
    "https://api.rusender.ru/api/v1/external-mails/send";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private formatDate(date: Date): string {
    const months = [
      "января",
      "февраля",
      "марта",
      "апреля",
      "мая",
      "июня",
      "июля",
      "августа",
      "сентября",
      "октября",
      "ноября",
      "декабря",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  private async send(
    to: string,
    toName: string,
    subject: string,
    html: string,
  ) {
    await firstValueFrom(
      this.httpService.post(
        this.apiUrl,
        {
          idempotencyKey: crypto.randomUUID(),
          mail: {
            to: { email: to, name: toName },
            from: {
              email: this.configService.get("MAIL_FROM"),
              name: this.configService.get("MAIL_FROM_NAME"),
            },
            subject,
            html,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": this.configService.get("RUSENDER_API_KEY"),
          },
        },
      ),
    );
  }

  async sendLocationAddedNotify(email: string, name: string) {
    try {
      await this.send(
        email,
        name,
        "Вас добавили в новую локацию",
        this.locationAddedTemplate(name),
      );
      console.log("Вас добавили в новую локацию:", email, name);
    } catch (err) {
      console.log(" Вас добавили в новую локацию err", err);
      this.logger.error(`Ошибка отправки уведомления ${email}`, err);
    }
  }

  async sendInviteNotify(email: string, name: string, url: string) {
    try {
      await this.send(
        email,
        name,
        "Приглашение на регистрацию",
        this.inviteTemplate(name, url),
      );
      console.log("Приглашение на регистрацию:", email, name, url);
    } catch (err) {
      console.log("Приглашение на регистрацию err", err);
      this.logger.error(`Ошибка отправки приглашения ${email}`, err);
    }
  }

  async sendNewBookingNotify(email: string, booking: BookingWithRelations) {
    try {
      await this.send(
        email,
        booking.employee.full_name,
        `Новая запись от ${booking.customer.full_name}`,
        this.newBookingTemplate(booking),
      );
      console.log("Уведомление о новой записи отправлено:", email);
    } catch (err) {
      console.log("sendNewBookingNotify err", err);
      this.logger.error(`Ошибка отправки уведомления о записи ${email}`, err);
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

  private newBookingTemplate(booking: BookingWithRelations): string {
    const {
      employee,
      customer,
      services,
      date,
      start_time,
      end_time,
      comment,
      tag,
    } = booking;
    const bookingUrl = `${process.env.APP_BASE_URL}/bookings/${booking.id}`;
    const formattedDate = this.formatDate(date);

    // const totalPrice = services.reduce(
    //   (sum, s) => sum + Number(s.booking_service_price),
    //   0,
    // );
    // const price = totalPrice ? `${totalPrice} ₽` : "по договорённости";

    const commentBlock = comment
      ? `
    <div style="background:#fff8e8;border-left:3px solid #EF9831;border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:bold;color:#b8860b;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Комментарий клиента</div>
      <div style="font-size:13px;color:#5b5046;">${comment}</div>
    </div>
  `
      : "";

    const servicesCount = services.length;

    const servicesHtml = services
      .map((s) => {
        const servicePrice = s.booking_service_price ?? s.service.prices.price;
        const priceLabel = servicePrice
          ? `${servicePrice} ₽`
          : "по договорённости";
        const duration = s.booking_service_duration ?? s.service.duration;

        return `
      <div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid #e1dcd6;">
        <div style="width:34px;height:34px;border-radius:8px;background:#e5e1db;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">✂️</div>
        <div style="flex:1;">
          <div style="font-size:14px;color:#322c27;font-weight:500;">${s.service.name} · ${duration} мин</div>
          <div style="font-size:12px;color:#8a7f76;margin-top:2px;">${priceLabel}${s.booking_service_count > 1 ? ` · x${s.booking_service_count}` : ""}</div>
        </div>
      </div>`;
      })
      .join("");

    return `
    <div style="background:#f5f0eb;padding:24px;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#fffcf9;border-radius:10px;overflow:hidden;border:1px solid #e1dcd6;">

        <div style="background:#322c27;padding:28px 36px 24px;">
          <span style="font-size:18px;font-weight:bold;color:#efeae4;letter-spacing:0.04em;">FastDay</span>
        </div>

        <div style="padding:32px 36px;">
          <p style="font-size:20px;font-weight:bold;color:#322c27;margin:0 0 6px;">Привет, ${employee.first_name}! 👋</p>
          <p style="font-size:14px;color:#5b5046;margin:0 0 28px;">К вам записался новый клиент. Вот детали бронирования:</p>

          <div style="background:#f0ebe5;border:1px solid #e1dcd6;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <div style="background:#5b5046;padding:12px 20px;font-size:11px;font-weight:bold;color:#efeae4;letter-spacing:0.08em;text-transform:uppercase;">
              Детали записи · ${tag ?? booking.id}
            </div>
            <div style="padding:20px;">

              <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;">
                <div style="width:34px;height:34px;border-radius:8px;background:#e5e1db;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">👤</div>
                <div>
                  <div style="font-size:11px;color:#8a7f76;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Клиент</div>
                  <div style="font-size:14px;color:#322c27;font-weight:500;">${customer.full_name}</div>
                  <div style="font-size:12px;color:#8a7f76;margin-top:2px;">${customer.phone}</div>
                </div>
              </div>

              <div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <div style="font-size:11px;color:#8a7f76;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;">Услуги</div>
                  <div style="font-size:11px;color:#8a7f76;font-weight:bold;">${servicesCount}</div>
                </div>
                ${servicesHtml}
              </div>

              <div style="height:1px;background:#e5e1db;margin:16px 0;"></div>

              <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;">
                <div style="width:34px;height:34px;border-radius:8px;background:#e5e1db;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">📅</div>
                <div>
                  <div style="font-size:11px;color:#8a7f76;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Дата</div>
                  <div style="font-size:14px;color:#322c27;font-weight:500;">${formattedDate}</div>
                </div>
              </div>

              <div style="display:flex;align-items:flex-start;gap:14px;">
                <div style="width:34px;height:34px;border-radius:8px;background:#e5e1db;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">🕐</div>
                <div>
                  <div style="font-size:11px;color:#8a7f76;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Время</div>
                  <div style="font-size:14px;color:#322c27;font-weight:500;">${start_time} — ${end_time}</div>
                </div>
              </div>

            </div>
          </div>

          ${commentBlock}

          <a href="${bookingUrl}" style="display:inline-block;padding:14px 28px;background:#322c27;color:#efeae4;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;margin-bottom:28px;">
            Открыть запись →
          </a>
        </div>

        <div style="background:#efeae4;padding:20px 36px;border-top:1px solid #e1dcd6;font-size:12px;color:#8a7f76;line-height:1.6;">
          Это письмо отправлено автоматически — отвечать на него не нужно.<br/>
          Если вы не ожидали это уведомление, проигнорируйте его.
        </div>

      </div>
    </div>
  `;
  }
}
