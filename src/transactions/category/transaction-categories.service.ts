import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import {
  TransactionCategoryDto,
  UpdateTransactionCategoryDto,
} from "./dto/category.dto";
import { Prisma } from "@prisma/client";
import { GetTransactionCategoryQueryDto } from "./dto/get-category-query.dto";

@Injectable()
export class TransactionCategoriesService {
  public constructor(private readonly prismaService: PrismaService) {}

  private async findById(companyId: string, categoryId: number) {
    const category = await this.prismaService.transactionCategory.findUnique({
      where: { companyId, id: categoryId },
      select: {
        id: true,
        name: true,
        mark: true,
        type: true,
      },
    });

    if (!category)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Категория не найдена",
          detail: `Не удалось найти категорию`,
          meta: { category_id: categoryId },
        },
        HttpStatus.NOT_FOUND,
      );

    if (category.type !== "custom")
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Системную категорию нельзя изменить или удалить",
          detail: `Системные категории доступны только для использования в транзакциях.`,
          meta: { category_id: categoryId },
        },
        HttpStatus.BAD_REQUEST,
      );
    return category;
  }

  async create(companyId: string, dto: TransactionCategoryDto) {
    const isExist = await this.prismaService.transactionCategory.findFirst({
      where: { companyId, name: dto.name },
    });

    if (isExist)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Категория уже существует",
          detail: `Не удалось создать категорию ${dto.name.toUpperCase()}, т.к данная категория уже существует`,
          meta: { name: dto.name },
        },
        HttpStatus.BAD_REQUEST,
      );

    const category = await this.prismaService.transactionCategory.create({
      data: { companyId, name: dto.name, mark: dto.mark },
      select: {
        id: true,
        name: true,
        mark: true,
        type: true,
      },
    });

    return category;
  }

  async getAll(companyId: string, query: GetTransactionCategoryQueryDto) {
    const where: Prisma.TransactionCategoryWhereInput = {
      companyId,
      ...(query.search && {
        name: { contains: query.search, mode: Prisma.QueryMode.insensitive },
      }),
      ...(query.mark && { mark: query.mark }),
    };

    const categories = await this.prismaService.transactionCategory.findMany({
      where,
      select: {
        id: true,
        name: true,
        mark: true,
        type: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return categories;
  }

  async update(
    companyId: string,
    categoryId: number,
    dto: UpdateTransactionCategoryDto,
  ) {
    await this.findById(companyId, categoryId);

    const isExist = await this.prismaService.transactionCategory.findFirst({
      where: { companyId, name: dto.name },
    });

    if (isExist)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Не удалось обновить категорию",
          detail: `Название категории уже занято`,
          meta: { name: dto.name },
        },
        HttpStatus.BAD_REQUEST,
      );

    return await this.prismaService.transactionCategory.update({
      where: { companyId, id: categoryId },
      data: { ...dto },
      select: {
        id: true,
        name: true,
        mark: true,
        type: true,
      },
    });
  }

  async delete(companyId: string, id: number) {
    await this.findById(companyId, id);

    return await this.prismaService.transactionCategory.delete({
      where: { companyId, id },
      select: {
        id: true,
        name: true,
        mark: true,
        type: true,
      },
    });
  }
}
