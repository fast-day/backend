import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SendCodeDto } from "./dto/send-code.dto";
import { RedisService } from "src/redis/redis.service";
import { VerifyCodeDto } from "./dto/verify.dto";
import { CustomerCompanyDto } from "./dto/customer-company.dto";
import { CustomerJwtPayload } from "./types/jwt.payload";
import { CustomerTokenService } from "./token/token.service";
import { JwtService } from "@nestjs/jwt";
import { buildFileUrl } from "src/shared/utils/build-url";
// import { SmsService } from "src/sms/sms.service";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";
import { Prisma } from "@prisma/client";
import { normalizePhone } from "src/shared/utils/phone";
import { CustomerSortOrder, GetCustomersDto } from "./dto/get-customers.dto";
import { getFullName } from "src/shared/utils/get-full-name.util";
import {
  formatBookingTime,
  formatDateInTimezone,
} from "src/bookings/utils/format-time.util";
import { getBookingTimeRange } from "src/bookings/utils/time-range.util";
import {
  BookingSortOrder,
  GetBookingsDto,
} from "src/bookings/dto/get-bookings.dto";
import { getDayRange } from "src/bookings/utils/day-range.util";
import { DEFAULT_TIMEZONE } from "src/shared/constant/timezone.constant";
import { CustomerChecksService } from "./customer-checks.service";

