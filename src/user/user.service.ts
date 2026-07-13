import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";
import { UserCreateDto } from "./dto/user.dto";
import { IUser, UserPrivate } from "./types/user.type";
import { UserStatus } from "@prisma/client";
import { BufferedFile } from "src/minio/file.model";
import { MinioService } from "src/minio/minio.service";
import { buildFileUrl } from "src/shared/utils/build-url";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { normalizePhone } from "src/shared/utils/phone";
import { getFullName } from "src/shared/utils/get-full-name.util";

@Injectable()
export class UserService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  public async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        lastName: true,
        firstName: true,
        avatar: true,
        role: { select: { id: true, name: true } },
        locations: {
          select: {
            location: {
              select: {
                id: true,
                name: true,
                avatar: true,
                address: {
                  select: {
                    timezone: true,
                    timezoneoffset: true,
                    street: true,
                    region: true,
                    country: true,
                    city: true,
                    house: true,
                    positionLat: true,
                    positionLng: true,
                    post_code: true,
                  },
                },
              },
            },
          },
        },
        settings: {
          select: {
            pages: {
              select: {
                page: true,
                isVisible: true,
              },
            },
            // themePreset: {
            //   select: {
            //     id: true,
            //     backgroundColor: true,
            //     primaryColor: true,
            //     secondaryColor: true,
            //     onSurface: true,
            //     surface: true,
            //     mode: true,
            //   },
            // },
            // customTheme: {
            //   select: {
            //     id: true,
            //     backgroundColor: true,
            //     primaryColor: true,
            //     secondaryColor: true,
            //     onSurface: true,
            //     surface: true,
            //     theme: true,
            //   },
            // },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            publicName: true,
            logo: true,
            currency: true,
            onboarding: { select: { id: true } },
          },
        },
      },
    });

    if (!user) throw new Error("Пользователь не найден");

    const company = user.company?.id
      ? {
          id: user.company?.id,
          name: user.company?.name,
          logo: buildFileUrl(user.company.logo),
          site_url: `http://app.fast-day.ru/${user.company.publicName}`,
          currency: user.company?.currency,
        }
      : null;

    const locationArr = user.locations.map((loc) => ({
      id: loc.location.id,
      name: loc.location.name,
      avatar: buildFileUrl(loc.location.avatar),
      timezone: {
        timezone: loc.location.address?.timezone,
        timezone_offset: loc.location.address?.timezoneoffset,
      },
      address: {
        full_address:
          [
            loc.location.address?.country,
            loc.location.address?.region,
            loc.location.address?.city,
            loc.location.address?.street,
            loc.location.address?.house,
          ]
            .filter(Boolean)
            .join(", ") || null,
        street: loc.location.address?.street,
        house: loc.location.address?.house,
        city: loc.location.address?.city,
        region: loc.location.address?.region,
        country: loc.location.address?.country,
        post_code: loc.location.address?.post_code,
        map: {
          lat: loc.location.address?.positionLat,
          lng: loc.location.address?.positionLng,
        },
      },
    }));

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role?.name,
      role_id: { id: user.role?.id },
      first_name: user.firstName,
      last_name: user.lastName,
      full_name: getFullName(user.firstName, user.lastName),
      avatar: buildFileUrl(user.avatar),
      locations: locationArr.length ? locationArr : null,
      company: company,
      settings: {
        pages: user.settings?.pages.map((p) => ({
          page: p.page,
          is_visible: p.isVisible,
        })),
        is_survey: !!user.company?.onboarding,

        /*
          ===== НА БУДУЩЕЕ НАСТРОЙКА ТЕМЫ =====
        */
        // theme: {
        //   custom: {
        //     id: user.settings?.customTheme?.id,
        //     background_color: user.settings?.customTheme?.backgroundColor,
        //     primary_color: user.settings?.customTheme?.primaryColor,
        //     secondary_color: user.settings?.customTheme?.secondaryColor,
        //     on_surface: user.settings?.customTheme?.onSurface,
        //     surface: user.settings?.customTheme?.surface,
        //     theme: user.settings?.customTheme?.theme,
        //   },
        //   brand: {
        //     id: user.settings?.themePreset?.id,
        //     background_color: user.settings?.themePreset?.backgroundColor,
        //     primary_color: user.settings?.themePreset?.primaryColor,
        //     secondary_color: user.settings?.themePreset?.secondaryColor,
        //     on_surface: user.settings?.themePreset?.onSurface,
        //     surface: user.settings?.themePreset?.surface,
        //     mode: user.settings?.themePreset?.mode,
        //   },
        // },
      },
    };
  }

  public async checkBanned(locationId: string, userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Пользователь не найден",
          meta: {
            user_id: userId,
          },
        },
        HttpStatus.NOT_FOUND,
      );

    const currentLocation = await this.prismaService.userLocation.findFirst({
      where: { userId, locationId },
      select: { isBanned: true },
    });

    if (!currentLocation)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Локация не найдена",
          meta: {
            user_id: userId,
            location_id: locationId,
          },
        },
        HttpStatus.NOT_FOUND,
      );

    if (currentLocation.isBanned) return { success: false };

    return { success: true };
  }

  public async findByEmail(email: string): Promise<IUser | null> {
    const user = await this.prismaService.user.findUnique({ where: { email } });

    return user;
  }

  async findUserByEmil(email: string, companyId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        position: true,
        companyId: true,
        role: { select: { name: true, id: true } },
      },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Пользователь не найден",
          meta: { email },
        },
        HttpStatus.NOT_FOUND,
      );

    if (user.companyId !== companyId)
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          title: "Пользователь уже привязан к другой компании",
          detail:
            "Данный пользователь уже является сотрудником другой компании.",
          meta: { email },
        },
        HttpStatus.CONFLICT,
      );

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      avatar: buildFileUrl(user.avatar),
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      position: user.position,
    };
  }

  public async findByIdOptional(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, avatar: true },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка",
          detail: "Пользователь не найден",
          meta: {
            user_id: userId,
          },
        },
        HttpStatus.NOT_FOUND,
      );

    return user;
  }

  public async findByEmailOptional(email: string): Promise<IUser | null> {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  public async create(dto: UserCreateDto, status: UserStatus): Promise<IUser> {
    if (!dto.password) {
      throw new BadRequestException("Password is required");
    }
    const pass = dto.password ? await bcrypt.hash(dto.password, 8) : "";

    const role = await this.prismaService.role.findUnique({ where: { id: 1 } });
    if (!role || role.name !== "owner") throw new Error("Роль не найдена");

    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        phoneNormalized: normalizePhone(dto.phone),
        firstName: dto.first_name,
        lastName: dto.last_name,
        passwordHash: pass,
        status: status,
        role: { connect: { id: 1, name: "owner" } },
      },
    });

    return user;
  }

  public async comparePassword(
    password: string,
    hash: string | null,
  ): Promise<boolean> {
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }

  public async currentUser(user_id: string): Promise<UserPrivate> {
    const user = await this.prismaService.user.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        email: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: { select: { name: true } },
          },
        },
        company: { select: { id: true } },
      },
    });

    if (!user) throw new NotFoundException("Пользователь не найден");

    const data: UserPrivate = {
      id: user.id,
      email: user.email,
      role: user.role ? { id: user.role.id, name: user.role.name } : null,
      company: user.company ? { id: user.company.id } : null,
      companyId: user.company?.id ?? null,
      permissions: user.role?.permissions ?? null,
    };

    return data;
  }

  async uploadAvatar(image: BufferedFile, userId: string) {
    const { avatar } = await this.findByIdOptional(userId);
    const upload = await this.minioService.uploadFile(
      "user-avatars",
      image,
      avatar || undefined,
    );

    const key = `user-avatars/${upload}`;

    await this.prismaService.user.update({
      where: { id: userId },
      data: { avatar: key },
    });
    return { success: true, avatar: buildFileUrl(key) };
  }

  /**
    --- ПРАВА ДОСТУПА ---
  **/
  async permission(userId) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Пользователь не найден",
          detail:
            "Срок вашей сессии истек. Пожалуйста, войдите в систему снова",
        },
        HttpStatus.NOT_FOUND,
      );

    const perm = await this.prismaService.role.findFirst({
      where: {
        id: user?.role?.id,
      },
      select: {
        permissions: {
          select: {
            name: true,
          },
        },
      },
    });

    return perm?.permissions;
  }

  async changePassword(dto: ChangePasswordDto, userId: string) {
    const { old_password, new_password } = dto;

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Пользователь не найден",
          detail:
            "Срок вашей сессии истек. Пожалуйста, войдите в систему снова",
        },
        HttpStatus.NOT_FOUND,
      );

    const isValid = await this.comparePassword(old_password, user.passwordHash);

    if (!isValid)
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          title: "Неверный пароль",
          detail: "Текущий пароль введен неверно",
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );

    const passwordHash = await bcrypt.hash(new_password, 8);

    await this.prismaService.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }
}
