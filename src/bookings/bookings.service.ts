import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BookingCreateDto } from "./dto/booking-create.dto";
import { IBookingDetails } from "./type/bookings.type";
import { BookingStatusDto } from "./dto/booking-status.dto";
import { BookingUpdateDto } from "./dto/booking-update.dto";
import { BookingCreateCustomerDto } from "./dto/booking-create-customer.dto";
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
import { generateOrderTag } from "src/orders/utils/generate-order-tag";
import { getFullName } from "src/shared/utils/get-full-name.util";

@Injectable()
export class BookingsService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly orderService: OrdersService,
    private readonly mailService: MailService,
  ) {}

  private async validateLocation(
    locationId: string,
    serviceId: string,
  ): Promise<boolean> {
    const location = await this.prismaService.locationService.findFirst({
      where: { locationId, serviceId },
    });

    if (!location)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка локации",
          detail: "Данная услуга не доступна в выбранном месте",
          meta: { location_id: locationId },
        },
        HttpStatus.BAD_REQUEST,
      );

    return true;
  }

  private async validateEmployeeLocation(
    userId: string,
    locationId,
  ): Promise<string> {
    const employeeLocation = await this.prismaService.userLocation.findFirst({
      where: { userId, locationId },
    });

    if (!employeeLocation)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка сотрудника",
          detail: "Выбранный сотрудник не работает в данной локации.",
          meta: { employee_id: userId },
        },
        HttpStatus.BAD_REQUEST,
      );

    return employeeLocation.id;
  }

  private async validateService(
    serviceId: string,
    companyId: string,
  ): Promise<boolean> {
    const service = await this.prismaService.service.findFirst({
      where: {
        id: serviceId,
        companyId,
      },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка Услуги",
          detail: "Услуга не найдена",
          meta: { service_id: serviceId },
        },
        HttpStatus.BAD_REQUEST,
      );

    return true;
  }

  private async validateEmployeeService(
    userId: string,
    serviceId: string,
  ): Promise<boolean> {
    const employee = await this.prismaService.userService.findFirst({
      where: { userId, serviceId },
    });

    if (!employee)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка услуги",
          detail: "Выбранный сотрудник не оказывает данную услугу.",
          meta: { employee_id: userId },
        },
        HttpStatus.BAD_REQUEST,
      );

    return true;
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

    const isCustomerCompany =
      await this.prismaService.customerCompany.findFirst({
        where: { customerId: customer.id, companyId },
        select: { id: true, customerId: true },
      });

    if (!isCustomerCompany) {
      await this.prismaService.customerCompany.create({
        data: {
          companyId,
          customerId: customer.id,
        },
      });
    }

    return customer.id;
  }

  private async validateCustomerWorked(
    date: Date,
    userLocationId: string,
    start_time: string,
    end_time: string,
  ): Promise<boolean> {
    const isWorked = await this.prismaService.schedule.findFirst({
      where: {
        date: new Date(date),
        userLocationId,
        intervals: {
          some: {
            start: { lte: start_time },
            end: { gte: end_time },
          },
        },
      },
    });

    if (!isWorked)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка расписания",
          detail: "Сотрудник не работает в указанный период времени.",
          meta: { employee_id: userLocationId },
        },
        HttpStatus.BAD_REQUEST,
      );

    return true;
  }

  private async validateOverlapping(
    employeeId: string,
    date: Date,
    end_time: string,
    start_time: string,
    booking_id: string = "",
  ): Promise<boolean> {
    const isOverlapping = await this.prismaService.booking.findFirst({
      where: {
        employeeId,
        date: new Date(date),
        id: { not: booking_id },
        startTime: { lt: end_time },
        endTime: { gt: start_time },
      },
    });

    if (isOverlapping)
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

    return true;
  }

  private async validateCustomerOverlapping(
    customerId: string,
    date: Date,
    start_time: string,
    end_time: string,
  ) {
    const overlap = await this.prismaService.booking.findFirst({
      where: {
        customerId,
        date: new Date(date),
        startTime: { lt: end_time },
        endTime: { gt: start_time },
      },
    });

    if (overlap)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка бронирования",
          detail: "Услуга уже забронирована другим пользователем",
          meta: { customer_id: customerId },
        },
        HttpStatus.BAD_REQUEST,
      );
  }

  async create(dto: BookingCreateDto, company_id: string) {
    return this.prismaService.$transaction(async (t) => {
      await this.validateLocation(dto.location_id, dto.service_id);
      const locationId = await this.validateEmployeeLocation(
        dto.employee_id,
        dto.location_id,
      );
      await this.validateEmployeeService(dto.employee_id, dto.service_id);
      const customerId = await this.validateCustomer(
        dto.customer_id,
        company_id,
      );
      await this.validateService(dto.service_id, company_id);
      await this.validateCustomerWorked(
        new Date(dto.date),
        locationId,
        dto.start_time,
        dto.end_time,
      );
      await this.validateOverlapping(
        dto.employee_id,
        new Date(dto.date),
        dto.end_time,
        dto.start_time,
      );
      await this.validateCustomerOverlapping(
        customerId,
        new Date(dto.date),
        dto.start_time,
        dto.end_time,
      );

      const booking = await t.booking.create({
        data: {
          tag: generateBookingTag(),
          date: new Date(dto.date),
          startTime: dto.start_time,
          endTime: dto.end_time,
          comment: dto.comment ?? null,
          status: dto.status ?? "pending",
          employeeId: dto.employee_id,
          customerId: customerId,
          serviceId: dto.service_id,
          locationId: dto.location_id,
          companyId: company_id,
        },
        select: {
          id: true,
          tag: true,
          status: true,
          date: true,
          startTime: true,
          endTime: true,
          comment: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          customer: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
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
        },
      });

      const res = {
        id: booking.id,
        status: booking.status,
        tag: booking.tag,
        start_time: booking.startTime,
        end_time: booking.endTime,
        date: booking.date,
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
        employee: {
          id: booking.employee.id,
          first_name: booking.employee.firstName,
          last_name: booking.employee.lastName,
          full_name: getFullName(
            booking.employee.firstName,
            booking.employee.lastName,
          ),
          avatar: buildFileUrl(booking.employee.avatar),
          email: booking.employee.email,
          phone: booking.employee.phone,
        },
        service: {
          id: booking.service.id,
          name: booking.service.name,
          duration: booking.service.duration,
          avatar: buildFileUrl(booking.service.avatar),
          prices: {
            price: booking.service.price?.price,
            cost_price: booking.service.price?.costPrice,
          },
        },
      };

      return res;
    });
  }

  async getAll(userId: string, locationId: string, query: GetBookingsDto) {
    const {
      customer,
      employee,
      service,
      status,
      tag,
      date,
      sort,
      ...pagination
    } = query;
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

    const where = {
      locationId,
      ...(!isOwner && { employeeId: userId }),
      ...(status && { status }),
      ...(date && { date: new Date(date) }),
      ...(tag && {
        tag: { contains: tag, mode: Prisma.QueryMode.insensitive },
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
      ...(employee && {
        employee: {
          OR: [
            {
              firstName: {
                contains: employee,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              lastName: {
                contains: employee,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            { phoneNormalized: { contains: normalizePhone(employee) } },
          ],
        },
      }),
      ...(service && {
        service: {
          name: { contains: service, mode: Prisma.QueryMode.insensitive },
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
          startTime: true,
          endTime: true,
          date: true,
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
          employee: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
              position: true,
              avatar: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              avatar: true,
              duration: true,
              price: { select: { price: true, costPrice: true } },
            },
          },
          order: {
            select: {
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
      start_time: booking.startTime,
      end_time: booking.endTime,
      date: booking.date,
      comment: booking.comment,
      subtotal: booking.order?.subtotal,
      payment_method: booking.order?.paymentMethod,
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
      employee: {
        id: booking.employee.id,
        full_name: getFullName(
          booking.employee.firstName,
          booking.employee.lastName,
        ),
        first_name: booking.employee.firstName,
        last_name: booking.employee.lastName,
        avatar: buildFileUrl(booking.employee.avatar),
        phone: booking.employee.phone,
        position: booking.employee.position,
      },
      service: {
        id: booking.service.id,
        name: booking.service.name,
        duration: booking.service.duration,
        avatar: buildFileUrl(booking.service.avatar),
        prices: {
          price: booking.service.price?.price,
          cost_price: booking.service.price?.costPrice,
        },
      },
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

  async update(dto: BookingUpdateDto, bookingId: string, company_id: string) {
    await this.getById(bookingId);
    await this.validateLocation(dto.location_id, dto.service_id);
    const locationId = await this.validateEmployeeLocation(
      dto.employee_id,
      dto.location_id,
    );
    await this.validateEmployeeService(dto.employee_id, dto.service_id);
    const customerId = await this.validateCustomer(dto.customer_id, bookingId);
    await this.validateService(dto.service_id, company_id);
    await this.validateCustomerWorked(
      new Date(dto.date),
      locationId,
      dto.start_time,
      dto.end_time,
    );
    await this.validateOverlapping(
      dto.employee_id,
      new Date(dto.date),
      dto.end_time,
      dto.start_time,
      bookingId,
    );

    const booking = await this.prismaService.booking.update({
      where: { id: bookingId },
      data: {
        date: dto.date,
        startTime: dto.start_time,
        endTime: dto.end_time,
        comment: dto.comment,
        employeeId: dto.employee_id,
        customerId: customerId,
        serviceId: dto.service_id,
        locationId: dto.location_id,
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        date: true,
        comment: true,
        location: { select: { id: true, name: true } },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            birthday: true,
          },
        },
        employee: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        service: {
          select: {
            id: true,
            name: true,
            avatar: true,
            duration: true,
            price: { select: { price: true, costPrice: true } },
          },
        },
      },
    });

    const res: IBookingDetails = {
      id: booking.id,
      status: booking.status,
      start_time: booking.startTime,
      end_time: booking.endTime,
      date: booking.date,
      comment: booking.comment,
      location: {
        id: booking.location.id,
        name: booking.location.name,
      },
      customer: {
        id: booking.customer.id,
        first_name: booking.customer.firstName,
        last_name: booking.customer.lastName,
        phone: booking.customer.phone,
        email: booking.customer.email,
        birthday: booking.customer.birthday,
      },
      employee: {
        id: booking.employee.id,
        first_name: booking.employee.firstName,
        last_name: booking.employee.lastName,
        phone: booking.employee.phone,
      },
      service: {
        id: booking.service.id,
        name: booking.service.name,
        duration: booking.service.duration,
        avatar: buildFileUrl(booking.service.avatar),
        prices: {
          price: booking.service.price?.price,
          cost_price: booking.service.price?.costPrice,
        },
      },
    };

    return res;
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

  async details(bookingId: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        tag: true,
        status: true,
        startTime: true,
        endTime: true,
        date: true,
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
            account: {
              select: {
                id: true,
              },
            },
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatar: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            avatar: true,
            price: { select: { price: true, costPrice: true } },
            publicName: true,
            mark: true,
            category: true,
            type: true,
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

    const res = {
      id: booking.id,
      status: booking.status,
      tag: booking.tag,
      start_time: booking.startTime,
      end_time: booking.endTime,
      date: booking.date,
      comment: booking.comment,
      location: {
        id: booking.location.id,
        name: booking.location.name,
        avatar: buildFileUrl(booking.location.avatar),
      },
      customer: {
        id: booking.customer.id,
        profile_id: booking.customer.account?.id,
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
      employee: {
        id: booking.employee.id,
        first_name: booking.employee.firstName,
        last_name: booking.employee.lastName,
        full_name: getFullName(
          booking.employee.firstName,
          booking.employee.lastName,
        ),
        phone: booking.employee.phone,
        email: booking.employee.email,
        avatar: buildFileUrl(booking.employee.avatar),
      },
      service: {
        id: booking.service.id,
        name: booking.service.name,
        duration: booking.service.duration,
        public_name: booking.service.publicName,
        type: booking.service.type,
        category: booking.service.category,
        avatar: buildFileUrl(booking.service.avatar),
        mark: booking.service.mark,
        prices: {
          price: booking.service.price?.price,
          cost_price: booking.service.price?.costPrice,
        },
      },
      order: {
        id: booking.order?.id,
        status: booking.order?.status,
        tag: booking.order?.tag,
        subtotal: booking.order?.subtotal,
        total: booking.order?.total,
        discount: booking.order?.discount,
        payment_method: booking.order?.paymentMethod,
        paid_at: booking.order?.paidAt,
      },
    };

    return res;
  }

  async getCustomerBookings(companyId: string, customerId: string) {
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

    const bookings = await this.prismaService.booking.findMany({
      where: {
        companyId,
        customerId: customer.customerId,
      },
      select: {
        id: true,
        tag: true,
        status: true,
        startTime: true,
        endTime: true,
        date: true,
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
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatar: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            avatar: true,
            price: { select: { price: true, costPrice: true } },
            publicName: true,
            mark: true,
            category: true,
            type: true,
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
      start_time: booking.startTime,
      end_time: booking.endTime,
      date: booking.date,
      comment: booking.comment,
      location: {
        id: booking.location.id,
        name: booking.location.name,
        avatar: buildFileUrl(booking.location.avatar),
        address: booking.location.address,
      },
      employee: {
        id: booking.employee.id,
        first_name: booking.employee.firstName,
        last_name: booking.employee.lastName,
        full_name: getFullName(
          booking.employee.firstName,
          booking.employee.lastName,
        ),
        phone: booking.employee.phone,
        email: booking.employee.email,
        avatar: buildFileUrl(booking.employee.avatar),
      },
      service: {
        id: booking.service.id,
        name: booking.service.name,
        duration: booking.service.duration,
        public_name: booking.service.publicName,
        type: booking.service.type,
        category: booking.service.category,
        avatar: buildFileUrl(booking.service.avatar),
        mark: booking.service.mark,
        prices: {
          price: booking.service.price?.price,
          cost_price: booking.service.price?.costPrice,
        },
      },
      order: {
        id: booking.order?.id,
        status: booking.order?.status,
        tag: booking.order?.tag,
        subtotal: booking.order?.subtotal,
        total: booking.order?.total,
        discount: booking.order?.discount,
        payment_method: booking.order?.paymentMethod,
        paid_at: booking.order?.paidAt,
      },
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
        startTime: true,
        endTime: true,
        date: true,
        employee: {
          select: {
            id: true,
            phone: true,
            avatar: true,
            firstName: true,
            lastName: true,
            position: true,
          },
        },
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
        service: {
          select: {
            id: true,
            name: true,
            publicName: true,
            avatar: true,
            mark: true,
            duration: true,
            category: true,
          },
        },
        order: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const res = bookings.map((booking) => ({
      id: booking.id,
      company_name: booking.company.publicName,
      status: booking.status,
      tag: booking.tag,
      start_time: booking.startTime,
      end_time: booking.endTime,
      date: booking.date,
      employee: {
        id: booking.employee.id,
        first_name: booking.employee.firstName,
        last_name: booking.employee.lastName,
        phone: booking.employee.phone,
        avatar: buildFileUrl(booking.employee.avatar),
        position: booking.employee.position,
      },
      location: {
        id: booking.location.id,
        name: booking.location.name,
        avatar: buildFileUrl(booking.location.avatar),
        address: booking.location.address,
      },
      service: {
        id: booking.service.id,
        name: booking.service.name,
        public_name: booking.service.publicName,
        avatar: buildFileUrl(booking.service.avatar),
        mark: booking.service.mark,
        duration: booking.service.duration,
        category: booking.service.category || null,
      },
    }));

    return res;
  }

  /*
    ===== СОЗДАНИЕ БРОНИРОВАНИЯ И ОФОРМЛЕНИЕ ЗАКАЗА СО СТОРОНЫ КЛИЕНТА =====
  */
  async createCustomerBooking(
    dto: BookingCreateCustomerDto,
    customerId: string,
  ) {
    const company = await this.prismaService.company.findUnique({
      where: { publicName: dto.company },
      select: { id: true },
    });

    if (!company)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Компания не найдена.",
          meta: { public_name: dto.company },
        },
        HttpStatus.NOT_FOUND,
      );

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

    const createDto = {
      start_time: dto.start_time,
      end_time: dto.end_time,
      date: dto.date,
      comment: dto.comment,
      location_id: dto.location_id,
      service_id: dto.service_id,
      employee_id: dto.employee_id,
      customer_id: customer?.customerId,
      status: dto.status,
      payment_method: dto.payment_method,
    } satisfies BookingCreateDto;

    return this.prismaService.$transaction(async (t) => {
      const booking = await this.create(createDto, company.id);

      const subtotal = booking.service.prices.price ?? 0;

      const order = await t.order.create({
        data: {
          status: "open",
          subtotal,
          tag: generateOrderTag(),
          companyId: company.id,
          total: subtotal,
          paymentMethod: dto.payment_method,
          bookings: { connect: { id: booking.id } },
        },
        select: {
          id: true,
          tag: true,
          paymentMethod: true,
          status: true,
          total: true,
          subtotal: true,
          comment: true,
        },
      });

      await t.booking.update({
        where: { id: booking.id },
        data: { orderId: order.id, status: "new" },
      });

      await this.mailService.sendNewBookingNotify(
        booking.employee.email,
        booking,
      );

      return {
        id: booking.id,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        tag: booking.tag,
        order: {
          id: order.id,
          tag: order.tag,
          status: order.status,
          payment_method: order.paymentMethod,
          total: order.total,
          subtotal: order.subtotal,
        },
      };
    });

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