@Injectable()
export class CustomersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenService: CustomerTokenService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly customerChecksService: CustomerChecksService,
    // private readonly smsService: SmsService,
  ) {}
  async firstByAccount(phone: string) {
    const customer = await this.prismaService.customerAccount.findUnique({
      where: { phone },
      select: { id: true, phone: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Аккаунт не найден",
        },
        HttpStatus.NOT_FOUND,
      );

    return customer;
  }

  async sendCode(dto: SendCodeDto) {
    const { phone } = dto;

    const ttl = await this.redisService.ttl(`auth:code:${phone}`);
    if (ttl > 240) {
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          title: "Подождите",
          message: `Повторная отправка через ${ttl - 240} сек.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const account = await this.prismaService.customerAccount.findUnique({
      where: { phone },
    });

    if (!account) {
      const customer = await this.prismaService.customer.create({
        data: {
          phone,
          phoneNormalized: normalizePhone(phone),
          firstName: "Боб", // TEST
        },
      });

      await this.prismaService.customerAccount.create({
        data: { phone, customerId: customer.id },
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000);

    await this.redisService.setEx(`auth:code:${phone}`, 300, code.toString());

    // await this.smsService.sendSms(phone, `Ваш код ${code}`);

    return { success: true, code };
  }

  async verifyCode(dto: VerifyCodeDto, ipAddress: string) {
    const { phone, code } = dto;

    const storeCode = await this.redisService.get(`auth:code:${phone}`);

    const { id: customerId, phone: customerPhone } =
      await this.firstByAccount(phone);

    const isDevBypass = code === 111111;
    const isValidCode = Number(storeCode) === code;

    if (!isDevBypass && !isValidCode)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Неверный код",
          message: "Попробуйте еще раз",
        },
        HttpStatus.NOT_FOUND,
      );

    // if (!storeCode)
    //   throw new HttpException(
    //     {
    //       status: HttpStatus.NOT_FOUND,
    //       title: "Код не найден",
    //       message: "Попробуйте еще раз",
    //     },
    //     HttpStatus.NOT_FOUND,
    //   );

    // if (Number(storeCode) !== code)
    //   throw new HttpException(
    //     {
    //       status: HttpStatus.NOT_FOUND,
    //       title: "Неверный код",
    //       message: "Попробуйте еще раз",
    //     },
    //     HttpStatus.NOT_FOUND,
    //   );

    await this.prismaService.customerAccount.update({
      where: { id: customerId },
      data: { verified: true, lastLoginAt: new Date() },
    });
    await this.redisService.del(`auth:code:${phone}`);

    const payload = {
      sub: customerId,
      phone: customerPhone,
    } satisfies CustomerJwtPayload;

    const accessToken = this.jwtService.sign(payload, { expiresIn: "30d" });
    const refreshToken = await this.tokenService.createRefreshToken({
      customerId,
      ipAddress,
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  /**
    ===== СОЗДАНИЕ КЛИЕНТА ДЛЯ КОМПАНИИ =====
  **/
  async createForCompany(dto: CustomerCompanyDto, companyId: string) {
    const customerId = await this.customerChecksService.checkExistCustomer(
      dto.phone,
      dto.first_name,
      dto.last_name,
      dto.email,
    );

    const findCustomer = await this.prismaService.customerCompany.findUnique({
      where: { customerId_companyId: { companyId, customerId } },
    });

    if (findCustomer) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          title: "Ошибка клиента",
          detail: "Указанный клиент уже существует в системе",
          meta: { customer_id: customerId },
        },
        HttpStatus.CONFLICT,
      );
    }

    const create = await this.prismaService.customerCompany.create({
      data: {
        companyId,
        customerId,
        note: dto.note,
        isBanned: dto.is_banned,
      },
      select: {
        id: true,
        isBanned: true,
        note: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            birthday: true,
            avatar: true,
          },
        },
      },
    });

    await this.prismaService.company.update({
      where: { id: companyId },
      data: { hasCustomers: true },
    });

    return {
      id: create.id,
      note: create.note,
      is_banned: create.isBanned,
      full_name: getFullName(
        create.customer.firstName,
        create.customer.lastName,
      ),
      first_name: create.customer.firstName,
      last_name: create.customer.lastName,
      phone: create.customer.phone,
      avatar: buildFileUrl(create.customer.avatar),
      birthday: create.customer.birthday,
    };
  }

  /**
    ===== ПОЛУЧИТЬ СПИСОК КЛИЕНТОВ КОМПАНИИ =====
  **/
  async getCustomerForLocation(companyId: string, query: GetCustomersDto) {
    const { search, sort, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const orderBy: Prisma.CustomerCompanyOrderByWithRelationInput =
      sort === CustomerSortOrder.OLDEST
        ? { createdAt: "asc" }
        : { createdAt: "desc" };

    const where = {
      companyId,
      ...(search && {
        customer: {
          OR: [
            {
              firstName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              lastName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              phoneNormalized: {
                contains: normalizePhone(search),
                mode: Prisma.QueryMode.insensitive,
              },
            },
            { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        },
      }),
    };

    const [customers, total] = await Promise.all([
      this.prismaService.customerCompany.findMany({
        where,
        select: {
          id: true,
          isBanned: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true,
              birthday: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prismaService.customerCompany.count({ where }),
    ]);

    const data = customers.map((customer) => ({
      id: customer.id,
      is_banned: customer.isBanned,
      full_name: getFullName(
        customer.customer.firstName,
        customer.customer.lastName,
      ),
      first_name: customer.customer.firstName,
      last_name: customer.customer.lastName,
      phone: customer.customer.phone,
      avatar: buildFileUrl(customer.customer.avatar),
      birthday: customer.customer.birthday,
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  /**
    ===== ПОЛУЧИТЬ ДЕТАЛЬНУЮ ИНФОРМАЦИЮ О КЛИЕНТЕ =====
  **/
  async getCustomerDetailForLocation(
    customerId: string,
    companyId: string,
    userId: string,
  ) {
    const customer = await this.prismaService.customerCompany.findUnique({
      where: { id: customerId, companyId },
      select: {
        id: true,
        note: true,
        isBanned: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatar: true,
            birthday: true,
            _count: {
              select: {
                bookings: { where: { companyId } },
              },
            },
          },
        },
        _count: {
          select: {
            documents: {
              where: { customerCompanyId: customerId, authorId: userId },
            },
          },
        },
      },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка клиент не найден",
          detail: "Не удалось загрузить информацию о клиенте",
          meta: { customer_id: customerId },
        },
        HttpStatus.NOT_FOUND,
      );

    return {
      id: customer.id,
      note: customer.note,
      is_banned: customer.isBanned,
      booking_count: customer.customer._count.bookings,
      documents_count: customer._count.documents,
      profile: {
        id: customer.customer.id,
        full_name: getFullName(
          customer.customer.firstName,
          customer.customer.lastName,
        ),
        first_name: customer.customer.firstName,
        last_name: customer.customer.lastName,
        phone: customer.customer.phone,
        email: customer.customer.email,
        birthday: customer.customer.birthday,
        avatar: buildFileUrl(customer.customer.avatar),
      },
    };
  }

  async getCustomerBookingsForLocation(
    customerId: string,
    companyId: string,
    query: Omit<GetBookingsDto, "customer">,
  ) {
    const { status, date, tag, sort, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const customer = await this.prismaService.customerCompany.findUnique({
      where: { id: customerId },
      select: { customerId: true },
    });

    if (!customer)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка клиент не найден",
          detail: "Не удалось получить информацию о клиенте",
          meta: { customer_id: customerId },
        },
        HttpStatus.NOT_FOUND,
      );

    const orderBy: Prisma.BookingOrderByWithRelationInput =
      sort === BookingSortOrder.OLDEST
        ? { createdAt: "asc" }
        : sort === BookingSortOrder.PRICE_ASC
          ? { order: { subtotal: "asc" } }
          : sort === BookingSortOrder.PRICE_DESC
            ? { order: { subtotal: "desc" } }
            : { createdAt: "desc" };

    const serviceFilter: Prisma.BookingServiceWhereInput = {
      ...(date && { startTime: getDayRange(date) }),
    };

    const where: Prisma.BookingWhereInput = {
      customerId: customer.customerId,
      location: { companyId },
      ...(status && { status }),
      ...(tag && {
        tag: { contains: tag, mode: Prisma.QueryMode.insensitive },
      }),
      ...(Object.keys(serviceFilter).length > 0 && {
        services: { some: serviceFilter },
      }),
    };

    const [bookings, total] = await Promise.all([
      this.prismaService.booking.findMany({
        where,
        select: {
          id: true,
          tag: true,
          status: true,
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

    if (!bookings)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка бронирования не найдены",
          detail: "Не удалось получить информацию о бронирований клиента",
          meta: { customer_id: customerId },
        },
        HttpStatus.NOT_FOUND,
      );

    const data = bookings.map((booking) => {
      const timezone = booking.location.address?.timezone ?? DEFAULT_TIMEZONE;
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

  async getMe(id: string) {
    const account = await this.prismaService.customerAccount.findUnique({
      where: { id },
      select: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            birthday: true,
            avatar: true,
          },
        },
      },
    });

    if (!account) throw new Error("Аккаунт не найден");

    const customer = {
      id: account.customer.id,
      avatar: buildFileUrl(account.customer.avatar),
      first_name: account.customer.firstName,
      last_name: account.customer.lastName,
      email: account.customer.email,
      phone: account.customer.phone,
      birthday: account.customer.birthday,
    };

    return customer;
  }
}
