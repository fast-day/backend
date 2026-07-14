import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { LocationDto } from "./dto/location.dto";
import { AddressService } from "src/address/address.service";
import { LocationUpdateDto } from "./dto/location-update.dto";
import { Prisma } from "@prisma/client";
import { ILocationUser } from "./types/location-user.type";
import { BufferedFile } from "src/minio/file.model";
import { MinioService } from "src/minio/minio.service";
import { LocationActivateDto } from "./dto/location-activate.dto";
import { buildFileUrl } from "src/shared/utils/build-url";
import { GetLocationsDto } from "./dto/get-locations.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "src/shared/common/pagination/pagination";
import { normalizePhone } from "src/shared/utils/phone";

@Injectable()
export class LocationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly addressService: AddressService,
    private readonly minioService: MinioService,
  ) {}

  async create(dto: LocationDto, userId: string, companyId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });
    const isExists = await this.prismaService.location.findFirst({
      where: { companyId: companyId, name: dto.name },
    });

    if (isExists)
      throw new BadRequestException("Локация с таким именем уже существует");

    const locationDTO = {
      name: dto.name,
      phone: dto.phone,
      phoneNormalized: normalizePhone(dto.phone),
      comfort: dto.comfort,
    };

    const location = await this.prismaService.$transaction(async (t) => {
      const location = await t.location.create({
        data: {
          company: { connect: { id: companyId } },
          ...locationDTO,
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          description: true,
          phone: true,
          category: true,
          active: true,
          comfort: true,
        },
      });

      // const address = await this.addressService.create(t, dto, location.id);

      await t.userLocation.create({
        data: {
          userId,
          locationId: location.id,
          roleId: user?.roleId,
        },
      });

      return {
        id: location.id,
        name: location.name,
        avatar: buildFileUrl(location.avatar),
        description: location.description,
        phone: location.phone,
        is_active: location.active,
        category: location.category,
        comfort: location.comfort,
        // address: {
        //   full_address: [
        //     address?.country,
        //     address?.region,
        //     address?.city,
        //     address?.street,
        //     address?.house,
        //   ]
        //     .filter(Boolean)
        //     .join(", "),
        //   street: address?.street,
        //   house: address?.house,
        //   city: address?.city,
        //   region: address?.region,
        //   country: address?.country,
        // },
      };
    });

    return location;
  }

  async createFirst(
    t: Prisma.TransactionClient,
    dto: LocationDto,
    userId: string,
    roleId: number | undefined,
    companyId: string,
  ) {
    const { name, phone, comfort } = dto;
    const locationDto = {
      name,
      phone,
      comfort,
      phoneNormalized: normalizePhone(phone),
    };

    const location = await t.location.create({
      data: {
        company: { connect: { id: companyId } },
        ...locationDto,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

    const address = await this.addressService.create(t, dto, location.id);

    await t.userLocation.create({
      data: {
        userId,
        locationId: location.id,
        roleId,
      },
    });

    return {
      ...location,
      avatar: buildFileUrl(location.avatar),
      address,
    };
  }

  async findById(id: string) {
    const location = await this.prismaService.location.findUnique({
      where: { id },
    });

    if (!location) throw new NotFoundException("Локация не найдена");

    return location;
  }

  async update(dto: LocationUpdateDto, location_id: string) {
    await this.findById(location_id);

    const {
      country,
      city,
      region,
      street,
      house,
      post_code,
      lat,
      lng,
      timezone,
      timezone_offset,
      ...locationFields
    } = dto;

    const newLocation = await this.prismaService.location.update({
      where: { id: location_id },
      data: {
        ...locationFields,
        ...(dto.phone && { phoneNormalized: normalizePhone(dto.phone) }),
        address: {
          update: {
            country,
            city,
            region,
            street,
            house,
            post_code,
            timezone,
            timezoneoffset: timezone_offset,
            positionLat: lat,
            positionLng: lng,
          },
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        description: true,
        phone: true,
        active: true,
        users: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, avatar: true } },
          },
        },
        category: true,
        comfort: true,
        address: {
          select: {
            street: true,
            region: true,
            country: true,
            city: true,
            house: true,
            timezone: true,
            timezoneoffset: true,
            positionLat: true,
            positionLng: true,
            post_code: true,
          },
        },
        services: {
          select: {
            id: true,
            service: {
              select: {
                id: true,
                avatar: true,
                name: true,
                mark: true,
              },
            },
          },
        },
      },
    });

    return {
      id: newLocation.id,
      name: newLocation.name,
      avatar: buildFileUrl(newLocation.avatar),
      description: newLocation.description,
      phone: newLocation.phone,
      timezone: `${newLocation.address?.timezone} (${newLocation.address?.timezoneoffset})`,
      user_count: newLocation.users.length,
      is_active: newLocation.active,

      users: newLocation.users.map((u) => ({
        id: u.user.id,
        name: u.user.firstName,
        avatar: buildFileUrl(u.user.avatar),
      })),
      category: newLocation.category,
      comfort: newLocation.comfort,
      address: {
        full_address: [
          newLocation.address?.country,
          newLocation.address?.region,
          newLocation.address?.city,
          newLocation.address?.street,
          newLocation.address?.house,
        ]
          .filter(Boolean)
          .join(", "),
        street: newLocation.address?.street,
        house: newLocation.address?.house,
        city: newLocation.address?.city,
        region: newLocation.address?.region,
        country: newLocation.address?.country,
        post_code: newLocation.address?.post_code,
        map: {
          lat: newLocation.address?.positionLat,
          lng: newLocation.address?.positionLng,
        },
      },
      services: newLocation.services.map((service) => ({
        id: service.service.id,
        avatar: buildFileUrl(service.service.avatar),
        name: service.service.name,
        mark: service.service.mark,
      })),
    };
  }

  async delete(location_id: string) {
    const deleted = await this.prismaService.location.delete({
      where: { id: location_id },
    });

    if (!deleted)
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          title: "Ошибка",
          description: `Не удалось удалить локацию`,
        },
        HttpStatus.BAD_REQUEST,
        { cause: new Error() },
      );

    return {
      message: "Локация удалена",
      location: { id: deleted.id, name: deleted.name },
    };
  }

  async changeStatus(dto: LocationActivateDto, location_id: string) {
    await this.findById(location_id);

    const updated = await this.prismaService.location.update({
      where: { id: location_id },
      data: { active: dto.active },
    });

    if (!updated)
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          title: "Ошибка",
          description: `Не удалось обновить статус локации`,
        },
        HttpStatus.BAD_REQUEST,
        { cause: new Error() },
      );

    return {
      message: "Статус обновлен",
      location: { id: updated.id },
    };
  }

  async getOne(location_id: string) {
    if (!location_id) throw new BadRequestException("Выберите локацию");

    const location = await this.prismaService.location.findUnique({
      where: { id: location_id },
      select: {
        id: true,
        name: true,
        avatar: true,
        description: true,
        phone: true,
        active: true,
        users: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, avatar: true } },
          },
        },
        category: true,
        comfort: true,
        address: {
          select: {
            street: true,
            region: true,
            country: true,
            city: true,
            house: true,
            timezone: true,
            timezoneoffset: true,
            positionLat: true,
            positionLng: true,
            post_code: true,
          },
        },
        services: {
          select: {
            id: true,
            service: {
              select: {
                id: true,
                name: true,
                mark: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!location) throw new NotFoundException("Локация не найдена");

    return {
      id: location.id,
      name: location.name,
      avatar: buildFileUrl(location.avatar),
      description: location.description,
      phone: location.phone,
      timezone: `${location.address?.timezone} (${location.address?.timezoneoffset})`,
      user_count: location.users.length,
      is_active: location.active,

      users: location.users.map((u) => ({
        id: u.user.id,
        name: u.user.firstName,
        avatar: buildFileUrl(u.user.avatar),
      })),
      category: location.category,
      comfort: location.comfort,
      address: {
        full_address: [
          location.address?.country,
          location.address?.region,
          location.address?.city,
          location.address?.street,
          location.address?.house,
        ]
          .filter(Boolean)
          .join(", "),
        street: location.address?.street,
        house: location.address?.house,
        city: location.address?.city,
        region: location.address?.region,
        country: location.address?.country,
        post_code: location.address?.post_code,
        map: {
          lat: location.address?.positionLat,
          lng: location.address?.positionLng,
        },
      },
      services: location.services.map((service) => ({
        id: service.service.id,
        name: service.service.name,
        mark: service.service.mark,
        avatar: buildFileUrl(service.service.avatar),
      })),
    };
  }

  /*
    ===== ИЗМЕНЕН СПОСОБ ПОЛУЧЕНИЯ ЛОКАЦИЙ ПОЛЬЗОВАТЕЛЯ =====
    РАНЕЕ ПОЛЬЗОВАТЕЛЮ ВЫДАВАЛИСЬ ВСЕ ЛОКАЦИИ ДОСТУПНЫЕ В КОМПАНИИ
    ТЕПЕРЬ ПОЛЬЗОВАТЕЛЮ ВЫДАЮТСЯ ТОЛЬКО ТЕ ЛОКАЦИИ В КОТОРЫХ ОН РАБОТАЕТ
    СООТВЕТСВЕННО КОНФЛИКТОВ НЕ ДОЛЖНО БЫТЬ. ПОТОМУ ЧТО ОДИН ПОЛЬЗОВАТЕЛЬ МОЖЕТ БЫТЬ ТОЛЬКО В ОДНОЙ КОМПАНИИ

    ----- ЗАМЕНИЛ COMPANY_ID НА USER_ID
  */
  async getAll(userId: string, query: GetLocationsDto) {
    if (!userId) throw new BadRequestException("Пользователь не найден");

    const { active, name, category, search, ...pagination } = query;

    const { page, limit, skip } = getPaginationParams(pagination);

    const where = {
      // company: { id: companyId },
      users: { some: { userId } },
      ...(active && { active: active === 1 ? true : false }),
      ...(name && { name }),
      ...(category && { category: { has: category } }),
      ...(search && {
        OR: [
          {
            phoneNormalized: {
              // contains: normalizePhone(search),
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            name: { contains: search, mode: Prisma.QueryMode.insensitive },
          },
          {
            address: {
              OR: [
                {
                  city: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  country: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  street: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  region: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            },
          },
        ],
      }),
    };

    const [locations, total] = await Promise.all([
      this.prismaService.location.findMany({
        where,
        select: {
          id: true,
          name: true,
          avatar: true,
          description: true,
          phone: true,
          active: true,
          category: true,
          comfort: true,
          address: {
            select: {
              street: true,
              region: true,
              country: true,
              city: true,
              house: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      this.prismaService.location.count({ where }),
    ]);

    const data = locations.map((location) => ({
      id: location.id,
      name: location.name,
      avatar: buildFileUrl(location.avatar),
      description: location.description,
      phone: location.phone,
      is_active: location.active,
      category: location.category,
      comfort: location.comfort,
      address: {
        full_address: [
          location.address?.country,
          location.address?.region,
          location.address?.city,
          location.address?.street,
          location.address?.house,
        ]
          .filter(Boolean)
          .join(", "),
        street: location.address?.street,
        house: location.address?.house,
        city: location.address?.city,
        region: location.address?.region,
        country: location.address?.country,
      },
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findUsers(location_id: string): Promise<ILocationUser[]> {
    if (!location_id) throw new BadRequestException("Выберите локацию");

    const location = await this.prismaService.location.findUnique({
      where: { id: location_id },
      select: {
        id: true,
        name: true,
        phone: true,
        users: {
          select: {
            id: true,
            role: { select: { id: true, name: true } },
            isBanned: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
                role: true,
                phone: true,
                status: true,
                position: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!location) throw new NotFoundException("Локация не найдена");

    const users = location?.users.map((user) => ({
      user_id: user.id,
      role: user.role?.name,
      is_banned: user.isBanned,
      profile: {
        id: user.user.id,
        email: user.user.email,
        name: `${user.user.firstName} ${user.user.lastName}`,
        phone: user.user.phone,
        avatar: buildFileUrl(user.user.avatar),
        status: user.user.status,
        position: user.user.position,
      },
    }));

    return users;
  }

  async getFirstUser(
    userId: string,
    locationId: string,
  ): Promise<ILocationUser> {
    const user = await this.prismaService.userLocation.findUnique({
      where: { userId_locationId: { userId, locationId } },
      select: {
        id: true,
        role: { select: { id: true, name: true } },
        isBanned: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            phone: true,
            status: true,
            position: true,
            avatar: true,
          },
        },
      },
    });

    if (!user)
      throw new HttpException(
        {
          title: "Ошибка",
          description: "Пользователь не найден",
          detail: [`ID ${userId}`],
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    const res = {
      user_id: user.id,
      role: user.role?.name,
      is_banned: user.isBanned,
      profile: {
        id: user.user.id,
        email: user.user.email,
        name: `${user.user.firstName} ${user.user.lastName}`,
        phone: user.user.phone,
        status: user.user.status,
        position: user.user.position,
        avatar: buildFileUrl(user.user.avatar),
      },
    };

    return res;
  }

  async uploadAvatar(image: BufferedFile, locationId: string) {
    const { avatar } = await this.findById(locationId);
    const upload = await this.minioService.uploadFile(
      "location-avatars",
      image,
      avatar || undefined,
    );

    const key = `location-avatars/${upload}`;

    await this.prismaService.location.update({
      where: { id: locationId },
      data: { avatar: key },
    });
    return { success: true, avatar: buildFileUrl(key) };
  }
}
