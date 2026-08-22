import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BookingCreateDto } from "./dto/booking-create.dto";
import { BookingStatusDto } from "./dto/booking-status.dto";
import { Prisma } from "@prisma/client";
import { buildFileUrl } from "src/shared/utils/build-url";
import { generateBookingTag } from "./utils/generate-tag";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";
import { BookingSortOrder, GetBookingsDto } from "./dto/get-bookings.dto";
import { normalizePhone } from "src/shared/utils/phone";
import { getFullName } from "src/shared/utils/get-full-name.util";
import { calcEndTimeDate } from "src/shared/utils/calc-end-time.util";
import { BookingCreateCustomerOldDto } from "./dto/booking-create-customer.dto";
import { getDayRange } from "./utils/day-range.util";
import { getBookingTimeRange } from "./utils/time-range.util";
import {
  formatDateInTimezone,
  formatBookingTime,
} from "./utils/format-time.util";
import { DEFAULT_TIMEZONE } from "src/shared/constant/timezone.constant";
import { fromZonedTime } from "date-fns-tz";
import { GetCustomerBookingsDto } from "./dto/get-customer-bookings.dto";
import { UpdateBookingServicesDto } from "./dto/booking-update-service.dto";
import { BookingValidationService } from "./validation/booking-validation.service";

