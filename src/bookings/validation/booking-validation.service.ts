import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { DEFAULT_TIMEZONE } from "src/shared/constant/timezone.constant";
import { BookingDtoService } from "../dto/booking-base.dto";
import { BookingCreateServiceDto } from "../dto/booking-create.dto";
import { combineDateAndTime } from "src/shared/utils/combine-date-and-time.util";

@Injectable()
export class BookingValidationService {
  public constructor(private readonly prismaService: PrismaService) {}

  async getLocationTimezone(locationId: string): Promise<string> {
    const location = await this.prismaService.location.findUnique({
      where: { id: locationId },
      select: { address: { select: { timezone: true } } },
    });

    return location?.address?.timezone ?? DEFAULT_TIMEZONE;
  }

  async getUserLocation(
    userId: string,
    locationId: string,
  ): Promise<{ userLocationId: string; isOwner: boolean; timezone: string }> {
    const user = await this.prismaService.userLocation.findUnique({
      where: { userId_locationId: { userId, locationId } },
      select: {
        id: true,
        role: { select: { name: true } },
        location: { select: { address: { select: { timezone: true } } } },
      },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка пользователя",
          detail: "Пользователь не найден",
          meta: { user_id: userId },
        },
        HttpStatus.NOT_FOUND,
      );

    const isOwner = user.role?.name === "owner";

    return {
      userLocationId: user.id,
      isOwner,
      timezone: user.location.address?.timezone ?? DEFAULT_TIMEZONE,
    };
  }

  async validateLocation(
    locationId: string,
    service: BookingDtoService[],
  ): Promise<boolean> {
    const serviceIds = service.map((service) => service.service_id);

    const location = await this.prismaService.locationService.findMany({
      where: { locationId, serviceId: { in: serviceIds } },
    });

    const foundIds = new Set(location.map((ls) => ls.serviceId));
    const missing = serviceIds.filter((id) => !foundIds.has(id));

    if (missing.length > 0)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка локации",
          detail: "Часть услуг не доступна в выбранном месте",
          meta: { location_id: locationId, service_ids: missing },
        },
        HttpStatus.BAD_REQUEST,
      );

    return true;
  }

  async validateEmployeeLocation(
    employeeIds: string[],
    locationId: string,
  ): Promise<void> {
    const employeeLocations = await this.prismaService.userLocation.findMany({
      where: { userId: { in: employeeIds }, locationId },
      select: { userId: true },
    });

    const foundIds = new Set(employeeLocations.map((e) => e.userId));
    const missing = employeeIds.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка сотрудника",
          detail: "Один из выбранных сотрудников не работает в данной локации.",
          meta: { employee_ids: missing },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateService(
    services: BookingCreateServiceDto[],
    companyId: string,
  ): Promise<void> {
    const serviceIds = services.map((s) => s.service_id);
    const found = await this.prismaService.service.findMany({
      where: { id: { in: serviceIds }, companyId },
      select: { id: true },
    });

    const foundIds = new Set(found.map((s) => s.id));
    const missing = serviceIds.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка услуги",
          detail: "Часть выбранных услуг не доступны",
          meta: { service_ids: missing },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateEmployeeService(
    employeeIds: string[],
    serviceIds: string[],
  ): Promise<void> {
    const found = await this.prismaService.userService.findMany({
      where: { userId: { in: employeeIds }, serviceId: { in: serviceIds } },
      select: { serviceId: true, userId: true },
    });

    const foundServiceIds = new Set(found.map((f) => f.serviceId));
    const missingServiceIds = serviceIds.filter(
      (id) => !foundServiceIds.has(id),
    );

    const foundEmployeeIds = new Set(found.map((f) => f.userId));
    const missingEmployeeIds = employeeIds.filter(
      (id) => !foundEmployeeIds.has(id),
    );

    if (missingServiceIds.length > 0 || missingEmployeeIds.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка услуги",
          detail: "Выбранный сотрудник не оказывает часть выбранных услуг",
          meta: {
            employee_ids: missingEmployeeIds,
            service_ids: missingServiceIds,
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateCustomer(id: string, companyId: string): Promise<string> {
    const customer = await this.prismaService.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка клиента",
          detail: "Указанный клиент не найден в системе",
          meta: { customer_id: id },
        },
        HttpStatus.NOT_FOUND,
      );

    const existingLink = await this.prismaService.customerCompany.findFirst({
      where: { customerId: customer.id, companyId },
      select: { id: true },
    });

    if (!existingLink) {
      await this.prismaService.customerCompany.create({
        data: { companyId, customerId: customer.id },
      });
    }

    return customer.id;
  }

  async validateEmployeeWorked(
    userLocationId: string,
    date: Date,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);

    const schedule = await this.prismaService.schedule.findFirst({
      where: { date: dayStart, userLocationId },
      include: { intervals: true },
    });

    if (!schedule) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка расписания",
          detail: "У сотрудника нет рабочего графика на эту дату.",
          meta: { user_location_id: userLocationId },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const isWorked = schedule.intervals.some((interval) => {
      const intervalStart = combineDateAndTime(dayStart, interval.start);
      const intervalEnd = combineDateAndTime(dayStart, interval.end);
      return intervalStart <= startTime && intervalEnd >= endTime;
    });

    if (!isWorked) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка расписания",
          detail: "Сотрудник не работает в указанный период времени.",
          meta: { user_location_id: userLocationId },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateEmployeeOverlapping(
    employeeId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId: string = "",
  ): Promise<void> {
    const overlap = await this.prismaService.bookingService.findFirst({
      where: {
        employeeId,
        bookingId: { not: excludeBookingId },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (overlap) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка бронирования",
          detail:
            "У выбранного сотрудника уже существует бронирование на указанное время.",
          meta: { employee_id: employeeId },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateCustomerOverlapping(
    customerId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId: string = "",
  ): Promise<void> {
    const overlap = await this.prismaService.bookingService.findFirst({
      where: {
        booking: { customerId, id: { not: excludeBookingId } },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (overlap) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка бронирования",
          detail: "Клиент уже записан на другую услугу в это время",
          meta: { customer_id: customerId },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
