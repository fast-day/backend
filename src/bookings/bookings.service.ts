import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import {
  BookingCreateDto,
  BookingCreateServiceDto,
} from "./dto/booking-create.dto";
import { BookingStatusDto } from "./dto/booking-status.dto";
import { BookingUpdateDto } from "./dto/booking-update.dto";
import { Prisma } from "@prisma/client";
import { buildFileUrl } from "src/shared/utils/build-url";
import { generateBookingTag } from "./utils/generate-tag";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";
import { BookingSortOrder, GetBookingsDto } from "./dto/get-bookings.dto";
import { normalizePhone } from "src/shared/utils/phone";
import { OrdersService } from "src/orders/orders.service";
import { BookingCreateOrderDto } from "./dto/booking-create-order.dto";
import { MailService } from "src/mail/mail.service";
import { getFullName } from "src/shared/utils/get-full-name.util";
import { BookingDtoService } from "./dto/booking-base.dto";
import { calcEndTimeDate } from "src/shared/utils/calc-end-time.util";
import { BookingCreateCustomerOldDto } from "./dto/booking-create-customer.dto";
import {
  combineDateAndTime,
  parseNaiveDateTime,
} from "src/shared/utils/combine-date-and-time.util";
import { getDayRange } from "./utils/day-range.util";

