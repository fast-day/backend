import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { NewOrderCreateDto, OrderCreateDto } from "./dto/order-create.dto";
import { BookingStatus, Prisma } from "@prisma/client";
import { generateOrderTag } from "./utils/generate-order-tag";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";
import { GetOrdersDto, OrderSortOrder } from "./dto/get-orders.dto";
import { getFullName } from "src/shared/utils/get-full-name.util";
import { buildFileUrl } from "src/shared/utils/build-url";
import {
  formatBookingTime,
  formatDateInTimezone,
} from "src/bookings/utils/format-time.util";
import { DEFAULT_TIMEZONE } from "src/shared/constant/timezone.constant";
import { getBookingTimeRange } from "src/bookings/utils/time-range.util";
import { OrderPaidDto } from "./dto/order-paid.dto";

@Injectable()
export class OrdersService {
  public constructor(private readonly prismaService: PrismaService) {}

  private async findById(orderId: string, companyId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId, companyId },
      select: {
        id: true,
        status: true,
        subtotal: true,
        total: true,
        tag: true,
        publicCode: true,
        comment: true,
        paidAt: true,
        discount: true,
        paymentMethod: true,
        isDeposit: true,
        createdAt: true,
      },
    });

    if (!order)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Платеж не найден",
          detail: "Не найти платеж",
          meta: { order_id: orderId },
        },
        HttpStatus.NOT_FOUND,
      );

    return order;
  }

  async newOrder(dto: NewOrderCreateDto, bookingId: string, companyId: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId, companyId },
      include: { order: true, services: true },
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

    const isOrderExist =
      !booking?.order || booking.order.status === "cancelled";

    if (!isOrderExist)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Не удалось создать заказ",
          detail: "У записи уже есть активный заказ",
          meta: {
            booking_id: bookingId,
            order_status: booking.order?.status,
          },
        },
        HttpStatus.BAD_REQUEST,
      );

    const subtotal = booking?.services.reduce(
      (sum, service) => sum + Number(service.unitPrice) * service.count,
      0,
    );

    return this.prismaService.$transaction(async (t) => {
      const order = await t.order.create({
        data: {
          companyId,
          subtotal,
          status: "unpaid",
          tag: generateOrderTag(),
          comment: dto.comment ?? null,
          bookings: { connect: { id: bookingId } },
        },
        select: {
          id: true,
          status: true,
          subtotal: true,
          total: true,
          tag: true,
          paymentMethod: true,
          paidAt: true,
          comment: true,
          discount: true,
          createdAt: true,
          bookings: {
            select: {
              id: true,
              status: true,
              tag: true,
              comment: true,
              location: { select: { address: { select: { timezone: true } } } },
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
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  email: true,
                  avatar: true,
                  birthday: true,
                },
              },
            },
          },
        },
      });

      await t.orderBookingHistory.create({
        data: { orderId: order.id, bookingId: bookingId },
      });

      const timezone =
        order.bookings[0]?.location.address?.timezone ?? DEFAULT_TIMEZONE;

      return {
        id: order.id,
        status: order.status,
        tag: order.tag,
        subtotal: order.subtotal,
        total: order.total,
        date: formatDateInTimezone(order.createdAt, timezone),
        time: formatBookingTime(order.createdAt, timezone),
        payment_method: order.paymentMethod,
        is_payment: !!order.paidAt,
        discount: order.discount,

        bookings: order.bookings.map((booking) => {
          const { start, end } = getBookingTimeRange(booking.services);

          return {
            id: booking.id,
            status: booking.status,
            tag: booking.tag,
            comment: booking.comment,
            date: formatDateInTimezone(start, timezone),
            start_time: formatBookingTime(start, timezone),
            end_time: formatBookingTime(end, timezone),
            customer: {
              id: booking.customer.id,
              profile_id: null,
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
        }),
        invoices: null,
      };
    });
  }

  async cancel(orderId: string, companyId: string) {
    const order = await this.findById(orderId, companyId);

    if (order.status !== "unpaid")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Не удалось отменить заказ",
          detail: "Статус заказа не позволяет сделать отмену",
          meta: {
            order_id: orderId,
            order_status: order.status,
          },
        },
        HttpStatus.BAD_REQUEST,
      );

    return this.prismaService.$transaction(async (t) => {
      const updOrder = await t.order.update({
        where: { id: orderId, companyId },
        data: { status: "cancelled" },
        select: {
          id: true,
          status: true,
          subtotal: true,
          discount: true,
          comment: true,
          tag: true,
        },
      });

      await t.booking.updateMany({
        where: { orderId: updOrder.id, companyId },
        data: { orderId: null },
      });

      return updOrder;
    });
  }

  async create(dto: OrderCreateDto, companyId: string) {
    return await this.prismaService.$transaction(async (t) => {
      const bookings = await t.booking.findMany({
        where: {
          id: { in: dto.booking_ids },
          orderId: null,
          status: BookingStatus.confirmed,
        },
        include: { services: { select: { unitPrice: true } } },
      });

      if (!bookings.length)
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            title: "Ошибка заказа",
            detail: "Не удалось оформить заказ",
            meta: { bookings: dto.booking_ids },
          },
          HttpStatus.BAD_REQUEST,
        );

      const subtotal = bookings.reduce(
        (sum, booking) =>
          sum +
          booking.services.reduce(
            (s, service) => s + Number(service.unitPrice),
            0,
          ),
        0,
      );

      const order = await t.order.create({
        data: {
          status: "unpaid",
          subtotal,
          tag: generateOrderTag(),
          companyId,
          paymentMethod: dto.payment_method ?? null,
          bookings: { connect: bookings.map((b) => ({ id: b.id })) },
        },
        select: {
          id: true,
          status: true,
          subtotal: true,
          total: true,
          tag: true,
          paymentMethod: true,
          paidAt: true,
          comment: true,
          discount: true,
          createdAt: true,
          bookings: {
            select: {
              id: true,
              status: true,
              tag: true,
              comment: true,
              location: { select: { address: { select: { timezone: true } } } },
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
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  email: true,
                  avatar: true,
                  birthday: true,
                },
              },
            },
          },
        },
      });

      await t.booking.updateMany({
        where: { id: { in: dto.booking_ids }, orderId: null },
        data: { orderId: order.id },
      });

      await this.prismaService.company.update({
        where: { id: companyId },
        data: { hasOrders: true },
      });

      const timezone =
        order.bookings[0]?.location.address?.timezone ?? DEFAULT_TIMEZONE;

      return {
        id: order.id,
        status: order.status,
        tag: order.tag,
        subtotal: order.subtotal,
        total: order.total,
        date: formatDateInTimezone(order.createdAt, timezone),
        time: formatBookingTime(order.createdAt, timezone),
        payment_method: order.paymentMethod,
        is_payment: !!order.paidAt,
        discount: order.discount,

        bookings: order.bookings.map((booking) => {
          const { start, end } = getBookingTimeRange(booking.services);

          return {
            id: booking.id,
            status: booking.status,
            tag: booking.tag,
            comment: booking.comment,
            date: formatDateInTimezone(start, timezone),
            start_time: formatBookingTime(start, timezone),
            end_time: formatBookingTime(end, timezone),
            customer: {
              id: booking.customer.id,
              profile_id: null,
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
        }),
      };
    });
  }

  async paidOrder(dto: OrderPaidDto, orderId: string, companyId: string) {
    const order = await this.findById(orderId, companyId);

    if (order.status !== "unpaid")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Не удалось завершить платеж",
          detail: "Статус заказа не позволяет провести оплату",
          meta: { order_id: orderId, status: order.status },
        },
        HttpStatus.BAD_REQUEST,
      );

    return this.prismaService.$transaction(async (t) => {
      const updOrder = await t.order.update({
        where: { id: orderId, companyId },
        data: {
          status: "paid",
          paymentMethod: dto.payment_method,
          comment: dto.comment ?? null,
          total: order.subtotal,
          paidAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          subtotal: true,
          total: true,
          tag: true,
          paymentMethod: true,
          paidAt: true,
          comment: true,
          discount: true,
          createdAt: true,
        },
      });

      await t.booking.updateMany({
        where: { orderId, status: { not: "cancelled" } },
        data: { status: "completed" },
      });

      const amount = updOrder.subtotal - (updOrder.discount ?? 0);

      const receipt = await t.receipt.create({
        data: {
          orderId,
          amount: amount,
          status: "success",
          snapshot: {
            order_id: updOrder.id,
            payment_method: updOrder.paymentMethod,
            comment: updOrder.comment,
            discount: updOrder.discount,
            tag: updOrder.tag,
          },
        },
        select: { id: true },
      });

      await t.transaction.create({
        data: {
          companyId,
          orderId,
          receiptId: receipt.id,
          type: "earning",
          amount: amount,
        },
      });

      return {
        id: updOrder.id,
        status: updOrder.status,
        tag: updOrder.tag,
        subtotal: updOrder.subtotal,
        total: updOrder.total,
        payment_method: updOrder.paymentMethod,
        is_payment: !!updOrder.paidAt,
        discount: updOrder.discount,
      };
    });
  }

  async refundOrder(orderId: string, companyId: string) {
    const order = await this.findById(orderId, companyId);

    if (order.status !== "paid")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Не удалось выполнить возврат средств",
          detail: "Статус заказа не позволяет выполнить возврат средств",
          meta: { order_id: orderId, status: order.status },
        },
        HttpStatus.BAD_REQUEST,
      );

    return await this.prismaService.$transaction(async (t) => {
      const updOrder = await t.order.update({
        where: { id: orderId, companyId },
        data: {
          status: "refund",
        },
        select: {
          id: true,
          status: true,
          subtotal: true,
          total: true,
          tag: true,
          paymentMethod: true,
          paidAt: true,
          comment: true,
          discount: true,
          createdAt: true,
        },
      });

      return {
        id: updOrder.id,
        status: updOrder.status,
        tag: updOrder.tag,
        subtotal: updOrder.subtotal,
        total: updOrder.total,
        payment_method: updOrder.paymentMethod,
        is_payment: !!updOrder.paidAt,
        discount: updOrder.discount,
      };
    });
  }

  async getAll(companyId: string, query: GetOrdersDto) {
    const { status, sort, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const where = {
      companyId,
      ...(status && { status }),
    };

    const orderBy: Prisma.OrderOrderByWithRelationInput =
      sort === OrderSortOrder.OLDEST
        ? { createdAt: "asc" }
        : sort === OrderSortOrder.PRICE_ASC
          ? { total: "asc" }
          : sort === OrderSortOrder.PRICE_DESC
            ? { total: "desc" }
            : { createdAt: "desc" };

    const [orders, total] = await Promise.all([
      this.prismaService.order.findMany({
        where,
        select: {
          id: true,
          tag: true,
          status: true,
          subtotal: true,
          total: true,
          paymentMethod: true,
          paidAt: true,
          createdAt: true,
          history: {
            select: {
              booking: {
                select: {
                  id: true,
                  location: {
                    select: { address: { select: { timezone: true } } },
                  },
                  customer: {
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
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prismaService.order.count({ where }),
    ]);

    const data = orders.map((ord) => {
      const booking = ord.history[0]?.booking;
      const timezone = booking?.location?.address?.timezone ?? DEFAULT_TIMEZONE;

      return {
        id: ord.id,
        tag: ord.tag,
        status: ord.status,
        subtotal: ord.subtotal,
        total: ord.total,
        date: formatDateInTimezone(ord.createdAt, timezone),
        time: formatBookingTime(ord.createdAt, timezone),
        payment_method: ord.paymentMethod,
        is_payment: !!ord.paidAt,
        booking_ids: ord.history.map((h) => h.booking.id),
        customer: booking?.customer
          ? {
              id: booking.customer.id,
              first_name: booking.customer.firstName,
              last_name: booking.customer.lastName,
              full_name: getFullName(
                booking.customer.firstName,
                booking.customer.lastName,
              ),
              phone: booking.customer.phone,
              avatar: buildFileUrl(booking.customer.avatar),
            }
          : null,
      };
    });

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getCustomerOrders(
    companyId: string,
    customerId: string,
    query: GetOrdersDto,
  ) {
    const { status, sort, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const customer = await this.prismaService.customerCompany.findUnique({
      where: {
        companyId,
        id: customerId,
      },
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

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      companyId,
      bookings: { some: { companyId } },
    };

    const orderBy: Prisma.OrderOrderByWithRelationInput =
      sort === OrderSortOrder.OLDEST
        ? { createdAt: "asc" }
        : sort === OrderSortOrder.PRICE_ASC
          ? { total: "asc" }
          : sort === OrderSortOrder.PRICE_DESC
            ? { total: "desc" }
            : { createdAt: "desc" };

    const [orders, total] = await Promise.all([
      this.prismaService.order.findMany({
        where,
        select: {
          id: true,
          status: true,
          subtotal: true,
          total: true,
          tag: true,
          paymentMethod: true,
          paidAt: true,
          comment: true,
          discount: true,
          createdAt: true,
          bookings: {
            where: { customerId: customer.customerId },
            select: {
              id: true,
              location: { select: { address: { select: { timezone: true } } } },
              status: true,
              tag: true,
              comment: true,
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
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prismaService.order.count({ where }),
    ]);

    const data = orders.map((order) => {
      const timezone =
        order.bookings[0]?.location?.address?.timezone ?? DEFAULT_TIMEZONE;
      return {
        id: order.id,
        status: order.status,
        subtotal: order.subtotal,
        total: order.total,
        date: formatDateInTimezone(order.createdAt, timezone),
        discount: order.discount,
        tag: order.tag,
        payment_method: order.paymentMethod,
        comment: order.comment,
        is_payment: !!order.paidAt,

        bookings: order.bookings.map((booking) => {
          const { start, end } = getBookingTimeRange(booking.services);
          return {
            id: booking.id,
            status: booking.status,
            tag: booking.tag,
            comment: booking.comment,
            date: formatDateInTimezone(start, timezone),
            start_time: formatBookingTime(start, timezone),
            end_time: formatBookingTime(end, timezone),
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
        }),
      };
    });

    return buildPaginatedResponse(data, total, page, limit);
  }

  async details(orderId: string, companyId: string) {
    const order = await this.findById(orderId, companyId);

    const history = await this.prismaService.orderBookingHistory.findMany({
      where: { orderId },
      select: {
        booking: {
          select: {
            id: true,
            status: true,
            tag: true,
            comment: true,
            location: { select: { address: { select: { timezone: true } } } },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                avatar: true,
                birthday: true,
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
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const bookings = history.map((h) => h.booking);

    const timezone =
      bookings[0]?.location.address?.timezone ?? DEFAULT_TIMEZONE;

    return {
      id: order.id,
      status: order.status,
      tag: order.tag,
      subtotal: order.subtotal,
      total: order.total,
      date: formatDateInTimezone(order.createdAt, timezone),
      time: formatBookingTime(order.createdAt, timezone),
      payment_method: order.paymentMethod,
      is_payment: !!order.paidAt,
      discount: order.discount,

      bookings: bookings
        .map((booking) => {
          const { start, end } = getBookingTimeRange(booking.services);

          return {
            id: booking.id,
            status: booking.status,
            tag: booking.tag,
            comment: booking.comment,
            date: formatDateInTimezone(start, timezone),
            start_time: formatBookingTime(start, timezone),
            end_time: formatBookingTime(end, timezone),
            customer: {
              id: booking.customer.id,
              profile_id: null,
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
        })
        .filter(Boolean),
    };
  }
}
