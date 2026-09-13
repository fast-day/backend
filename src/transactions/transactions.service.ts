import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { GetTransactionsDto } from "./dto/get-transactions.dto";
import { Prisma } from "@prisma/client";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { getNextSequence } from "src/shared/utils/get-next-sequence.util";

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
      category: transaction.category?.name,
      date: transaction.createdAt,
    };
  }

  /*
    !===== ПОПРАВИТЬ БАГ С СОРТИРОВКОЙ ПО ДАТАМ =====!
  */
  async getAll(companyId: string, query: GetTransactionsDto) {
    const { start_date, end_date, type, category_id, ...pagination } = query;
    const { page, limit, skip } = getPaginationParams(pagination);

    const where: Prisma.TransactionWhereInput = {
      ...(type && { type }),
      ...(category_id && { categoryId: Number(category_id) }),
      companyId,
      createdAt: { gte: new Date(start_date), lte: new Date(end_date) },
    };

    const [transactions, sum, total] = await Promise.all([
      this.prismaService.transaction.findMany({
        where,
        select: {
          id: true,
          tag: true,
          amount: true,
          description: true,
          category: {
            select: {
              name: true,
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
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category?.name,
        date: transaction.createdAt,
      })),
    };

    return buildPaginatedResponse([data], total, page, limit);
  }

  delete(id: string) {
    return `This action removes a #${id} transaction`;
  }
}
