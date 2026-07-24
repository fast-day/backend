import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { buildFileUrl } from "src/shared/utils/build-url";
import { getFullName } from "src/shared/utils/get-full-name.util";

@Injectable()
export class DirectoriesService {
  constructor(private readonly PrismaService: PrismaService) {}

  /**
    !!!!! ОПТИМИЗИРОВАТЬ !!!!!
  **/
  async employees(companyId: string) {
    const employees = await this.PrismaService.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        position: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return employees.map((emp) => ({
      id: emp.id,
      email: emp.email,
      first_name: emp.firstName,
      last_name: emp.lastName,
      full_name: getFullName(emp.firstName, emp.lastName),
      avatar: buildFileUrl(emp.avatar),
      position: emp.position,
      role: emp.role,
    }));
  }

  /**
    !!!!! ОПТИМИЗИРОВАТЬ !!!!!
  **/
  async locationEmployees(locationId: string, month?: string, year?: string) {
    if (!month || !year) {
      const now = new Date();
      month = String(now.getMonth() + 1).padStart(2, "0");
      year = String(now.getFullYear());
    }

    const employees = await this.PrismaService.userLocation.findMany({
      where: { locationId, isBanned: false },
      select: {
        id: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            position: true,
            services: {
              select: {
                serviceId: true,
              },
            },
          },
        },
        schedules: {
          take: 31,
          where: {
            date: {
              gte: new Date(Number(year), Number(month) - 1, 1),
              lt: new Date(Number(year), Number(month), 1),
            },
          },
          select: {
            date: true,
          },
        },
      },
    });

    return employees.map((emp) => ({
      id: emp.id,
      profile_id: emp.user.id,
      email: emp.user.email,
      first_name: emp.user.firstName,
      last_name: emp.user.lastName,
      full_name: getFullName(emp.user.firstName, emp.user.lastName),
      avatar: buildFileUrl(emp.user.avatar),
      position: emp.user.position,
      role: emp.role,
      services: emp.user.services.map((service) => ({ id: service.serviceId })),
      schedule: emp.schedules,
    }));
  }

  /**
    !!!!! ОПТИМИЗИРОВАТЬ !!!!!
  **/
  async customersCompany(companyId: string) {
    const customers = await this.PrismaService.customerCompany.findMany({
      where: { companyId, isBanned: false },
      select: {
        id: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthday: true,
            phone: true,
            email: true,
            avatar: true,
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
    });

    return customers.map((customer) => ({
      id: customer.id,
      customer_attributes: {
        profile_id: customer.customer.id,
        first_name: customer.customer.firstName,
        last_name: customer.customer.lastName,
        full_name: getFullName(
          customer.customer.firstName,
          customer.customer.lastName,
        ),
        birthday: customer.customer.birthday,
        phone: customer.customer.phone,
        email: customer.customer.email,
        avatar: buildFileUrl(customer.customer.avatar),
      },
      visit_total: customer.customer.bookings.map((book) => book.order).length,
      bookings_count: customer.customer._count.bookings,
      bookings_total: customer.customer.bookings.reduce(
        (sum, booking) => sum + Number(booking.order?.total),
        0,
      ),
    }));
  }

  async locations(companyId: string) {
    const locations = await this.PrismaService.location.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        avatar: true,
        active: true,
        address: true,
      },
    });

    return locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      avatar: buildFileUrl(loc.avatar),
      active: loc.active,
      address: [
        loc.address?.country,
        loc.address?.region,
        loc.address?.city,
        loc.address?.street,
        loc.address?.house,
      ]
        .filter(Boolean)
        .join(", "),
    }));
  }

  async bookingLocations(publicName: string) {
    const company = await this.PrismaService.company.findFirst({
      where: { publicName },
      select: { id: true },
    });

    if (!company)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Компания не найдена.",
        },
        HttpStatus.NOT_FOUND,
      );

    const locations = await this.PrismaService.location.findMany({
      where: { companyId: company.id, active: true },
      select: {
        id: true,
        name: true,
        avatar: true,
        active: true,
        address: true,
      },
    });

    return locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      avatar: buildFileUrl(loc.avatar),
      active: loc.active,
      address: [
        loc.address?.country,
        loc.address?.region,
        loc.address?.city,
        loc.address?.street,
        loc.address?.house,
      ]
        .filter(Boolean)
        .join(", "),
    }));
  }

  /**
    !!!!! ОПТИМИЗИРОВАТЬ !!!!!
  **/
  async services(companyId: string) {
    const services = await this.PrismaService.service.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        type: true,
        mark: true,
        avatar: true,
        publicName: true,
      },
    });

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      mark: service.mark,
      avatar: buildFileUrl(service.avatar),
      public_name: service.publicName,
    }));
  }

  /**
    !!!!! ОПТИМИЗИРОВАТЬ !!!!!
  **/
  async locationServices(locationId: string) {
    const services = await this.PrismaService.locationService.findMany({
      where: { locationId },
      select: {
        service: {
          select: {
            id: true,
            name: true,
            type: true,
            mark: true,
            avatar: true,
            publicName: true,
            duration: true,
            category: true,
            price: {
              select: {
                price: true,
                costPrice: true,
              },
            },
            users: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    return services.map((service) => ({
      id: service.service.id,
      name: service.service.name,
      mark: service.service.mark,
      avatar: buildFileUrl(service.service.avatar),
      public_name: service.service.publicName,
      duration: service.service.duration,
      category: service.service.category,
      prices: {
        price: service.service.price?.price,
        cost_price: service.service.price?.costPrice,
      },
      users: service.service.users.map((user) => ({
        id: user.userId,
      })),
    }));
  }

  async employeeSchedule(
    userId: string,
    locationId: string,
    date: string,
    duration: number,
  ) {
    const targetDate = new Date(`${date}T00:00:00.000Z`);

    const user = await this.PrismaService.userLocation.findFirst({
      where: {
        userId,
        locationId,
        schedules: { some: { date: targetDate } },
      },
      select: {
        id: true,
        schedules: {
          where: { date: targetDate },
          select: {
            id: true,
            date: true,
            intervals: {
              select: {
                start: true,
                end: true,
              },
            },
          },
        },
      },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Расписание не найдено",
          meta: {
            user_id: userId,
            location_id: locationId,
            date: new Date(date),
          },
        },
        HttpStatus.NOT_FOUND,
      );

    const dayStart = targetDate;
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const bookings = await this.PrismaService.bookingService.findMany({
      where: {
        employeeId: userId,
        startTime: { gte: dayStart, lt: dayEnd },
        booking: { status: { not: "cancelled" } },
      },
      select: { startTime: true, endTime: true },
    });

    function timeToMinutes(time: Date): number {
      return time.getUTCHours() * 60 + time.getUTCMinutes();
    }

    function dateTimeToMinutes(date_time: Date): number {
      return date_time.getUTCHours() * 60 + date_time.getUTCMinutes();
    }

    function minutesToTime(minutes: number): string {
      const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, "0");
      const mins = (minutes % 60).toString().padStart(2, "0");
      return `${hours}:${mins}`;
    }

    function hasOverlap(start: number, end: number): boolean {
      return bookings.some((service) => {
        const book_start = dateTimeToMinutes(service.startTime);
        const book_end = dateTimeToMinutes(service.endTime);
        return start < book_end && end > book_start;
      });
    }

    const slots: string[] = [];

    for (const schedule of user.schedules) {
      for (const interval of schedule.intervals) {
        const interval_start = timeToMinutes(interval.start);
        const interval_end = timeToMinutes(interval.end);

        for (
          let c = interval_start;
          c + duration <= interval_end;
          c += duration
        ) {
          const start = c;
          const end = c + duration;

          if (!hasOverlap(start, end)) {
            slots.push(minutesToTime(start));
          }
        }
      }
    }

    return slots;
  }

  /*
    ===== ПОЛУЧЕНИЕ СПЕЦИАЛИЗАЦИЙ =====
  */
  async getSpecialization() {
    const specializations = await this.PrismaService.specialization.findMany({
      select: {
        id: true,
        name: true,
        tag: true,
        description: true,
        icon: true,
      },
    });

    return specializations;
  }

  /*
    ===== ПОЛУЧЕНИЯ СПИСКА ГОРОДОВ (ТЕСТ) =====
  */
  getCities() {
    return [
      "Москва",
      "Таганрог",
      "Ростов-на-Дону",
      "Санкт-Петербург",
      "Краснодар",
    ];
  }
}
