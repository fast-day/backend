import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { GetPublicBookingDto } from "./dto/public/employee-query.dto";
import { buildFileUrl } from "src/shared/utils/build-url";
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
      logo: buildFileUrl(company.logo),
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
        avatar: buildFileUrl(employee.user.avatar),
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
      avatar: buildFileUrl(service.avatar),
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
      avatar: buildFileUrl(service.avatar),
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
      where: { customerId_companyId: { companyId: company.id, customerId } },
      update: {},
      create: { companyId: company.id, customerId },
    });

    const createDto: BookingCreateDto = {
      services: dto.services,
      customers: [{ id: customerId }],
      location_id: dto.location_id,
      comment: dto.comment,
    };

    return await this.bookingService.create(createDto, company.id);
  }
}
