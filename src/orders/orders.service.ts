import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { DraftOrderDto } from "./dto/order-create.dto";
import { Prisma } from "@prisma/client";
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
import { generateTag } from "src/shared/utils/generate-tag.util";
import { getNextSequence } from "src/shared/utils/get-next-sequence.util";
import { IBookingWithOrder, IDraftOrderParams } from "./types/draft-order.type";
import { CalculatePriceDto } from "./dto/calculate-price.dto";
import { InvoicesService } from "src/invoices/invoices.service";
import { BookingsService } from "src/bookings/bookings.service";

@Injectable()
export class OrdersService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly invoiceService: InvoicesService,
    private readonly bookingService: BookingsService,
  ) {}

  private async findById(orderId: string, companyId: string) {
    const order = await this.prismaService.order.findFirst({
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
        company: {
          select: {
            locations: {
              select: { address: { select: { timezone: true } } },
              take: 1,
            },
          },
        },
        isDeposit: true,
        createdAt: true,
        invoices: {
          select: {
            id: true,
            tag: true,
            type: true,
            status: true,
            amount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Платеж не найден",
          detail: "Не удалось найти платеж",
          meta: { order_id: orderId },
        },
        HttpStatus.NOT_FOUND,
      );

    const timezone =
      order.company.locations[0].address?.timezone ?? DEFAULT_TIMEZONE;

    return { ...order, timezone };
  }

  private async findDetailById(
    orderId: string,
    companyId: string,
    t: Prisma.TransactionClient | PrismaService = this.prismaService,
  ) {
    const order = await t.order.findFirst({
      where: { id: orderId, companyId },
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

    if (!order)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Платеж не найден",
          detail: "Не удалось найти платеж",
          meta: { order_id: orderId },
        },
        HttpStatus.NOT_FOUND,
      );

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
  }

  private async resolveOrder(
    t: Prisma.TransactionClient,
    booking: IBookingWithOrder,
    params: IDraftOrderParams,
  ): Promise<string> {
    const order = booking.order;

    if (!order || order.status === "cancelled") {
      return this.create(t, { ...params });
    }

    if (order.status === "unpaid") {
      return this.update(t, order.id, { ...params });
    }

    throw new HttpException(
      {
        status: HttpStatus.BAD_REQUEST,
        title: "Не удалось сохранить заказ",
        detail: "Заказ уже оплачен или возвращён",
        meta: { booking_id: params.booking_id, order_status: order.status },
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  private async create(
    t: Prisma.TransactionClient,
    params: IDraftOrderParams,
  ): Promise<string> {
    const sequence = await getNextSequence(t, params.company_id, "order");
    const order = await t.order.create({
      data: {
        companyId: params.company_id,
        subtotal: params.subtotal,
        total: params.total,
        discount: params.discount,
        status: "unpaid",
        tag: sequence.toString(),
        comment: params.comment ?? null,
        bookings: { connect: { id: params.booking_id } },
      },
      select: { id: true },
    });

    await t.orderBookingHistory.create({
      data: { orderId: order.id, bookingId: params.booking_id },
    });

    await t.company.update({
      where: { id: params.company_id },
      data: { hasOrders: true },
    });

    return order.id;
  }

  private async update(
    t: Prisma.TransactionClient,
    order_id: string,
    params: Omit<IDraftOrderParams, "company_id" | "booking_id">,
  ): Promise<string> {
    const order = await t.order.update({
      where: { id: order_id },
      data: {
        subtotal: params.subtotal,
        total: params.total,
        discount: params.discount,
        ...(params.comment !== undefined && { comment: params.comment }),
      },
      select: { id: true },
    });

    return order.id;
  }

  async draft(dto: DraftOrderDto, bookingId: string, companyId: string) {
    const booking = await this.prismaService.booking.findFirst({
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

    if (booking.status === "cancelled")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Не удалось создать заказ",
          detail: "Запись была отменена",
          meta: {
            booking_id: bookingId,
            booking_status: booking.status,
          },
        },
        HttpStatus.BAD_REQUEST,
      );

    return this.prismaService.$transaction(async (t) => {
      if (dto.services?.length) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await this.bookingService.updateServiceCount(
          t,
          bookingId,
          { services: dto.services },
          companyId,
        );
      }

      const updateServices = await t.bookingService.findMany({
        where: { bookingId },
      });

      const subtotal: number = updateServices.reduce(
        (sum, s) => sum + Number(s.unitPrice) * s.count,
        0,
      );
      const discount = dto.discount ?? 0;
      const total = subtotal - discount;

      const orderId = await this.resolveOrder(t, booking, {
        company_id: companyId,
        booking_id: bookingId,
        subtotal,
        total,
        discount,
        comment: dto.comment,
      });

      return this.findDetailById(orderId, companyId, t);
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
        where: {
          id: orderId,
          companyId,
        },
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

      const amount = updOrder.total - (updOrder.discount ?? 0);

      const invoiceSequence = await getNextSequence(t, companyId, "invoice");

      const invoiceTag = generateTag("CN", invoiceSequence);

      const invoiceId = await this.invoiceService.createInvoiceWithPdf(t, {
        orderId,
        companyId,
        amount,
        tag: invoiceTag,
        type: "paid",
        snapshot: {
          order_id: updOrder.id,
          payment_method: updOrder.paymentMethod,
          comment: updOrder.comment,
          discount: updOrder.discount,
          tag: updOrder.tag,
        },
        pdfParams: { tag: invoiceTag },
      });

      await t.transaction.create({
        data: {
          companyId,
          orderId,
          invoiceId,
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
          title: "Не удалось оформить возврат",
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

      const chargeInvoice = await t.invoice.findFirst({
        where: { orderId, type: "paid", status: "success" },
        select: { amount: true },
      });

      if (!chargeInvoice) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            title: "Не удалось оформить возврат",
            detail: "Не найден чек об оплате для этого заказа",
            meta: { order_id: orderId },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const invoiceSequence = await getNextSequence(t, companyId, "invoice");

      const invoiceTag = generateTag("CN", invoiceSequence);

      const invoiceId = await this.invoiceService.createInvoiceWithPdf(t, {
        orderId,
        companyId,
        amount: -chargeInvoice.amount,
        tag: invoiceTag,
        type: "refunded",
        snapshot: {
          order_id: updOrder.id,
          payment_method: updOrder.paymentMethod,
          comment: updOrder.comment,
          discount: updOrder.discount,
          tag: updOrder.tag,
        },
        pdfParams: { tag: invoiceTag },
      });

      await t.transaction.create({
        data: {
          companyId,
          orderId,
          invoiceId,
          type: "refund_deduction",
          amount: -chargeInvoice.amount,
        },
      });

      const allInvoices = await t.invoice.findMany({
        where: { orderId },
        select: {
          id: true,
          tag: true,
          amount: true,
          status: true,
          type: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
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
        invoices: allInvoices.map((inv) => ({
          id: inv.id,
          tag: inv.tag,
          amount: inv.amount,
          status: inv.status,
          type: inv.type,
          date: formatDateInTimezone(inv.createdAt, order.timezone),
        })),
      };
    });
  }

  async calculatePrice(
    bookingId: string,
    companyId: string,
    dto: CalculatePriceDto,
  ) {
    const booking = await this.prismaService.booking.findFirst({
      where: { id: bookingId, companyId },
      select: {
        order: { select: { discount: true } },
        services: { select: { id: true, unitPrice: true, count: true } },
      },
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

    const services = booking.services.map((s) => {
      const override = dto.services?.find((d) => d.booking_service_id === s.id);
      return {
        unit_price: s.unitPrice,
        count: override?.booking_service_count ?? s.count,
      };
    });

    const subtotal = services.reduce(
      (sum, s) => sum + s.unit_price * s.count,
      0,
    );
    const discount = dto.discount ?? booking.order?.discount ?? 0;
    const total = subtotal - discount;

    return { subtotal, total, discount };
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

      invoices: order.invoices.map((invoice) => ({
        id: invoice.id,
        tag: invoice.tag,
        amount: invoice.amount,
        status: invoice.status,
        type: invoice.type,
        date: formatDateInTimezone(invoice.createdAt, timezone),
      })),
    };
  }

  /*
    ----- СТАРЫЙ ВАРИАНТ СОЗДАНИЯ ЗАКАЗА -----
  */
  // async create(dto: DraftOrderDto, companyId: string) {
  //   return await this.prismaService.$transaction(async (t) => {
  //     const bookings = await t.booking.findMany({
  //       where: {
  //         id: { in: dto.booking_ids },
  //         orderId: null,
  //         status: BookingStatus.completed,
  //       },
  //       include: { services: { select: { unitPrice: true } } },
  //     });

  //     if (!bookings.length)
  //       throw new HttpException(
  //         {
  //           status: HttpStatus.BAD_REQUEST,
  //           title: "Ошибка заказа",
  //           detail: "Не удалось оформить заказ",
  //           meta: { bookings: dto.booking_ids },
  //         },
  //         HttpStatus.BAD_REQUEST,
  //       );

  //     const subtotal = bookings.reduce(
  //       (sum, booking) =>
  //         sum +
  //         booking.services.reduce(
  //           (s, service) => s + Number(service.unitPrice),
  //           0,
  //         ),
  //       0,
  //     );

  //     const order = await t.order.create({
  //       data: {
  //         status: "unpaid",
  //         subtotal,
  //         tag: generateOrderTag(),
  //         companyId,
  //         paymentMethod: dto.payment_method ?? null,
  //         bookings: { connect: bookings.map((b) => ({ id: b.id })) },
  //       },
  //       select: {
  //         id: true,
  //         status: true,
  //         subtotal: true,
  //         total: true,
  //         tag: true,
  //         paymentMethod: true,
  //         paidAt: true,
  //         comment: true,
  //         discount: true,
  //         createdAt: true,
  //         bookings: {
  //           select: {
  //             id: true,
  //             status: true,
  //             tag: true,
  //             comment: true,
  //             location: { select: { address: { select: { timezone: true } } } },
  //             services: {
  //               select: {
  //                 id: true,
  //                 unitPrice: true,
  //                 startTime: true,
  //                 endTime: true,
  //                 duration: true,
  //                 count: true,
  //                 service: {
  //                   select: {
  //                     id: true,
  //                     name: true,
  //                     avatar: true,
  //                     mark: true,
  //                     category: true,
  //                     price: { select: { price: true, costPrice: true } },
  //                     duration: true,
  //                   },
  //                 },
  //                 employee: {
  //                   select: {
  //                     id: true,
  //                     firstName: true,
  //                     lastName: true,
  //                     phone: true,
  //                     avatar: true,
  //                   },
  //                 },
  //               },
  //             },
  //             customer: {
  //               select: {
  //                 id: true,
  //                 firstName: true,
  //                 lastName: true,
  //                 phone: true,
  //                 email: true,
  //                 avatar: true,
  //                 birthday: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     });

  //     await t.booking.updateMany({
  //       where: { id: { in: dto.booking_ids }, orderId: null },
  //       data: { orderId: order.id },
  //     });

  //     await this.prismaService.company.update({
  //       where: { id: companyId },
  //       data: { hasOrders: true },
  //     });

  //     const timezone =
  //       order.bookings[0]?.location.address?.timezone ?? DEFAULT_TIMEZONE;

  //     return {
  //       id: order.id,
  //       status: order.status,
  //       tag: order.tag,
  //       subtotal: order.subtotal,
  //       total: order.total,
  //       date: formatDateInTimezone(order.createdAt, timezone),
  //       time: formatBookingTime(order.createdAt, timezone),
  //       payment_method: order.paymentMethod,
  //       is_payment: !!order.paidAt,
  //       discount: order.discount,

  //       bookings: order.bookings.map((booking) => {
  //         const { start, end } = getBookingTimeRange(booking.services);

  //         return {
  //           id: booking.id,
  //           status: booking.status,
  //           tag: booking.tag,
  //           comment: booking.comment,
  //           date: formatDateInTimezone(start, timezone),
  //           start_time: formatBookingTime(start, timezone),
  //           end_time: formatBookingTime(end, timezone),
  //           customer: {
  //             id: booking.customer.id,
  //             profile_id: null,
  //             first_name: booking.customer.firstName,
  //             last_name: booking.customer.lastName,
  //             full_name: getFullName(
  //               booking.customer.firstName,
  //               booking.customer.lastName,
  //             ),
  //             phone: booking.customer.phone,
  //             email: booking.customer.email,
  //             birthday: booking.customer.birthday,
  //             avatar: buildFileUrl(booking.customer.avatar),
  //           },
  //           booking_services: booking.services.map((service) => ({
  //             booking_service_id: service.id,
  //             booking_service_start_time: formatBookingTime(
  //               service.startTime,
  //               timezone,
  //             ),
  //             booking_service_end_time: formatBookingTime(
  //               service.endTime,
  //               timezone,
  //             ),
  //             booking_service_duration: service.duration,
  //             booking_service_price: service.unitPrice,
  //             booking_service_count: service.count,
  //             service: {
  //               service_id: service.service.id,
  //               name: service.service.name,
  //               mark: service.service.mark,
  //               duration: service.service.duration,
  //               avatar: buildFileUrl(service.service.avatar),
  //               category: service.service.category,
  //               prices: {
  //                 price: service.service.price?.price,
  //                 cost_price: service.service.price?.costPrice,
  //               },
  //             },
  //             user: {
  //               user_id: service.employee.id,
  //               first_name: service.employee.firstName,
  //               last_name: service.employee.lastName,
  //               full_name: getFullName(
  //                 service.employee.firstName,
  //                 service.employee.lastName,
  //               ),
  //               phone: service.employee.phone,
  //               avatar: buildFileUrl(service.employee.avatar),
  //             },
  //           })),
  //         };
  //       }),
  //     };
  //   });
  // }
}
