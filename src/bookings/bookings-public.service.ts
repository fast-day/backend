import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { GetPublicBookingDto } from "./dto/public/employee-query.dto";
import { buildImageUrls } from "src/shared/utils/build-url";
import { getFullName } from "src/shared/utils/get-full-name.util";
import { DEFAULT_TIMEZONE } from "src/shared/constant/timezone.constant";
import { WidgetBookingCreateDto } from "./dto/public/booking-create.dto";
import { BookingsService } from "./bookings.service";
import { CustomerChecksService } from "src/customers/customer-checks.service";
import { BookingCreateDto } from "./dto/booking-create.dto";
import { GetSlotsDto } from "./dto/public/slot-query.dto";
import { format, fromZonedTime } from "date-fns-tz";
import { addDays } from "date-fns/addDays";
import { formatIntervalTime } from "src/shared/utils/format-time.util";
import { minutesToUtcDate } from "src/directories/utils/format-minutes.util";
import {
  formatBookingTime,
  formatDateInTimezone,
} from "./utils/format-time.util";
import { getBookingTimeRange } from "./utils/time-range.util";

@Injectable()
export class BookingsPublicService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly customerChecksService: CustomerChecksService,
    private readonly bookingService: BookingsService,
  ) {}

  private async company(publicName: string) {
    const company = await this.prismaService.company.findFirst({
      where: {
        publicName: publicName,
      },
      select: {
        id: true,
        logo: true,
        name: true,
        publicName: true,
        currency: true,
      },
    });

    if (!company)
      throw new HttpException(
        {
          title: "Компания не найдена",
          description: "Не удалось найти компанию или компания не существует",
          detail: { public_name: publicName },
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    return {
      id: company.id,
      logo: buildImageUrls(company.logo, "company-avatars"),
      name: company.name,
      public_name: company.publicName,
      currency: company.currency,
    };
  }

  private async employee(publicCode: number, locationId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { publicCode: Number(publicCode) },
      select: { id: true },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Сотрудник не найден",
          detail: "Не удалось найти сотрудника",
          meta: { user_public_code: publicCode },
        },
        HttpStatus.NOT_FOUND,
      );

    const employee = await this.prismaService.userLocation.findUnique({
      where: { userId_locationId: { userId: user.id, locationId } },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            position: true,
            avatar: true,
          },
        },
        location: {
          select: {
            address: {
              select: {
                timezone: true,
              },
            },
          },
        },
      },
    });

    if (!employee)
      throw new HttpException(
        {
          title: "Сотрудник не найден",
          description: "Не удалось найти сотрудника",
          detail: { employee_id: user.id },
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    return {
      id: employee.id,
      profile: {
        id: employee.userId,
        first_name: employee.user.firstName,
        last_name: employee.user.lastName,
        full_name: getFullName(employee.user.firstName, employee.user.lastName),
        phone: employee.user.phone,
        position: employee.user.position,
        avatar: buildImageUrls(employee.user.avatar, "user-avatars"),
      },
    };
  }

  private async location(companyId: string, publicCode: number) {
    const location = await this.prismaService.location.findFirst({
      where: { companyId, publicCode: Number(publicCode) },
      select: {
        id: true,
        name: true,
        address: {
          select: {
            timezone: true,
          },
        },
      },
    });

    if (!location)
      throw new HttpException(
        {
          title: "Локация не найдеа",
          description: "Не удалось найти локацию",
          detail: { location_id: publicCode },
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    return {
      id: location.id,
      name: location.name,
      timezone: location.address?.timezone ?? DEFAULT_TIMEZONE,
    };
  }

  async check(publicName: string, query: GetPublicBookingDto) {
    const { user_id, location_id } = query;

    const company = await this.company(publicName);
    const location = await this.location(company.id, location_id);
    const employee = await this.employee(user_id, location.id);

    return {
      employee,
      company: {
        ...company,
        location_uuid: location.id,
        timezone: location.timezone,
      },
    };
  }

  async services(publicCode: number) {
    const user = await this.prismaService.user.findUnique({
      where: { publicCode: Number(publicCode) },
      select: { id: true },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Сотрудник не найден",
          detail: "Не удалось найти сотрудника",
          meta: { user_public_code: publicCode },
        },
        HttpStatus.NOT_FOUND,
      );

    const services = await this.prismaService.service.findMany({
      where: { users: { some: { userId: user.id } } },
      select: {
        id: true,
        name: true,
        mark: true,
        duration: true,
        publicCode: true,
        price: {
          select: {
            price: true,
            costPrice: true,
            requiresDeposit: true,
            depositPercent: true,
            cancellationDeadlineHours: true,
          },
        },
        discount: {
          select: {
            price: true,
            days: true,
            timeStart: true,
            timeEnd: true,
          },
        },
        category: true,
        avatar: true,
      },
    });

    return services.map((service) => ({
      uuid: service.id,
      id: service.publicCode,
      name: service.name,
      mark: service.mark,
      duration: service.duration,
      category: service.category,
      avatar: buildImageUrls(service.avatar, "service-avatars"),
      price: {
        price: service.price?.price,
        const_price: service.price?.costPrice,
        requires_deposit: service.price?.requiresDeposit,
        deposit_percent: service.price?.depositPercent,
        cancellation_deadline_hours: service.price?.cancellationDeadlineHours,
      },
      discount: {
        price: service.discount?.price,
        days: service.discount?.days,
        time_start: service.discount?.timeStart,
        time_end: service.discount?.timeEnd,
      },
    }));
  }

  async service(publicCode: number) {
    const service = await this.prismaService.service.findUnique({
      where: { publicCode },
      select: {
        id: true,
        name: true,
        duration: true,
        publicCode: true,
        mark: true,
        price: {
          select: {
            price: true,
            costPrice: true,
            requiresDeposit: true,
            depositPercent: true,
            cancellationDeadlineHours: true,
          },
        },
        discount: {
          select: {
            price: true,
            days: true,
            timeStart: true,
            timeEnd: true,
          },
        },
        category: true,
        avatar: true,
      },
    });

    if (!service)
      throw new HttpException(
        {
          title: "Услуга не найдеа",
          description: "Не удалось загрузить информацию",
          detail: { service_id: publicCode },
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    return {
      uuid: service.id,
      id: service.publicCode,
      name: service.name,
      mark: service.mark,
      duration: service.duration,
      category: service.category,
      avatar: buildImageUrls(service.avatar, "service-avatars"),
      price: {
        price: service.price?.price,
        const_price: service.price?.costPrice,
        requires_deposit: service.price?.requiresDeposit,
        deposit_percent: service.price?.depositPercent,
        cancellation_deadline_hours: service.price?.cancellationDeadlineHours,
      },
      discount: {
        price: service.discount?.price,
        days: service.discount?.days,
        time_start: service.discount?.timeStart,
        time_end: service.discount?.timeEnd,
      },
    };
  }

  async slots(user_id: number, query: GetSlotsDto) {
    const { location_id, start_date, end_date, duration } = query;

    const user = await this.prismaService.user.findUnique({
      where: { publicCode: Number(user_id) },
      select: { id: true },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Сотрудник не найден",
          detail: "Не удалось найти сотрудника",
          meta: { user_public_code: user_id },
        },
        HttpStatus.NOT_FOUND,
      );

    const location = await this.prismaService.location.findFirst({
      where: { publicCode: Number(location_id) },
      select: { id: true, address: { select: { timezone: true } } },
    });

    if (!location)
      throw new HttpException(
        {
          title: "Локация не найдеа",
          description: "Не удалось найти локацию",
          detail: { location_public_code: location_id },
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    const timezone = location.address?.timezone ?? DEFAULT_TIMEZONE;
    const start = fromZonedTime(`${start_date}T00:00`, timezone);
    const end = fromZonedTime(`${end_date}T00:00`, timezone);

    const schedule = await this.prismaService.userLocation.findFirst({
      where: { userId: user.id, locationId: location.id },
      select: {
        schedules: {
          where: { date: { gte: start, lte: end } },
          select: {
            date: true,
            intervals: { select: { start: true, end: true } },
          },
        },
      },
    });

    const bookings = await this.prismaService.bookingService.findMany({
      where: {
        employeeId: user.id,
        startTime: { gte: start, lt: end },
        booking: { status: { not: "cancelled" } },
      },
      select: { startTime: true, endTime: true },
    });

    const days = schedule?.schedules.map((sch) =>
      this.buildSlots(sch, bookings, Number(duration), timezone),
    );

    return { days };
  }

  private buildSlots(
    schedule: { date: Date; intervals: { start: Date; end: Date }[] },
    bookings: { startTime: Date; endTime: Date }[],
    duration: number,
    timezone: string,
  ) {
    const dayStart = schedule.date;
    const dayEnd = addDays(dayStart, 1);

    const dayBookings = bookings.filter(
      (b) => b.startTime >= dayStart && b.startTime < dayEnd,
    );

    const timezoneMinutes = (time: Date) =>
      time.getUTCHours() * 60 + time.getUTCMinutes();

    const hasOverlap = (s: number, e: number) =>
      dayBookings.some((b) => {
        const start = timezoneMinutes(b.startTime);
        const end = timezoneMinutes(b.endTime);
        return s < end && e > start;
      });

    const slots: { start: string; end: string }[] = [];

    for (const interval of schedule.intervals) {
      const intStart = timezoneMinutes(interval.start);
      const intEnd = timezoneMinutes(interval.end);

      for (let c = intStart; c + duration <= intEnd; c += duration) {
        const start = c;
        const end = c + duration;

        if (!hasOverlap(start, end)) {
          slots.push({
            start: formatIntervalTime(minutesToUtcDate(start), timezone),
            end: formatIntervalTime(minutesToUtcDate(end), timezone),
          });
        }
      }
    }

    const intervals = this.getDayIntervalRange(schedule.intervals, timezone);

    return {
      date: format(dayStart, "yyyy-MM-dd"),
      slots,
      intervals: intervals ? [intervals] : [],
    };
  }

  private getDayIntervalRange(
    intervals: { start: Date; end: Date }[],
    timezone: string,
  ): { start: string; end: string } | null {
    if (intervals.length === 0) return null;

    const earliestStart = intervals.reduce(
      (min, i) => (i.start < min ? i.start : min),
      intervals[0].start,
    );

    const latestEnd = intervals.reduce(
      (max, i) => (i.end > max ? i.end : max),
      intervals[0].end,
    );

    return {
      start: formatIntervalTime(earliestStart, timezone),
      end: formatIntervalTime(latestEnd, timezone),
    };
  }

  async createBooking(dto: WidgetBookingCreateDto, publicName: string) {
    const [company, customerId] = await Promise.all([
      this.company(publicName),
      this.customerChecksService.checkExistCustomer(
        dto.phone,
        dto.first_name,
        dto.last_name,
        dto.email,
      ),
    ]);

    await this.prismaService.customerCompany.upsert({
      where: {
        customerId_companyId: {
          companyId: company.id,
          customerId,
        },
      },
      update: {},
      create: { companyId: company.id, customerId },
    });

    await this.prismaService.company.update({
      where: { id: company.id },
      data: { hasCustomers: true },
    });

    const createDto: BookingCreateDto = {
      services: dto.services,
      mark: "primary",
      customers: [{ id: customerId }],
      location_id: dto.location_id,
      comment: dto.comment,
    };

    return await this.bookingService.create(createDto, company.id);
  }

  async details(bookingId: string) {
    const booking = await this.prismaService.booking.findFirst({
      where: { id: bookingId },
      select: {
        id: true,
        companyId: true,
        tag: true,
        status: true,
        comment: true,
        orderId: true,
        updatedAt: true,
        cancelledAt: true,
        cancelReason: true,
        location: {
          select: {
            id: true,
            name: true,
            avatar: true,
            address: { select: { timezone: true } },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            birthday: true,
            avatar: true,
          },
        },
        services: {
          select: {
            id: true,
            unitPrice: true,
            startTime: true,
            endTime: true,
            duration: true,
            count: true,
            service: {
              select: {
                id: true,
                name: true,
                avatar: true,
                mark: true,
                category: true,
                price: { select: { price: true, costPrice: true } },
                duration: true,
              },
            },
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!booking)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Бронирование не найдено.",
          meta: { booking_id: bookingId },
        },
        HttpStatus.NOT_FOUND,
      );

    const companyId = booking.companyId;

    const customerCompany = await this.prismaService.customerCompany.findUnique(
      {
        where: {
          customerId_companyId: {
            customerId: booking.customer.id,
            companyId,
          },
        },
        select: {
          id: true,
          customer: {
            select: {
              bookings: {
                select: {
                  order: {
                    where: { status: "paid" },
                    select: {
                      total: true,
                      subtotal: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  bookings: { where: { companyId } },
                },
              },
            },
          },
        },
      },
    );

    const { start, end } = getBookingTimeRange(booking.services);

    const timezone = booking.location.address?.timezone ?? DEFAULT_TIMEZONE;

    const res = {
      id: booking.id,
      status: booking.status,
      tag: booking.tag,
      comment: booking.comment,
      order_id: booking.orderId,
      date: formatDateInTimezone(start, timezone),
      start_time: formatBookingTime(start, timezone),
      end_time: formatBookingTime(end, timezone),
      cancel_reason: booking.cancelReason,
      updated_date: formatDateInTimezone(booking.updatedAt, timezone),
      updated_time: formatBookingTime(booking.updatedAt, timezone),
      location: {
        id: booking.location.id,
        name: booking.location.name,
        avatar: buildImageUrls(booking.location.avatar, "location-avatars"),
      },
      customer: {
        id: booking.customer.id,
        customer_attributes: {
          profile_id: customerCompany?.id,
          first_name: booking.customer.firstName,
          last_name: booking.customer.lastName,
          full_name: getFullName(
            booking.customer.firstName,
            booking.customer.lastName,
          ),
          birthday: booking.customer.birthday,
          phone: booking.customer.phone,
          email: booking.customer.email,
          avatar: buildImageUrls(booking.customer.avatar, "customer-avatars"),
        },
        visit_total: customerCompany?.customer.bookings.filter((b) => b.order)
          .length,
        bookings_count: customerCompany?.customer._count.bookings,
        bookings_total: customerCompany?.customer.bookings.reduce(
          (sum, booking) => sum + Number(booking.order?.total ?? 0),
          0,
        ),
      },
      booking_services: booking.services.map((service) => ({
        booking_service_id: service.id,
        booking_service_start_time: formatBookingTime(
          service.startTime,
          timezone,
        ),
        booking_service_end_time: formatBookingTime(service.endTime, timezone),
        booking_service_duration: service.duration,
        booking_service_price: service.unitPrice,
        booking_service_count: service.count,
        service: {
          service_id: service.service.id,
          name: service.service.name,
          mark: service.service.mark,
          duration: service.service.duration,
          avatar: buildImageUrls(service.service.avatar, "service-avatars"),
          category: service.service.category,
          prices: {
            price: service.service.price?.price,
            cost_price: service.service.price?.costPrice,
          },
        },
        user: {
          user_id: service.employee.id,
          first_name: service.employee.firstName,
          last_name: service.employee.lastName,
          full_name: getFullName(
            service.employee.firstName,
            service.employee.lastName,
          ),
          phone: service.employee.phone,
          avatar: buildImageUrls(service.employee.avatar, "user-avatars"),
        },
      })),
    };

    return res;
  }
}