@Injectable()
export class BookingsService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly orderService: OrdersService,
    private readonly mailService: MailService,
  ) {}

  private async validateLocation(
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

  private async validateEmployeeLocation(
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

  private async validateService(
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

  private async validateEmployeeService(
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

  private async validateCustomer(
    id: string,
    companyId: string,
  ): Promise<string> {
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

  private async validateEmployeeWorked(
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

  private async validateEmployeeOverlapping(
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

  private async validateCustomerOverlapping(
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

  async create(dto: BookingCreateDto, company_id: string) {
    return this.prismaService.$transaction(async (t) => {
      const resolvedServices = dto.services.map((service) => {
        if (service.users.length !== 1) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              title: "Ошибка сотрудника",
              detail:
                "На одну услугу должен быть назначен ровно один сотрудник",
              meta: { service_id: service.service_id },
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        const startTime = parseNaiveDateTime(service.start_time);
        const endTime = calcEndTimeDate(startTime, service.duration);

        return {
          ...service,
          employeeId: service.users[0].id,
          startTime,
          endTime,
        };
      });

      const employeeIds = [
        ...new Set(resolvedServices.map((s) => s.employeeId)),
      ];
      const serviceIds = resolvedServices.map((s) => s.service_id);

      await this.validateLocation(dto.location_id, dto.services);
      await this.validateEmployeeLocation(employeeIds, dto.location_id);
      await this.validateEmployeeService(employeeIds, serviceIds);
      await this.validateService(dto.services, company_id);

      const customerId = await this.validateCustomer(
        dto.customers[0].id,
        company_id,
      );

      for (const service of resolvedServices) {
        const userLocation = await t.userLocation.findFirst({
          where: { userId: service.employeeId, locationId: dto.location_id },
          select: { id: true },
        });

        await this.validateEmployeeWorked(
          userLocation!.id,
          service.startTime,
          service.startTime,
          service.endTime,
        );
        await this.validateEmployeeOverlapping(
          service.employeeId,
          service.startTime,
          service.endTime,
        );
        await this.validateCustomerOverlapping(
          customerId,
          service.startTime,
          service.endTime,
        );
      }

      const booking = await t.booking.create({
        data: {
          tag: generateBookingTag(),
          comment: dto.comment,
          status: dto.status ?? "pending",
          type: dto.type,
          locationId: dto.location_id,
          companyId: company_id,
          customerId,

          services: {
            createMany: {
              data: dto.services.map((service) => ({
                serviceId: service.service_id,
                unitPrice: service.price,
                count: service.count,
                startTime: parseNaiveDateTime(service.start_time),
                endTime: calcEndTimeDate(
                  parseNaiveDateTime(service.start_time),
                  service.duration,
                ),
                duration: service.duration,
                employeeId: service.users[0].id,
              })),
            },
          },
        },
        select: {
          id: true,
          tag: true,
          status: true,
          comment: true,
          customer: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
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

      const res = {
        id: booking.id,
        status: booking.status,
        tag: booking.tag,
        comment: booking.comment,
        customer: {
          id: booking.customer.id,
          phone: booking.customer.phone,
          full_name: getFullName(
            booking.customer.firstName,
            booking.customer.lastName,
          ),
          first_name: booking.customer.firstName,
          last_name: booking.customer.lastName,
          avatar: buildFileUrl(booking.customer.avatar),
        },
        booking_services: booking.services.map((service) => ({
          booking_service_id: service.id,
          booking_service_start_time: service.startTime,
          booking_service_end_time: service.endTime,
          booking_service_duration: service.duration,
          booking_service_price: service.unitPrice,
          booking_service_count: service.count,
          service: {
            service_id: service.service.id,
            name: service.service.name,
            mark: service.service.mark,
            duration: service.service.duration,
            avatar: buildFileUrl(service.service.avatar),
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
            avatar: buildFileUrl(service.employee.avatar),
          },
        })),
      };
      return res;
    });
  }

  async getAll(userId: string, locationId: string, query: GetBookingsDto) {
    const { customer, status, date, tag, sort, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const user = await this.prismaService.userLocation.findUnique({
      where: { userId_locationId: { userId, locationId } },
      select: { role: { select: { name: true } } },
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
    // const serviceWhere = buildEmployeeScopeFilter(false, userId);

    const serviceFilter: Prisma.BookingServiceWhereInput = {
      ...(!isOwner && { employeeId: userId }),
      ...(date && { startTime: getDayRange(date) }),
    };

    const where: Prisma.BookingWhereInput = {
      locationId,
      ...(status && { status }),
      ...(tag && {
        tag: { contains: tag, mode: Prisma.QueryMode.insensitive },
      }),
      ...(Object.keys(serviceFilter).length > 0 && {
        services: { some: serviceFilter },
      }),
      ...(customer && {
        customer: {
          OR: [
            {
              firstName: {
                contains: customer,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              lastName: {
                contains: customer,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              phoneNormalized: { contains: normalizePhone(customer) },
            },
          ],
        },
      }),
    };

    const orderBy: Prisma.BookingOrderByWithRelationInput =
      sort === BookingSortOrder.OLDEST
        ? { createdAt: "asc" }
        : sort === BookingSortOrder.PRICE_ASC
          ? { order: { subtotal: "asc" } }
          : sort === BookingSortOrder.PRICE_DESC
            ? { order: { subtotal: "desc" } }
            : { createdAt: "desc" };

    const [bookings, total] = await Promise.all([
      this.prismaService.booking.findMany({
        where,
        select: {
          id: true,
          tag: true,
          status: true,
          comment: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true,
            },
          },
          services: {
            where: isOwner ? {} : { employeeId: userId },
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
                  phone: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              subtotal: true,
              paymentMethod: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prismaService.booking.count({ where }),
    ]);

    const data = bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      tag: booking.tag,
      comment: booking.comment,
      subtotal: booking.order?.subtotal || null,
      payment_method: booking.order?.paymentMethod || null,
      order_id: booking.order?.id || null,
      customer: {
        id: booking.customer.id,
        phone: booking.customer.phone,
        full_name: getFullName(
          booking.customer.firstName,
          booking.customer.lastName,
        ),
        first_name: booking.customer.firstName,
        last_name: booking.customer.lastName,
        avatar: buildFileUrl(booking.customer.avatar),
      },

      booking_services: booking.services.map((service) => ({
        booking_service_id: service.id,
        // booking_service_start_time: service.startTime.toLocaleTimeString(
        //   "ru-RU",
        //   {
        //     timeZone: "Europe/Moscow",
        //     hour: "2-digit",
        //     minute: "2-digit",
        //   },
        // ),
        booking_service_start_time: service.startTime,
        booking_service_end_time: service.endTime,
        booking_service_duration: service.duration,
        booking_service_price: service.unitPrice,
        booking_service_count: service.count,
        service: {
          service_id: service.service.id,
          name: service.service.name,
          mark: service.service.mark,
          duration: service.service.duration,
          avatar: buildFileUrl(service.service.avatar),
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
          avatar: buildFileUrl(service.employee.avatar),
        },
      })),
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getById(bookingId: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
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

    return booking;
  }

  async delete(bookingId: string) {
    await this.getById(bookingId);

    const booking = await this.prismaService.booking.delete({
      where: { id: bookingId },
      select: { id: true },
    });

    return { success: true, booking_id: booking.id };
  }

  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  async update(dto: BookingUpdateDto, bookingId: string, company_id: string) {
    // await this.getById(bookingId);
    // await this.validateLocation(dto.location_id, dto.services);
    // const locationId = await this.validateEmployeeLocation(
    //   dto.employee_id,
    //   dto.location_id,
    // );
    // await this.validateEmployeeService(dto.employee_id, dto.services);
    // const customerId = await this.validateCustomer(dto.customer_id, bookingId);
    // await this.validateService(dto.services, company_id);
    // await this.validateCustomerWorked(
    //   new Date(dto.date),
    //   locationId,
    //   dto.start_time,
    //   dto.end_time,
    // );
    // await this.validateOverlapping(
    //   dto.employee_id,
    //   new Date(dto.date),
    //   dto.end_time,
    //   dto.start_time,
    //   bookingId,
    // );

    // const booking = await this.prismaService.booking.update({
    //   where: { id: bookingId },
    //   data: {
    //     date: dto.date,
    //     startTime: dto.start_time,
    //     endTime: dto.end_time,
    //     comment: dto.comment,
    //     employeeId: dto.employee_id,
    //     // customerId: customerId,
    //     // serviceId: dto.service_id,
    //     locationId: dto.location_id,
    //   },
    //   select: {
    //     id: true,
    //     status: true,
    //     startTime: true,
    //     endTime: true,
    //     date: true,
    //     comment: true,
    //     location: { select: { id: true, name: true } },
    //     customer: {
    //       select: {
    //         id: true,
    //         firstName: true,
    //         lastName: true,
    //         phone: true,
    //         email: true,
    //         birthday: true,
    //       },
    //     },
    //     employee: {
    //       select: { id: true, firstName: true, lastName: true, phone: true },
    //     },
    //     services: {
    //       select: {
    //         id: true,
    //         price: true,
    //         count: true,
    //         duration: true,
    //         service: {
    //           select: {
    //             id: true,
    //             name: true,
    //             avatar: true,
    //             mark: true,
    //             price: { select: { price: true, costPrice: true } },
    //             duration: true,
    //           },
    //         },
    //       },
    //     },
    //   },
    // });

    // const res = {
    //   id: booking.id,
    //   status: booking.status,
    //   start_time: booking.startTime,
    //   end_time: booking.endTime,
    //   // date: booking.date.toISOString().split("T")[0],
    //   comment: booking.comment,
    //   location: {
    //     id: booking.location.id,
    //     name: booking.location.name,
    //   },
    //   customer: {
    //     id: booking.customer.id,
    //     first_name: booking.customer.firstName,
    //     last_name: booking.customer.lastName,
    //     phone: booking.customer.phone,
    //     email: booking.customer.email,
    //     birthday: booking.customer.birthday,
    //   },
    //   employee: {
    //     id: booking.employee.id,
    //     first_name: booking.employee.firstName,
    //     last_name: booking.employee.lastName,
    //     phone: booking.employee.phone,
    //   },
    //   services: booking.services.map((service) => ({
    //     booking_service_id: service.id,
    //     booking_service_price: service.price,
    //     booking_service_count: service.count,
    //     booking_service_duration: service.duration,
    //     service: {
    //       id: service.service.id,
    //       name: service.service.name,
    //       duration: service.service.duration,
    //       avatar: buildFileUrl(service.service.avatar),
    //       prices: {
    //         price: service.service.price?.price,
    //         cost_price: service.service.price?.costPrice,
    //       },
    //     },
    //   })),
    // };

    return true;
  }

  async statusUpdate(dto: BookingStatusDto, bookingId: string) {
    await this.getById(bookingId);

    const booking = await this.prismaService.booking.update({
      where: { id: bookingId },
      data: { status: dto.status },
      select: { status: true },
    });

    return { success: true, booking };
  }

  async details(bookingId: string, companyId: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId, companyId },
      select: {
        id: true,
        tag: true,
        status: true,
        comment: true,
        location: { select: { id: true, name: true, avatar: true } },
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
        order: {
          select: {
            id: true,
            status: true,
            tag: true,
            subtotal: true,
            total: true,
            discount: true,
            paymentMethod: true,
            paidAt: true,
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

    const customerCompany = await this.prismaService.customerCompany.findUnique(
      {
        where: {
          customerId_companyId: {
            customerId: booking.customer.id,
            companyId,
          },
        },
        select: { id: true },
      },
    );

    const res = {
      id: booking.id,
      status: booking.status,
      tag: booking.tag,
      comment: booking.comment,
      location: {
        id: booking.location.id,
        name: booking.location.name,
        avatar: buildFileUrl(booking.location.avatar),
      },
      customer: {
        id: booking.customer.id,
        profile_id: customerCompany?.id,
        first_name: booking.customer.firstName,
        last_name: booking.customer.lastName,
        full_name: getFullName(
          booking.customer.firstName,
          booking.customer.lastName,
        ),
        phone: booking.customer.phone,
        email: booking.customer.email,
        birthday: booking.customer.birthday,
        avatar: buildFileUrl(booking.customer.avatar),
      },
      booking_services: booking.services.map((service) => ({
        booking_service_id: service.id,
        booking_service_start_time: service.startTime,
        booking_service_end_time: service.endTime,
        booking_service_duration: service.duration,
        booking_service_price: service.unitPrice,
        booking_service_count: service.count,
        service: {
          service_id: service.service.id,
          name: service.service.name,
          mark: service.service.mark,
          duration: service.service.duration,
          avatar: buildFileUrl(service.service.avatar),
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
          avatar: buildFileUrl(service.employee.avatar),
        },
      })),
      order: booking.order
        ? {
            id: booking.order?.id,
            status: booking.order?.status,
            tag: booking.order?.tag,
            subtotal: booking.order?.subtotal,
            total: booking.order?.total,
            discount: booking.order?.discount,
            payment_method: booking.order?.paymentMethod,
            paid_at: booking.order?.paidAt,
          }
        : null,
    };

    return res;
  }

  async getCustomerBookings(companyId: string, customerId: string) {
    const customer = await this.prismaService.customerCompany.findUnique({
      where: { customerId_companyId: { customerId, companyId } },
      select: { customerId: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Клиент не найден",
          detail: "Не удалось найти клиента",
          meta: { customer_id: customerId },
        },
        HttpStatus.NOT_FOUND,
      );

    const bookings = await this.prismaService.booking.findMany({
      where: {
        companyId,
        customerId: customer.customerId,
      },
      select: {
        id: true,
        tag: true,
        status: true,
        comment: true,
        location: {
          select: {
            id: true,
            name: true,
            avatar: true,
            address: {
              select: {
                street: true,
                city: true,
                house: true,
                country: true,
              },
            },
          },
        },
        services: {
          select: {
            id: true,
            unitPrice: true,
            startTime: true,
            endTime: true,
            duration: true,
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
                avatar: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            tag: true,
            subtotal: true,
            total: true,
            discount: true,
            paymentMethod: true,
            paidAt: true,
          },
        },
      },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      tag: booking.tag,
      // date: booking.date.toISOString().split("T")[0],
      comment: booking.comment,
      location: {
        // id: booking.location.id,
        // name: booking.location.name,
        // avatar: buildFileUrl(booking.location.avatar),
        // address: booking.location.address,
      },
      // new_data: booking.services,
      // employee: {
      //   id: booking.employee.id,
      //   first_name: booking.employee.firstName,
      //   last_name: booking.employee.lastName,
      //   full_name: getFullName(
      //     booking.employee.firstName,
      //     booking.employee.lastName,
      //   ),
      //   phone: booking.employee.phone,
      //   email: booking.employee.email,
      //   avatar: buildFileUrl(booking.employee.avatar),
      // },
      // services: booking.services.map((service) => ({
      //   booking_service_id: service.id,
      //   booking_service_price: service.price,
      //   booking_service_count: service.count,
      //   booking_service_duration: service.duration,
      //   service: {
      //     id: service.service.id,
      //     name: service.service.name,
      //     duration: service.service.duration,
      //     avatar: buildFileUrl(service.service.avatar),
      //     prices: {
      //       price: service.service.price?.price,
      //       cost_price: service.service.price?.costPrice,
      //     },
      //   },
      // })),

      /*
        !!=====!! СТАРЫЙ ВЫВОД УСЛУГ !!=====!!
      */
      // service: {
      //   id: booking.service.id,
      //   name: booking.service.name,
      //   duration: booking.service.duration,
      //   public_name: booking.service.publicName,
      //   type: booking.service.type,
      //   category: booking.service.category,
      //   avatar: buildFileUrl(booking.service.avatar),
      //   mark: booking.service.mark,
      //   prices: {
      //     price: booking.service.price?.price,
      //     cost_price: booking.service.price?.costPrice,
      //   },
      // },
      // order: {
      //   id: booking.order?.id,
      //   status: booking.order?.status,
      //   tag: booking.order?.tag,
      //   subtotal: booking.order?.subtotal,
      //   total: booking.order?.total,
      //   discount: booking.order?.discount,
      //   payment_method: booking.order?.paymentMethod,
      //   paid_at: booking.order?.paidAt,
      // },
    }));
  }

  async getMeBookings(customerId: string) {
    const customer = await this.prismaService.customerAccount.findUnique({
      where: { id: customerId },
      select: { customerId: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Клиент не найден.",
          meta: { customer_id: customer },
        },
        HttpStatus.NOT_FOUND,
      );

    const bookings = await this.prismaService.booking.findMany({
      where: { customerId: customer.customerId },
      select: {
        id: true,
        company: {
          select: {
            publicName: true,
          },
        },
        status: true,
        tag: true,
        location: {
          select: {
            name: true,
            id: true,
            avatar: true,
            address: {
              select: {
                street: true,
                city: true,
                house: true,
                country: true,
              },
            },
          },
        },
        services: {
          select: {
            id: true,
            unitPrice: true,
            startTime: true,
            endTime: true,
            duration: true,
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
                avatar: true,
              },
            },
          },
        },
        order: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const res = bookings.map((booking) => ({
      id: booking.id,
      // company_name: booking.company.publicName,
      status: booking.status,
      tag: booking.tag,
      // date: booking.date.toISOString().split("T")[0],
      // employee: {
      //   id: booking.employee.id,
      //   first_name: booking.employee.firstName,
      //   last_name: booking.employee.lastName,
      //   phone: booking.employee.phone,
      //   avatar: buildFileUrl(booking.employee.avatar),
      //   position: booking.employee.position,
      // },
      // location: {
      //   id: booking.location.id,
      //   name: booking.location.name,
      //   avatar: buildFileUrl(booking.location.avatar),
      //   address: booking.location.address,
      // },
      // services: booking.services.map((service) => ({
      //   booking_service_id: service.id,
      //   booking_service_price: service.price,
      //   booking_service_count: service.count,
      //   booking_service_duration: service.duration,
      //   service: {
      //     id: service.service.id,
      //     name: service.service.name,
      //     duration: service.service.duration,
      //     avatar: buildFileUrl(service.service.avatar),
      //     prices: {
      //       price: service.service.price?.price,
      //       cost_price: service.service.price?.costPrice,
      //     },
      //   },
      // })),

      /*
        !!=====!! СТАРЫЙ ВЫВОД УСЛУГ !!=====!!
      */
      // service: {
      //   id: booking.service.id,
      //   name: booking.service.name,
      //   public_name: booking.service.publicName,
      //   avatar: buildFileUrl(booking.service.avatar),
      //   mark: booking.service.mark,
      //   duration: booking.service.duration,
      //   category: booking.service.category || null,
      // },
    }));

    return res;
  }

  /*
      ===== СОЗДАНИЕ БРОНИРОВАНИЯ И ОФОРМЛЕНИЕ ЗАКАЗА СО СТОРОНЫ КЛИЕНТА =====
    */
  // eslint-disable-next-line @typescript-eslint/require-await
  async createCustomerBooking(
    dto: BookingCreateCustomerOldDto,
    customerId: string,
  ) {
    return { dto, customerId };
    // const company = await this.prismaService.company.findUnique({
    //   where: { publicName: dto.company },
    //   select: { id: true },
    // });
    // if (!company)
    //   throw new HttpException(
    //     {
    //       status: HttpStatus.NOT_FOUND,
    //       title: "Ошибка",
    //       detail: "Компания не найдена.",
    //       meta: { public_name: dto.company },
    //     },
    //     HttpStatus.NOT_FOUND,
    //   );
    // const customer = await this.prismaService.customerAccount.findUnique({
    //   where: { id: customerId },
    //   select: { customerId: true },
    // });
    // if (!customer)
    //   throw new HttpException(
    //     {
    //       status: HttpStatus.NOT_FOUND,
    //       title: "Ошибка",
    //       detail: "Клиент не найден.",
    //       meta: { customer_id: customer },
    //     },
    //     HttpStatus.NOT_FOUND,
    //   );
    // const createDto = {
    //   start_time: dto.start_time,
    //   end_time: dto.end_time,
    //   date: dto.date,
    //   comment: dto.comment,
    //   location_id: dto.location_id,
    //   services: dto.services,
    //   employee_id: dto.employee_id,
    //   customer_id: customer?.customerId,
    //   status: dto.status,
    //   payment_method: dto.payment_method,
    // } satisfies BookingCreateDto;
    // return this.prismaService.$transaction(async (t) => {
    //   const booking = await this.create(createDto, company.id);
    //   // const subtotal = booking.service.prices.price ?? 0;
    //   const subtotal = booking.services.reduce(
    //     (sum, s) => sum + Number(s.booking_service_price),
    //     0,
    //   );
    //   const order = await t.order.create({
    //     data: {
    //       status: "open",
    //       subtotal,
    //       tag: generateOrderTag(),
    //       companyId: company.id,
    //       total: subtotal,
    //       paymentMethod: dto.payment_method,
    //       bookings: { connect: { id: booking.id } },
    //     },
    //     select: {
    //       id: true,
    //       tag: true,
    //       paymentMethod: true,
    //       status: true,
    //       total: true,
    //       subtotal: true,
    //       comment: true,
    //     },
    //   });
    //   await t.booking.update({
    //     where: { id: booking.id },
    //     data: { orderId: order.id, status: "new" },
    //   });
    //   await this.mailService.sendNewBookingNotify(booking.employee.email, {
    //     ...booking,
    //     date: new Date(booking.date),
    //   });
    //   return {
    //     id: booking.id,
    //     date: booking.date,
    //     start_time: booking.start_time,
    //     end_time: booking.end_time,
    //     status: booking.status,
    //     tag: booking.tag,
    //     order: {
    //       id: order.id,
    //       tag: order.tag,
    //       status: order.status,
    //       payment_method: order.paymentMethod,
    //       total: order.total,
    //       subtotal: order.subtotal,
    //     },
    //   };
    // });
    // await this.orderService.create();
    // return res;
  }

  /*
      ===== ПОДТВЕРЖДЕНИЕ БРОНИРОВАНИЯ И СОЗДАНИЕ ЗАКАЗА =====
    */
  async confirmBooking(
    bookingId: string,
    dto: BookingCreateOrderDto,
    companyId: string,
  ) {
    const { id } = await this.getById(bookingId);

    const { payment_method } = dto;

    const booking = await this.prismaService.booking.update({
      where: { id },
      data: { status: "confirmed" },
      select: {
        id: true,
        status: true,
        tag: true,
        order: {
          select: {
            id: true,
            tag: true,
            paymentMethod: true,
            status: true,
            total: true,
            subtotal: true,
            comment: true,
          },
        },
      },
    });

    if (booking.order) {
      return {
        id: booking.id,
        status: booking.status,
        tag: booking.tag,
        order: {
          id: booking.order.id,
          tag: booking.order.tag,
          status: booking.order.status,
          payment_method: booking.order.paymentMethod,
          total: booking.order.total,
          subtotal: booking.order.subtotal,
          comment: booking.order.comment,
        },
      };
    }

    const order = await this.orderService.create(
      {
        status: dto.status ?? "pending",
        payment_method,
        booking_ids: [id],
      },
      companyId,
    );

    return {
      order,
    };
  }

  /*
      ===== ЗАВЕРШЕНИЕ БРОНИРОВАНИЯ =====
    */
  async completeBooking(bookingId: string) {
    return this.prismaService.$transaction(async (t) => {
      const booking = await t.booking.findUnique({
        where: { id: bookingId },
        select: {
          status: true,
          orderId: true,
          order: true,
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

      if (booking.status === "completed")
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            title: "Ошибка",
            detail: "Уже завершен",
          },
          HttpStatus.BAD_REQUEST,
        );

      if (booking.status === "cancelled")
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            title: "Ошибка",
            detail: "Нельзя завершить отменённое бронирование.",
          },
          HttpStatus.BAD_REQUEST,
        );

      await t.booking.update({
        where: { id: bookingId },
        data: { status: "completed" },
      });

      if (booking.order) {
        if (booking.order.status === "paid")
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              title: "Ошибка",
              detail: "Заказ уже оплачен.",
            },
            HttpStatus.BAD_REQUEST,
          );

        const discount = booking.order.discount ?? 0;
        const total = booking.order.subtotal - discount;

        await t.order.update({
          where: { id: booking.order.id },
          data: {
            status: "paid",
            total,
            paidAt: new Date(),
          },
        });
      }

      return { success: true };
    });
  }
}
