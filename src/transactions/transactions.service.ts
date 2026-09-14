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

  private async findById(companyId: string, id: string) {
    const transaction = await this.prismaService.transaction.findFirst({
      where: { companyId, id },
    });

    if (!transaction)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Транзакция не найдена",
          detail: `Транзакцию, которую вы ищете, не найдена или была удалена`,
          meta: { transaction_id: id },
        },
        HttpStatus.NOT_FOUND,
      );

    return transaction;
  }

  private async getTimezone(companyId: string) {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
      select: {
        locations: { select: { address: { select: { timezone: true } } } },
      },
    });

    return company?.locations[0]?.address?.timezone ?? DEFAULT_TIMEZONE;
  }

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

    const timezone = await this.getTimezone(companyId);

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

  async detail(companyId: string, id: string) {
    const transaction = await this.prismaService.transaction.findFirst({
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
        invoice: {
          select: {
            id: true,
            tag: true,
            type: true,
            status: true,
            amount: true,
            createdAt: true,
          },
        },
        order: {
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
        },
        createdAt: true,
      },
    });

    if (!transaction)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Транзакция не найдена",
          detail: `Транзакцию, которую вы ищете, не найдена или была удалена`,
          meta: { transaction_id: id },
        },
        HttpStatus.NOT_FOUND,
      );

    const timezone = await this.getTimezone(companyId);

    return {
      id: transaction.id,
      tag: transaction.tag,
      amount: transaction.amount,
      description: transaction.description,
      type: transaction.type,
      category: {
        name: transaction.category?.name,
        mark: transaction.category?.mark,
      },
      invoice: transaction.invoice
        ? {
            id: transaction.invoice.id,
            tag: transaction.invoice.tag,
            type: transaction.invoice.type,
            status: transaction.invoice.status,
            amount: transaction.invoice.amount,
            date: formatDateInTimezone(transaction.invoice.createdAt, timezone),
          }
        : null,
      order: transaction.order
        ? {
            id: transaction.order.id,
            status: transaction.order.status,
            tag: transaction.order.tag,
            subtotal: transaction.order.subtotal,
            total: transaction.order.total,
            date: formatDateInTimezone(transaction.order.createdAt, timezone),
            time: formatBookingTime(transaction.order.createdAt, timezone),
            payment_method: transaction.order.paymentMethod,
            is_payment: !!transaction.order.paidAt,
            discount: transaction.order.discount,
          }
        : null,
    };
  }

  async delete(companyId: string, id: string) {
    await this.findById(companyId, id);

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
