import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { GetChartDto } from "./dto/get-chart.dto";

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  /*
    ===== УТИЛИТЫ =====
  */
  private percentChange(prev: number, curr: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
  }

  private isDateInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  async getSummary(companyId: string, locationId?: string) {
    const now = new Date();

    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const [revenue, clients] = await Promise.all([
      this.getRevenue(
        companyId,
        locationId,
        thisMonthStart,
        thisMonthEnd,
        lastMonthStart,
        lastMonthEnd,
      ),
      this.getNewClients(
        companyId,
        locationId,
        thisMonthStart,
        thisMonthEnd,
        lastMonthStart,
        lastMonthEnd,
      ),
    ]);

    const growthRate = this.calcGrowthRate(
      revenue.growthPercent,
      clients.growthPercent,
      revenue.amount,
      clients.count,
    );

    return {
      revenue,
      clients,
      growthRate,
    };
  }

  private async getRevenue(
    companyId: string,
    locationId: string | undefined,
    thisStart: Date,
    thisEnd: Date,
    lastStart: Date,
    lastEnd: Date,
  ) {
    const bookingFilter = {
      companyId,
      ...(locationId ? { locationId } : {}),
      status: "completed" as const,
    };

    const [thisMonth, lastMonth] = await Promise.all([
      this.sumOrdersByBookings(bookingFilter, thisStart, thisEnd),
      this.sumOrdersByBookings(bookingFilter, lastStart, lastEnd),
    ]);

    const growthPercent = this.percentChange(lastMonth, thisMonth);

    return {
      amount: thisMonth,
      growthPercent,
      recommendation: this.revenueRecommendation(growthPercent, thisMonth),
    };
  }

  private async sumOrdersByBookings(
    bookingFilter: object,
    dateStart: Date,
    dateEnd: Date,
  ): Promise<number> {
    const bookings = await this.prismaService.booking.findMany({
      where: {
        ...bookingFilter,
        orderId: { not: null },
      },
      select: { orderId: true },
      distinct: ["orderId"],
    });

    const filtered = bookings.filter((_b) =>
      // this.isDateInRange(b.date ?? new Date(), dateStart, dateEnd),
      this.isDateInRange(new Date(), dateStart, dateEnd),
    );
    const orderIds = filtered.map((b) => b.orderId).filter(Boolean) as string[];

    if (!orderIds.length) return 0;

    const result = await this.prismaService.order.aggregate({
      where: {
        id: { in: orderIds },
        status: "paid",
      },
      _sum: { total: true },
    });

    return result._sum.total ?? 0;
  }

  /*
    ===== НОВЫЕ КЛИЕНТЫ =====
  */
  private async getNewClients(
    companyId: string,
    locationId: string | undefined,
    thisStart: Date,
    thisEnd: Date,
    lastStart: Date,
    lastEnd: Date,
  ) {
    const [thisMonth, lastMonth] = await Promise.all([
      this.countNewClients(companyId, locationId, thisStart, thisEnd),
      this.countNewClients(companyId, locationId, lastStart, lastEnd),
    ]);

    const growthPercent = this.percentChange(lastMonth, thisMonth);

    return {
      count: thisMonth,
      growthPercent,
      recommendation: this.clientsRecommendation(growthPercent, thisMonth),
    };
  }

  private async countNewClients(
    companyId: string,
    locationId: string | undefined,
    dateStart: Date,
    dateEnd: Date,
  ): Promise<number> {
    const dateStartStr = dateStart.toISOString().split("T")[0];
    const dateEndStr = dateEnd.toISOString().split("T")[0];

    if (locationId) {
      const clientsThisPeriod = await this.prismaService.booking.findMany({
        where: {
          companyId,
          locationId,
          // date: { gte: dateStartStr, lte: dateEndStr },
        },
        select: { customerId: true },
        distinct: ["customerId"],
      });

      const customerIds = clientsThisPeriod.map((b) => b.customerId);
      if (!customerIds.length) return 0;

      const existingClients = await this.prismaService.booking.findMany({
        where: {
          companyId,
          locationId,
          customerId: { in: customerIds },
          date: { lt: dateStartStr },
        },
        select: { customerId: true },
        distinct: ["customerId"],
      });

      const existingIds = new Set(existingClients.map((b) => b.customerId));
      const newClientIds = customerIds.filter((id) => !existingIds.has(id));

      return newClientIds.length;
    }

    return this.prismaService.customerCompany.count({
      where: {
        companyId,
        createdAt: { gte: dateStart, lte: dateEnd },
      },
    });
  }

  /*
    ===== ТЕМП РОСТА =====
  */
  private calcGrowthRate(
    revenueGrowth: number,
    clientsGrowth: number,
    revenueAmount: number,
    clientCount: number,
  ) {
    const rate = (revenueGrowth + clientsGrowth) / 2;

    return {
      percent: parseFloat(rate.toFixed(1)),
      recommendation: this.growthRateRecommendation(
        rate,
        revenueAmount,
        clientCount,
      ),
    };
  }

  async getChart(companyId: string, query: GetChartDto) {
    const { locationId, from, to } = query;

    if (from && to && new Date(to) < new Date(from)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Некорректный диапазон дат",
          detail: `Дата окончания (${to}) не может быть раньше даты начала (${from})`,
          meta: { from, to },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const bookings = await this.prismaService.booking.findMany({
      where: {
        companyId,
        ...(locationId ? { locationId } : {}),
        status: "completed",
        orderId: { not: null },
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
        order: {
          status: "paid",
        },
      },
      select: {
        date: true,
        startTime: true,
        order: {
          select: {
            total: true,
            subtotal: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    /*
    
      !!!!!! ПОДРАВИТЬ ДАННЫЕ !!!!!!    
    */
    return bookings.map((b) => ({
      date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")} ${b.startTime}`,
      profit: b.order?.total ?? b.order?.subtotal,
    }));
  }

  /*
    ===== РЕКОМЕНДАЦИИ =====
  */
  private revenueRecommendation(growth: number, amount: number): string[] {
    if (amount === 0)
      return [
        "Нет данных о доходах за этот период",
        "Убедитесь что заказы корректно фиксируются",
      ];
    if (growth >= 20)
      return ["Отличный рост дохода", "Продолжайте текущую стратегию"];
    if (growth >= 5)
      return [
        "Умеренный рост",
        "Рассмотрите акции для увеличения среднего чека",
      ];
    if (growth >= 0)
      return ["Доход стагнирует", "Проанализируйте ценообразование и загрузку"];
    return ["Снижение дохода за период", "Требует срочного анализа причин"];
  }

  private clientsRecommendation(growth: number, count: number): string[] {
    if (count === 0)
      return [
        "Новых клиентов за период нет",
        "Усильте маркетинговые активности",
      ];
    if (growth >= 10)
      return ["Хороший прирост клиентов", "Уделите внимание удержанию"];
    if (growth >= 0)
      return ["Медленный прирост", "Рассмотрите реферальную программу"];
    return [
      `Снижение на ${Math.abs(growth)}% за период`,
      "Требует уделить больше внимания",
    ];
  }

  private growthRateRecommendation(
    rate: number,
    revenueAmount: number,
    clientCount: number,
  ): string[] {
    if (revenueAmount === 0 && clientCount === 0)
      return ["Недостаточно данных для анализа"];
    if (rate >= 10) return ["Бизнес активно растёт"];
    if (rate >= 0) return ["Стабильный темп", "Есть потенциал для ускорения"];
    return ["Отрицательный темп роста", "Необходим комплексный анализ"];
  }
}
