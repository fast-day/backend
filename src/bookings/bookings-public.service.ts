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
      logo: company.logo,
      name: company.name,
      public_name: company.publicName,
      currency: company.currency,
    };
  }

  private async employee(userId: string, locationId: string) {
    const employee = await this.prismaService.userLocation.findUnique({
      where: { userId_locationId: { userId, locationId } },
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
          detail: { employee_id: userId },
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

  private async location(companyId: string, locationId: string) {
    const location = await this.prismaService.location.findFirst({
      where: { companyId, id: locationId },
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
          detail: { location_id: locationId },
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
    const employee = await this.employee(user_id, location_id);

    return {
      employee,
      company: {
        ...company,
        timezone: location.timezone,
      },
    };
  }

  async services(userId: string) {
    const services = await this.prismaService.service.findMany({
      where: { users: { some: { userId } } },
      select: {
        id: true,
        name: true,
        mark: true,
        duration: true,
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
      ...service,
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

  async service(serviceId: string) {
    const service = await this.prismaService.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        name: true,
        duration: true,
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
          detail: { service_id: serviceId },
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    return {
      ...service,
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