@Injectable()
export class BookingsService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly validationService: BookingValidationService,
  ) {}

  async create(dto: BookingCreateDto, company_id: string) {
    const timezone = await this.validationService.getLocationTimezone(
      dto.location_id,
    );

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

        const startTime = fromZonedTime(service.start_time, timezone);
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

      await this.validationService.validateLocation(
        dto.location_id,
        dto.services,
      );
      await this.validationService.validateEmployeeLocation(
        employeeIds,
        dto.location_id,
      );
      await this.validationService.validateEmployeeService(
        employeeIds,
        serviceIds,
      );
      await this.validationService.validateService(dto.services, company_id);

      const customerId = await this.validationService.validateCustomer(
        dto.customers[0].id,
        company_id,
      );

      for (const service of resolvedServices) {
        const userLocation = await t.userLocation.findFirst({
          where: { userId: service.employeeId, locationId: dto.location_id },
          select: { id: true },
        });

        await this.validationService.validateEmployeeWorked(
          userLocation!.id,
          service.startTime,
          service.startTime,
          service.endTime,
        );
        await this.validationService.validateEmployeeOverlapping(
          service.employeeId,
          service.startTime,
          service.endTime,
        );
        await this.validationService.validateCustomerOverlapping(
          customerId,
          service.startTime,
          service.endTime,
        );
      }

      const booking = await t.booking.create({
        data: {
          tag: generateBookingTag(),
          comment: dto.comment,
          type: dto.type,
          locationId: dto.location_id,
          companyId: company_id,
          mark: dto.mark,
          customerId,

          services: {
            createMany: {
              data: resolvedServices.map((service) => ({
                serviceId: service.service_id,
                unitPrice: service.price,
                count: service.count,
                startTime: service.startTime,
                endTime: service.endTime,
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

      await this.prismaService.company.update({
        where: { id: company_id },
        data: { hasBookings: true },
      });

      const { start, end } = getBookingTimeRange(booking.services);

      const res = {
        id: booking.id,
        status: booking.status,
        tag: booking.tag,
        comment: booking.comment,
        date: formatDateInTimezone(start, timezone),
        start_time: formatBookingTime(start, timezone),
        end_time: formatBookingTime(end, timezone),
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
          booking_service_start_time: formatBookingTime(
            service.startTime,
            timezone,
          ),
          booking_service_end_time: formatBookingTime(
            service.endTime,
            timezone,
          ),
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

  public async updateServiceCount(
    t: Prisma.TransactionClient,
    bookingId: string,
    dto: UpdateBookingServicesDto,
    companyId: string,
  ) {
    const booking = await this.prismaService.booking.findFirst({
      where: { id: bookingId, companyId },
      select: { id: true, services: { select: { id: true } } },
    });

    if (!booking)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Запись не найдена",
          detail: "Не удалось найти запись",
          meta: { booking_id: bookingId },
        },
        HttpStatus.NOT_FOUND,
      );

    const validIds = new Set(booking.services.map((s) => s.id));
    const invalid = dto.services.filter(
      (s) => !validIds.has(s.booking_service_id),
    );

    if (invalid.length > 0)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Некорректные услуги",
          detail: "Часть услуг не принадлежит этой записи",
          meta: {
            booking_id: bookingId,
            invalid_ids: invalid.map((s) => s.booking_service_id),
          },
        },
        HttpStatus.BAD_REQUEST,
      );

    const services = dto.services.map(
      async (s) =>
        await t.bookingService.update({
          where: { id: s.booking_service_id },
          data: { count: s.booking_service_count },
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
          },
        }),
    );

    /*
      ----- !!!! ПОДПРАВИТЬ ВЫВОД !!!! -----
    */
    return services;
  }

  async getAll(userId: string, locationId: string, query: GetBookingsDto) {
    const { customer, status, date, tag, sort, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const { isOwner, timezone } = await this.validationService.getUserLocation(
      userId,
      locationId,
    );

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

    const data = bookings.map((booking) => {
      const { start, end } = getBookingTimeRange(booking.services);
      return {
        id: booking.id,
        status: booking.status,
        tag: booking.tag,
        comment: booking.comment,
        date: formatDateInTimezone(start, timezone),
        start_time: formatBookingTime(start, timezone),
        end_time: formatBookingTime(end, timezone),
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
          booking_service_start_time: formatBookingTime(
            service.startTime,
            timezone,
          ),
          booking_service_end_time: formatBookingTime(
            service.endTime,
            timezone,
          ),
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
    });

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

  async statusUpdate(dto: BookingStatusDto, bookingId: string) {
    const booking = await this.getById(bookingId);

    const isExist =
      booking.status === "cancelled" || booking.status === "completed";

    if (isExist)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Не удалось изменить статус записи",
          detail: "Запись была отменена или завершена",
          meta: {
            booking_id: bookingId,
            booking_status: booking.status,
          },
        },
        HttpStatus.BAD_REQUEST,
      );

    const newBooking = await this.prismaService.booking.update({
      where: { id: bookingId },
      data: { status: dto.status },
      select: { id: true, status: true, tag: true, type: true },
    });

    return newBooking;
  }

  async details(bookingId: string, companyId: string) {
    const booking = await this.prismaService.booking.findFirst({
      where: { id: bookingId, companyId },
      select: {
        id: true,
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

    const history = await this.prismaService.orderBookingHistory.findMany({
      where: { bookingId },
      select: {
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
            createdAt: true,
            invoices: {
              select: {
                id: true,
                tag: true,
                type: true,
                amount: true,
                status: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const orders = history.map((h) => h.order);

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
        avatar: buildFileUrl(booking.location.avatar),
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
          avatar: buildFileUrl(booking.customer.avatar),
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
      invoice: {
        total: booking.order?.total,
        subtotal: booking.order?.subtotal,
        status: booking.order?.status,
        discount: booking.order?.discount,
        order_id: booking.order?.id,
      },
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        tag: o.tag,
        subtotal: o.subtotal,
        total: o.total,
        discount: o.discount,
        payment_method: o.paymentMethod,
        paid_at: o.paidAt ? formatDateInTimezone(o.paidAt, timezone) : null,
        invoices: o.invoices.map((i) => ({
          id: i.id,
          tag: i.tag,
          type: i.type,
          amount: i.amount,
          status: i.status,
          date: formatDateInTimezone(i.createdAt, timezone),
        })),
      })),
    };

    return res;
  }

  async getCustomerBookings(
    companyId: string,
    customerId: string,
    query: GetCustomerBookingsDto,
  ) {
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

    const { status, date, tag, sort, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const serviceFilter: Prisma.BookingServiceWhereInput = {
      ...(date && { startTime: getDayRange(date) }),
    };

    const where: Prisma.BookingWhereInput = {
      companyId,
      customerId: customer.customerId,
      ...(status && { status }),
      ...(tag && {
        tag: { contains: tag, mode: Prisma.QueryMode.insensitive },
      }),
      ...(Object.keys(serviceFilter).length > 0 && {
        services: { some: serviceFilter },
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
                  timezone: true,
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
        orderBy,
        skip,
        take: limit,
      }),
      this.prismaService.booking.count({ where }),
    ]);

    const data = bookings.map((booking) => {
      const { start, end } = getBookingTimeRange(booking.services);
      const timezone = booking.location.address?.timezone ?? DEFAULT_TIMEZONE;

      return {
        id: booking.id,
        status: booking.status,
        tag: booking.tag,
        date: formatDateInTimezone(start, timezone),
        start_time: formatBookingTime(start, timezone),
        end_time: formatBookingTime(end, timezone),
        comment: booking.comment,
        location: {
          id: booking.location.id,
          name: booking.location.name,
          avatar: buildFileUrl(booking.location.avatar),
          address: booking.location.address,
        },
        booking_services: booking.services.map((service) => ({
          booking_service_id: service.id,
          booking_service_start_time: formatBookingTime(
            service.startTime,
            timezone,
          ),
          booking_service_end_time: formatBookingTime(
            service.endTime,
            timezone,
          ),
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
    });

    return buildPaginatedResponse(data, total, page, limit);
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
}
