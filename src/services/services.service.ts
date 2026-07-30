import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { ServiceCreateDto } from "./dto/service.dto";
import { IServices } from "./types/service.type";
import { ServiceCategoryDto } from "./dto/service-category.dto";
import { AddedUsersDto } from "./dto/added-users.dto";
import { AddedLocationsDto } from "./dto/added-locations.dto";
import { ServiceUpdateDto } from "./dto/service-update.dto";
import { slugify } from "transliteration";
import { BufferedFile } from "src/minio/file.model";
import { MinioService } from "src/minio/minio.service";
import { buildFileUrl } from "src/shared/utils/build-url";
import { GetServicesDto } from "./dto/get-services.dto";
import { Prisma } from "@prisma/client";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";

@Injectable()
export class ServicesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async getAll(company_id: string, query: GetServicesDto) {
    const { search, type, mark, price_sort, ...pagination } = query;

    const { page, limit, skip } = getPaginationParams(pagination);

    const where = {
      companyId: company_id,
      ...(type && { type }),
      ...(mark && { mark }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          {
            publicName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            category: { contains: search, mode: Prisma.QueryMode.insensitive },
          },
        ],
      }),
    };

    const orderBy: Prisma.ServiceOrderByWithRelationInput = price_sort
      ? { price: { price: price_sort } }
      : { createdAt: "asc" };

    const [services, total] = await Promise.all([
      this.prismaService.service.findMany({
        where,
        select: {
          id: true,
          name: true,
          duration: true,
          mark: true,
          type: true,
          category: true,
          avatar: true,
          price: {
            select: {
              id: true,
              price: true,
              costPrice: true,
            },
          },
          publicName: true,
          users: {
            select: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          locations: {
            select: {
              location: { select: { id: true, name: true } },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prismaService.service.count({ where }),
    ]);

    const data: IServices[] = services.map((s) => {
      return {
        id: s.id,
        name: s.name,
        duration: s.duration,
        category: s.category,
        public_name: s.publicName,
        avatar: buildFileUrl(s.avatar),
        price: s.price!.price ?? null,
        mark: s.mark,
        type: s.type,
        prices: {
          price: s.price?.price ?? null,
          cost_price: s.price?.costPrice ?? null,
        },
        users_length: s.users.length,
        locations_length: s.locations.length,
      };
    });

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getFirst(service_id: string, company_id: string) {
    const s = await this.prismaService.service.findFirst({
      where: { id: service_id, companyId: company_id },
      select: {
        id: true,
        name: true,
        duration: true,
        // days: true,
        // timeStart: true,
        // timeEnd: true,
        category: true,
        mark: true,
        avatar: true,
        price: {
          select: {
            id: true,
            price: true,
            costPrice: true,
          },
        },
        discount: {
          select: {
            id: true,
            dateType: true,
            days: true,
            price: true,
            timeStart: true,
            timeEnd: true,
          },
        },
        publicName: true,
        users: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        locations: {
          select: {
            location: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!s)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не были найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    const response = {
      id: s.id,
      name: s.name,
      duration: s.duration,
      public_name: s.publicName,
      category: s.category,
      mark: s.mark,
      avatar: buildFileUrl(s.avatar),
      price: s.price!.price ?? null,
      prices: {
        price: s.price?.price ?? null,
        cost_price: s.price?.costPrice ?? null,
      },
      discount: s.discount
        ? {
            date_type: s.discount.dateType,
            days: s.discount.days,
            price: s.discount.price ?? null,
            time_start: s.discount.timeStart ?? null,
            time_end: s.discount.timeEnd ?? null,
          }
        : null,
      users: s.users.map((u) => ({
        id: u.user.id,
        avatar: buildFileUrl(u.user.avatar),
        name: `${u.user.firstName} ${u.user.lastName}`,
      })),
      locations: s.locations.map((l) => ({
        id: l.location.id,
        avatar: buildFileUrl(l.location.avatar),
        name: l.location.name,
      })),
    };

    return response;
  }

  async create(dto: ServiceCreateDto, companyId: string) {
    const users = await this.prismaService.user.findMany({
      where: { companyId },
    });
    const locations = await this.prismaService.location.findMany({
      where: { companyId },
    });

    if (!users.length)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка создания услуги",
          detail:
            "Отсутствуют зарегистрированные пользователи. Услуга не может быть создана.",
        },
        HttpStatus.NOT_FOUND,
      );
    if (!locations.length)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка создания услуги",
          detail:
            "Нет ни одной доступной локации. Услугу невозможно привязать к месту.",
        },
        HttpStatus.NOT_FOUND,
      );

    const serviceDto = {
      name: dto.name,
      publicName: slugify(dto.name, { lowercase: true, separator: "-" }),
      mark: dto.mark,
      duration: dto.duration,
      type: dto.type,
      category: dto.category,
      companyId,
    };

    const service = await this.prismaService.$transaction(async (t) => {
      const service = await t.service.create({
        data: {
          ...serviceDto,
          price: {
            create: {
              price: dto.price,
              costPrice: dto.cost_price,
            },
          },
          discount: {
            create: {
              dateType: dto.date_type,
              days: dto.discount_days,
              price: dto.discount_price,
              timeStart: dto.discount_time_start,
              timeEnd: dto.discount_time_end,
            },
          },
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          mark: true,
          duration: true,
          type: true,
        },
      });

      await t.userService.createMany({
        data: users.map((u) => ({ userId: u.id, serviceId: service.id })),
      });
      await t.locationService.createMany({
        data: locations.map((l) => ({
          locationId: l.id,
          serviceId: service.id,
        })),
      });

      return service;
    });

    await this.prismaService.company.update({
      where: { id: companyId },
      data: { hasServices: true },
    });

    return service;
  }

  async delete(service_id: string) {
    const service = await this.prismaService.service.findFirst({
      where: { id: service_id },
      select: { id: true },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не была найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    await this.prismaService.service.delete({
      where: { id: service.id },
      select: { id: true, name: true, mark: true, duration: true, type: true },
    });

    return { status: "deleted" };
  }

  async update(dto: ServiceUpdateDto, serviceId: string, companyId: string) {
    const service = await this.prismaService.service.findUnique({
      where: { id: serviceId },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не была найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    const serviceDto = {
      name: dto.name,
      publicName: dto.public_name,
      mark: dto.mark,
      duration: dto.duration,
      type: dto.type,
      category: dto.category,
      companyId,
    };

    const newService = await this.prismaService.service.update({
      where: { id: serviceId },
      data: {
        ...serviceDto,
        // days: dto.days,
        // timeStart: dto.time_start,
        // timeEnd: dto.time_end,
        price: dto.price
          ? {
              update: {
                price: dto.price,
                costPrice: dto.cost_price,
              },
            }
          : undefined,

        discount: dto.discount_price
          ? {
              update: {
                dateType: dto.date_type,
                days: dto.discount_days,
                price: dto.discount_price,
                timeStart: dto.discount_time_start,
                timeEnd: dto.discount_time_end,
              },
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        duration: true,
        // days: true,
        // timeStart: true,
        // timeEnd: true,
        category: true,
        avatar: true,
        mark: true,
        price: {
          select: {
            id: true,
            price: true,
            costPrice: true,
          },
        },
        discount: {
          select: {
            id: true,
            dateType: true,
            days: true,
            price: true,
            timeStart: true,
            timeEnd: true,
          },
        },
        publicName: true,
        users: {
          select: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        locations: {
          select: {
            location: { select: { id: true, name: true } },
          },
        },
      },
    });

    const response = {
      id: newService.id,
      name: newService.name,
      duration: newService.duration,
      public_name: newService.publicName,
      category: newService.category,
      avatar: buildFileUrl(newService.avatar),
      mark: newService.mark,
      price: newService.price!.price ?? null,
      prices: {
        price: newService.price?.price ?? null,
        cost_price: newService.price?.costPrice ?? null,
      },
      discount: newService.discount
        ? {
            date_type: newService.discount.dateType,
            days: newService.discount.days,
            price: newService.discount.price ?? null,
            time_start: newService.discount.timeStart ?? null,
            time_end: newService.discount.timeEnd ?? null,
          }
        : null,
      users: newService.users.map((u) => ({
        id: u.user.id,
        name: `${u.user.firstName} ${u.user.lastName}`,
      })),
      locations: newService.locations.map((l) => ({
        id: l.location.id,
        name: l.location.name,
      })),
    };

    return response;
  }

  async createCategory(dto: ServiceCategoryDto, companyId: string) {
    const isExists = await this.prismaService.serviceCategory.findFirst({
      where: { name: dto.name },
    });

    if (isExists)
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          title: "Категория уже существует",
        },
        HttpStatus.CONFLICT,
      );

    const category = await this.prismaService.serviceCategory.create({
      data: { name: dto.name, companyId },
      select: { id: true, name: true },
    });

    return category;
  }

  async getAllCategory(companyId: string) {
    const category = await this.prismaService.serviceCategory.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    });

    return category;
  }

  async updateCategory(
    dto: ServiceCategoryDto,
    categoryId: number,
    companyId: string,
  ) {
    const isExists = await this.prismaService.serviceCategory.findFirst({
      where: { id: categoryId },
    });

    if (!isExists)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Категория не найдена",
          detail: null,
        },
        HttpStatus.NOT_FOUND,
      );

    const category = await this.prismaService.serviceCategory.update({
      data: { name: dto.name },
      where: { id: categoryId, companyId },
      select: { id: true, name: true },
    });

    return category;
  }

  async deleteCategory(categoryId: number, companyId: string) {
    const isExists = await this.prismaService.serviceCategory.findUnique({
      where: { id: categoryId, companyId },
    });

    if (!isExists)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Категория не найдена",
          detail: null,
        },
        HttpStatus.NOT_FOUND,
      );

    const category = await this.prismaService.serviceCategory.delete({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    return category;
  }

  /**
    ==== СТАРЫЙ ВАРИАНТ ДОБАВЛЕНИЯ СОТРУДНИКА К УСЛУГЕ ===== 
  **/
  async addedUsers(
    dto: AddedUsersDto,
    serviceId: string,
    companyId: string,
  ): Promise<SuccessResponse> {
    const { user_ids: userIds } = dto;
    const service = await this.prismaService.service.findFirst({
      where: { id: serviceId, companyId },
      select: { id: true },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не была найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    const users = await this.prismaService.user.findMany({
      where: { id: { in: userIds }, companyId },
      select: { id: true },
    });

    const existingUserIds = users.map((u) => u.id);
    const invalidIds = userIds.filter((id) => !existingUserIds.includes(id));

    if (invalidIds.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка: некоторые пользователи не найдены",
          detail: `Пользователи с id ${invalidIds.join(", ")} не существуют.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prismaService.$transaction([
      this.prismaService.userService.deleteMany({ where: { serviceId } }),
      this.prismaService.userService.createMany({
        data: userIds.map((userId) => ({ userId, serviceId: service.id })),
      }),
    ]);

    return { success: true };
  }

  /**
    ==== НОВЫЙ ВАРИАНТ ДОБАВЛЕНИЯ СОТРУДНИКА К УСЛУГЕ ===== 
  **/
  async addUserToService(serviceId: string, userId: string, companyId: string) {
    const service = await this.prismaService.service.findFirst({
      where: { id: serviceId, companyId },
      select: { id: true },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не была найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    const user = await this.prismaService.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: пользователь не найден",
          detail: `Пользователь с id ${userId} не существует.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const exist = await this.prismaService.userService.findFirst({
      where: { serviceId, userId },
    });

    if (exist)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка: пользователь уже привязан",
          detail: "Данный пользователь уже привязан к этой услуге",
        },
        HttpStatus.BAD_REQUEST,
      );

    await this.prismaService.userService.create({
      data: { userId, serviceId: service.id },
    });

    return { success: true };
  }

  async removeUserFromService(
    serviceId: string,
    userId: string,
    companyId: string,
  ) {
    const service = await this.prismaService.service.findFirst({
      where: { id: serviceId, companyId },
      select: { id: true },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не была найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    const deleteRes = await this.prismaService.userService.deleteMany({
      where: { serviceId, userId },
    });

    if (deleteRes.count === 0) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: пользователь не найден",
          detail: "Пользователь не найден или не привязан к этой услуге",
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return { success: true };
  }

  /**
    ==== СТАРЫЙ ВАРИАНТ ДОБАВЛЕНИЯ ЛОКАЦИИ К УСЛУГЕ ===== 
  **/
  async addedLocations(
    dto: AddedLocationsDto,
    serviceId: string,
    companyId: string,
  ): Promise<SuccessResponse> {
    const { location_ids: locationIds } = dto;
    const service = await this.prismaService.service.findFirst({
      where: { id: serviceId, companyId },
      select: { id: true },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не была найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    const locations = await this.prismaService.location.findMany({
      where: { id: { in: locationIds }, companyId },
      select: { id: true },
    });

    const existingLocationIds = locations.map((u) => u.id);
    const invalidIds = locationIds.filter(
      (id) => !existingLocationIds.includes(id),
    );

    if (invalidIds.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка: некоторые локации не найдены",
          detail: `Локации с id ${invalidIds.join(", ")} не существуют.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prismaService.$transaction([
      this.prismaService.locationService.deleteMany({ where: { serviceId } }),
      this.prismaService.locationService.createMany({
        data: locationIds.map((locationId) => ({
          locationId,
          serviceId: service.id,
        })),
      }),
    ]);

    return { success: true };
  }

  /**
    ==== НОВЫЙ ВАРИАНТ ДОБАВЛЕНИЯ ЛОКАЦИИ К УСЛУГЕ ===== 
  **/
  async addedLocationToService(
    serviceId: string,
    locationId: string,
    companyId: string,
  ) {
    const service = await this.prismaService.service.findFirst({
      where: { id: serviceId, companyId },
      select: { id: true },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не была найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    const location = await this.prismaService.location.findFirst({
      where: { id: locationId, companyId },
      select: { id: true },
    });

    if (!location)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: локация не обнаружена",
          detail: `Локация с id ${locationId} не существует.`,
        },
        HttpStatus.NOT_FOUND,
      );

    const exist = await this.prismaService.locationService.findFirst({
      where: { serviceId, locationId },
    });

    if (exist)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка: локация уже привязана",
          detail: "Данная локация уже привязана к этой услуге.",
        },
        HttpStatus.BAD_REQUEST,
      );

    await this.prismaService.locationService.create({
      data: { locationId, serviceId: service.id },
    });

    return { success: true };
  }

  async removeLocation(
    serviceId: string,
    locationId: string,
    companyId: string,
  ) {
    const service = await this.prismaService.service.findFirst({
      where: { id: serviceId, companyId },
      select: { id: true },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не была найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    const deleteRes = await this.prismaService.locationService.deleteMany({
      where: { serviceId, locationId },
    });

    if (deleteRes.count === 0)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: связь не найдена",
          detail: "Данная локация не привязана к этой услуге.",
        },
        HttpStatus.NOT_FOUND,
      );

    return { success: true };
  }

  private async findById(id: string) {
    const service = await this.prismaService.service.findFirst({
      where: { id },
      select: { avatar: true },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail:
            "Запрошенная услуга не была найдена. Это может произойти, если вы ранее не создавали никаких услуг. Рекомендуем начать с добавления первой услуги.",
        },
        HttpStatus.NOT_FOUND,
      );

    return service;
  }

  async uploadAvatar(image: BufferedFile, serviceId: string) {
    const { avatar } = await this.findById(serviceId);
    const upload = await this.minioService.uploadFile(
      "service-avatars",
      image,
      avatar || undefined,
    );

    const key = `service-avatars/${upload}`;

    await this.prismaService.service.update({
      where: { id: serviceId },
      data: { avatar: key },
    });
    return { success: true, avatar: buildFileUrl(key) };
  }
}
