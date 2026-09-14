import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { GetTransactionsDto } from "./dto/get-transactions.dto";
import { Prisma } from "@prisma/client";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { getNextSequence } from "src/shared/utils/get-next-sequence.util";
import {
  formatBookingTime,
  formatDateInTimezone,
} from "src/bookings/utils/format-time.util";
import { DEFAULT_TIMEZONE } from "src/shared/constant/timezone.constant";
import { fromZonedTime } from "date-fns-tz";

@Injectable()
export class TransactionsService {
  public constructor(private readonly prismaService: PrismaService) {}

  async create(companyId: string, dto: CreateTransactionDto) {
    const transaction = await this.prismaService.$transaction(async (t) => {
      const sequence = await getNextSequence(t, companyId, "transaction");

      return await t.transaction.create({
        data: {
          companyId,
          tag: sequence.toString(),
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
          categoryId: dto.category_id,
        },
        select: {
          id: true,
          tag: true,
          amount: true,
          description: true,
          category: {
            select: {
              name: true,
              mark: true,
            },
          },
          createdAt: true,
        },
      });
    });

    return {
      id: transaction.id,
      tag: transaction.tag,
      amount: transaction.amount,
      description: transaction.description,
      category: {
        name: transaction.category?.name,
        mark: transaction.category?.mark,
      },
      date: transaction.createdAt,
    };
  }

  async getAll(companyId: string, query: GetTransactionsDto) {
    const { start_date, end_date, type, category_id, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
      select: {
        locations: { select: { address: { select: { timezone: true } } } },
      },
    });

    const timezone =
      company?.locations[0]?.address?.timezone ?? DEFAULT_TIMEZONE;

    const rangeStart = fromZonedTime(`${start_date}T00:00`, timezone);
    const rangeEnd = fromZonedTime(`${end_date}T23:59:59.999`, timezone);

    const where: Prisma.TransactionWhereInput = {
      ...(type && { type }),
      ...(category_id && { categoryId: Number(category_id) }),
      companyId,
      createdAt: { gte: rangeStart, lte: rangeEnd },
    };

    const [transactions, sum, total] = await Promise.all([
      this.prismaService.transaction.findMany({
        where,
        select: {
          id: true,
          tag: true,
          amount: true,
          description: true,
          type: true,
          category: {
            select: {
              name: true,
              mark: true,
            },
          },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),

      this.prismaService.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),

      this.prismaService.transaction.count({ where }),
    ]);

    const data = {
      total_amount: sum._sum.amount,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        tag: transaction.tag,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: {
          name: transaction.category?.name,
          mark: transaction.category?.mark,
        },
        date: formatDateInTimezone(transaction.createdAt, timezone),
        time: formatBookingTime(transaction.createdAt, timezone),
      })),
    };

    return buildPaginatedResponse([data], total, page, limit);
  }

  async delete(companyId: string, id: string) {
    const isExist = await this.prismaService.transaction.findFirst({
      where: { companyId, id },
    });

    if (!isExist)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Транзакция не найдена",
          detail: `Транзакцию, которую вы ищете, не найдена или была удалена`,
          meta: { transaction_id: id },
        },
        HttpStatus.NOT_FOUND,
      );

    const transaction = await this.prismaService.transaction.delete({
      where: { companyId, id },
      select: {
        id: true,
        tag: true,
        amount: true,
        description: true,
        type: true,
        category: {
          select: {
            name: true,
            mark: true,
          },
        },
      },
    });

    return {
      id: transaction.id,
      tag: transaction.tag,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: {
        name: transaction.category?.name,
        mark: transaction.category?.mark,
      },
    };
  }
}
