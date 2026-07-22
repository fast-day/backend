/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderCreateDto } from './dto/order-create.dto';
import { BookingStatus, Prisma } from '@prisma/client';
import { generateOrderTag } from './utils/generate-order-tag';
import { buildPaginatedResponse, getPaginationParams } from 'src/shared/common/pagination/pagination';
import { GetOrdersDto, OrderSortOrder } from './dto/get-orders.dto';
import { getFullName } from 'src/shared/utils/get-full-name.util';
import { buildFileUrl } from 'src/shared/utils/build-url';

@Injectable()
export class OrdersService {
  public constructor(private readonly prismaService: PrismaService) {}

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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          sum + booking.services.reduce((s, service) => s + Number(service.unitPrice), 0),
        0,
      );
      
      const order = await t.order.create({
        data: {
          status: dto.status ?? "pending",
          subtotal,
          tag: generateOrderTag(),
          companyId,
          paymentMethod: dto.payment_method ?? null,
          bookings: { connect: bookings.map(b => ({ id: b.id })) }
        },
        select: {
          id: true,
          tag: true,
          paymentMethod: true,
          status: true,
          total: true,
          subtotal: true,
          comment: true,
        }
      });

      await t.booking.updateMany({
        where: { id: { in: dto.booking_ids }, orderId: null },
        data: { orderId: order.id },
      });

      return {
        id: order.id,
        tag: order.tag,
        status: order.status,
        payment_method: order.paymentMethod,
        total: order.total,
        subtotal: order.subtotal,
        comment: order.comment ?? null,
      };
    });
  }

  async getAll(companyId: string,  query: GetOrdersDto) {
    const { status, sort, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const where = {
      companyId,
      ...(status && { status }),
    }

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
          bookings: {
            select: {
              id: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  avatar: true,
                }
              }
            }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prismaService.order.count({ where }),
    ]);

    const data = orders.map((ord) => ({
      id: ord.id,
      tag: ord.tag,
      status: ord.status,
      subtotal: ord.subtotal,
      total: ord.total,
      payment_method: ord.paymentMethod,
      is_payment: !ord.paidAt,
      booking_ids: ord.bookings.map((b) => b.id),
      customer: {
        id: ord.bookings[0]?.customer.id || null,
        first_name: ord.bookings[0]?.customer.firstName || null,
        last_name: ord.bookings[0]?.customer.lastName || null,
        full_name: getFullName(ord.bookings[0]?.customer.firstName, ord.bookings[0]?.customer.lastName) || null,
        phone: ord.bookings[0]?.customer.phone || null,
        avatar: buildFileUrl(ord.bookings[0]?.customer.avatar) || null,
      }
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getCustomerOrders (companyId: string, customerId: string) {
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
        },
        HttpStatus.NOT_FOUND,
      );

    const orders = await this.prismaService.order.findMany({
      where: {
        companyId,
        // customerId: customer.customerId
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
        bookings: {
          select: {
            id: true,
            status: true,
            tag: true,
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
          }
        }
      }
    });

    return orders.map((order) => ({
      id: order.id,
      status: order.status,
      subtotal: order.subtotal,
      total: order.total,
      discount: order.discount,
      tag: order.tag,
      payment_method: order.paymentMethod,
      comment: order.comment,
      is_payment: !!order.paidAt,
      // bookings: order.bookings.map((booking) => ({
        // id: booking.id,
        // status: booking.status,
        // tag: booking.tag,
        // date: booking.date.toISOString().split("T")[0],
        // new_data: booking.services,
      // }))
    }));
  }

  async details(orderId: string, companyId: string) {
    const order = await this.prismaService.order.findFirst({
      where: { id: orderId },
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
        bookings: {
          select: {
            id: true,
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
                service: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    mark: true,
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
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      }
    });

    if (!order)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Заказ не найден.",
          meta: { order_id: orderId },
        },
        HttpStatus.NOT_FOUND,
      );

    /*
      ===== В БУДУЩЕМ ПОМЕНЯТЬ КОНЦЕПЦИЮ - А ПОКА РАБОТАЕТ ТАК =====
    */
    // const customerCompany = await this.prismaService.customerCompany.findUnique(
    //   {
    //     where: {
    //       customerId_companyId: {
    //         customerId: order.bookings[0].customer.id,
    //         companyId,
    //       },
    //     },
    //     select: { id: true },
    //   },
    // );

    return {
      id: order.id,
      status: order.status,
      tag: order.tag,
      subtotal: order.subtotal,
      total: order.total,
      payment_method: order.paymentMethod,
      is_payment: !!order.paidAt,
      discount: order.discount,
      // booking: order.bookings,
      // bookings: order.bookings.map((book) => ({
        // id: book.id,
        // status: book.status,
        // tag: book.tag,
        // date: book.date.toISOString().split("T")[0],
        // comment: book.comment,
        // new_data: book.services,
        // employee: {
        //   id: book.employee.id,
        //   first_name: book.employee.firstName,
        //   last_name: book.employee.lastName,
        //   full_name: getFullName(book.employee.firstName, book.employee.lastName),
        //   email: book.employee.email,
        //   phone: book.employee.phone,
        //   avatar: buildFileUrl(book.employee.avatar),
        // },
        // services: book.services.map((service) => ({
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
        // customer: {
        //   id: book.customer.id,
        //   profile_id: customerCompany?.id,
        //   first_name: book.customer.firstName,
        //   last_name: book.customer.lastName,
        //   full_name: getFullName(book.customer.firstName, book.customer.lastName),
        //   email: book.customer.email,
        //   phone: book.customer.phone,
        //   avatar: buildFileUrl(book.customer.avatar),
        // },
      // })),
    }
  }

}
