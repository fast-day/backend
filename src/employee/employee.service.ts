import {
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";
import { InviteDto } from "./dto/invite.dto";
import { EmployeeDto } from "./dto/employee.dto";
import { LocationService } from "src/location/location.service";
import { generateInviteToken } from "./utils/generate-invite-token.util";
import { RegisterEmployeeDto } from "./dto/register.dto";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "src/auth/token/token.service";
import { JwtPayload } from "src/auth/jwt.payload";
import { RoleService } from "src/role/role.service";
import { CheckInviteDto } from "./dto/check-invite.dto";
import { EmployeeUpdateDto } from "./dto/employee-update.dto";
import { EmployeeDeleteResponse } from "./types/delete.type";
import { EmployeeAuthResponse } from "./types/employee-auth.type";
import { InviteResponse } from "./types/invite.type";
import { CheckInviteResponse } from "./types/check-invite.type";
import { EmployeeFirst } from "./types/employee.type";
import { EmployeeBlockedDto } from "./dto/blocked.dto";
import { SuccessResponse } from "./types/success.type";
import { InviteAction, Prisma, UserStatus } from "@prisma/client";
import { buildFileUrl } from "src/shared/utils/build-url";
import { MailService } from "src/mail/mail.service";
import { SettingsService } from "src/settings/settings.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginationQuery,
} from "src/shared/common/pagination/pagination";
import { normalizePhone } from "src/shared/utils/phone";
import { getFullName } from "src/shared/utils/get-full-name.util";

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly locationService: LocationService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly roleService: RoleService,
    private readonly mailService: MailService,
    private readonly settingService: SettingsService,
  ) {}

  async findById(id: string): Promise<EmployeeFirst> {
    const employee = await this.prismaService.userLocation.findUnique({
      where: { id },
      select: {
        id: true,
        locationId: true,
        roleId: true,
        birthday: true,
        note: true,
        isBanned: true,
      },
    });

    if (!employee)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Сотрудник не найден",
        },
        HttpStatus.NOT_FOUND,
      );

    return employee;
  }

  async invite(dto: InviteDto, action: InviteAction): Promise<InviteResponse> {
    const token = generateInviteToken();
    const baseUrl = process.env.APP_BASE_URL;

    await this.prismaService.invite.create({
      data: {
        token: token,
        email: dto.email,
        locationId: dto.location_id,
        role: dto.role,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        action,
      },
    });

    return {
      url: `${baseUrl}/${action}?token=${token}&email=${dto.email}`,
    };
  }

  async checkInvite(dto: CheckInviteDto): Promise<CheckInviteResponse> {
    const { token } = dto;
    const isExist = await this.prismaService.invite.findFirst({
      where: { token: token },
      select: { expiresAt: true },
    });

    if (!isExist || isExist.expiresAt < new Date())
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ссылка устарела",
          message:
            "Срок действия вашей ссылки истек. Пожалуйста, проверьте правильность введенного текста или запросите новую ссылку.",
        },
        HttpStatus.NOT_FOUND,
      );

    return { valid: true };
  }

  private async validateExistInvite(email: string, locationId: string) {
    const isExist = await this.prismaService.invite.findFirst({
      where: {
        email,
        locationId,
        expiresAt: { gte: new Date() },
      },
    });

    if (isExist)
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          title: "Приглашение уже отправлено",
          detail: "Вы уже отправляли приглашение ранее.",
        },
        HttpStatus.CONFLICT,
      );
  }

  /** 
      ДОБАВИТЬ ОТПРАВКУ ПИСЕМ НА EMAIL | УВЕДОМЛЕНИЯ В СИСТЕМЕ
  **/
  // async sendInviteNotify(email: string, name: string, inviteUrl: string) {
  //   console.log({ email, name, inviteUrl });
  // }

  /** 
      ОТПРАВКА УВЕДОМЛЕНИЯ НА ПОЧТНУ С ПРИГЛАШЕНИЕМ
  **/
  // async sendLocationAddedNotify(
  //   email: string,
  //   name: string,
  //   locationId: string,
  // ) {
  //   console.log({ email, name, locationId });
  // }

  async inviteCreate(dto: EmployeeDto, companyId: string) {
    await this.locationService.findById(dto.location_id);
    await this.roleService.findById(dto.role);

    const isExistUser = await this.prismaService.user.findUnique({
      where: { email: dto.email },
      include: {
        locations: { where: { locationId: dto.location_id } },
        role: { select: { id: true, name: true } },
      },
    });

    const locations = Array.isArray(isExistUser?.locations)
      ? isExistUser.locations
      : [];
    if (locations.length > 0)
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          title: "Ошибка",
          detail: "Пользователь уже привязан к указанной локации.",
        },
        HttpStatus.CONFLICT,
      );

    await this.validateExistInvite(dto.email, dto.location_id);

    /** 
      ЕСЛИ ПОЛЬЗОВАТЕЛЬ УЖЕ ЕСТЬ В БАЗЕ, 
      ТО НЕ СОЗДАВАТЬ ДЛЯ НЕГО ИНВАЙТ, 
      А ПРОСТО УВЕДОМЛЯТЬ ЕГО О ТОМ, ЧТО ОН БЫЛ ДОБАВЛЕН В ТАКУЮ-ТО ЛОКАЦИЮ
    **/
    if (isExistUser) {
      const user = await this.prismaService.userLocation.create({
        data: {
          userId: isExistUser.id,
          locationId: dto.location_id,
          roleId: dto.role,
          birthday: dto.birthdate ?? null,
          note: dto.note ?? null,
        },
        select: {
          isBanned: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              avatar: true,
              status: true,
              position: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      await this.mailService.sendLocationAddedNotify(
        dto.email,
        `${dto.first_name} ${dto.last_name}`,
      );

      return {
        success: true,
        message: "Пользователь добавлен в локацию",
        detail: {
          id: user.user.id,
          email: user.user.email,
          phone: user.user.phone,
          full_name: getFullName(user.user.firstName, user.user.lastName),
          first_name: user.user.firstName,
          last_name: user.user.lastName,
          avatar: buildFileUrl(user.user.avatar),
          status: user.user.status,
          position: user.user.position,
          role: user.user.role,
          is_banned: user.isBanned,
        },
      };
    }

    const userLocation = await this.prismaService.$transaction(async (t) => {
      const user = await t.user.create({
        data: {
          email: dto.email,
          lastName: dto.last_name,
          firstName: dto.first_name,
          phone: dto.phone,
          phoneNormalized: normalizePhone(dto.phone),
          status: "invited",
          companyId: companyId,
          roleId: dto.role,
          position: dto.position,
        },
      });

      return await t.userLocation.create({
        data: {
          userId: user.id,
          locationId: dto.location_id,
          roleId: dto.role,
          birthday: dto.birthdate ?? null,
          note: dto.note ?? null,
        },
        select: {
          id: true,
          isBanned: true,
          role: { select: { id: true, name: true } },
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              avatar: true,
              status: true,
              position: true,
            },
          },
        },
      });
    });

    const data = {
      email: dto.email,
      location_id: dto.location_id,
      role: dto.role,
    } satisfies InviteDto;

    const { url } = await this.invite(data, InviteAction.invite);
    // await this.mailService.sendLocationAddedNotify(
    //   dto.email,
    //   `${dto.first_name} ${dto.last_name}`,
    //   dto.location_id,
    // );

    await this.mailService.sendInviteNotify(
      dto.email,
      `${dto.first_name} ${dto.last_name}`,
      url,
    );

    return {
      success: true,
      message: "Приглашение отправлено на почту",
      detail: {
        action: "invite",
        id: userLocation.id,
        profile_id: userLocation.user.id,
        email: userLocation.user.email,
        phone: userLocation.user.phone,
        full_name: getFullName(
          userLocation.user.firstName,
          userLocation.user.lastName,
        ),
        first_name: userLocation.user.firstName,
        last_name: userLocation.user.lastName,
        avatar: buildFileUrl(userLocation.user.avatar),
        status: userLocation.user.status,
        position: userLocation.user.position,
        role: userLocation.role,
        is_banned: userLocation.isBanned,
      },
    };
  }

  async register(
    dto: RegisterEmployeeDto,
    ipAddress: string,
  ): Promise<EmployeeAuthResponse> {
    const invite = await this.prismaService.invite.findUnique({
      where: { token: dto.token },
    });
    if (!invite) throw new NotFoundException("Приглашение не найдено");
    if (invite.expiresAt < new Date())
      throw new GoneException("Приглашение устарело");

    const pass = await bcrypt.hash(dto.password, 8);

    const user = await this.prismaService.$transaction(async (t) => {
      const user = await t.user.update({
        where: { email: invite.email },
        data: {
          lastName: dto.last_name,
          phone: dto.phone,
          phoneNormalized: normalizePhone(dto.phone),
          passwordHash: pass,
          status: "active",
          position: dto.position,
        },
      });

      await t.invite.delete({ where: { token: dto.token } });

      return user;
    });

    await this.settingService.createSetting(user.id);

    const payload = { sub: user.id, email: user.email } satisfies JwtPayload;

    const accessToken = this.jwtService.sign(payload, { expiresIn: "1h" });
    const refreshToken = await this.tokenService.createRefreshToken({
      userId: payload.sub,
      ipAddress,
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async update(dto: EmployeeUpdateDto, userId: string) {
    const employee = await this.findById(userId);
    const user = await this.prismaService.user.findFirst({
      where: { locations: { some: { id: employee.id } } },
      select: { id: true },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Сотрудник не найден",
        },
        HttpStatus.NOT_FOUND,
      );

    const newUser = await this.prismaService.$transaction(async (t) => {
      await t.user.update({
        where: { id: user.id },
        data: {
          // email: dto.email,
          firstName: dto.first_name,
          lastName: dto.last_name,
          phone: dto.phone,
          phoneNormalized: normalizePhone(dto.phone),
          position: dto.position,
          roleId: dto.role,
        },
      });

      const update = await t.userLocation.update({
        where: { id: employee.id },
        data: {
          isBanned: dto.is_banned ?? false,
          birthday: dto.birthdate ?? null,
          note: dto.note ?? null,
          roleId: dto.role,
        },
        select: {
          id: true,
          note: true,
          birthday: true,
          isBanned: true,
          locationId: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              avatar: true,
              status: true,
              position: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
              services: {
                take: 6,
                select: {
                  service: {
                    select: {
                      id: true,
                      avatar: true,
                      name: true,
                    },
                  },
                },
              },
              locations: {
                take: 6,
                select: {
                  location: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true,
                    },
                  },
                },
              },
              _count: {
                select: { services: true, locations: true },
              },
            },
          },
        },
      });

      return update;
    });

    return {
      id: newUser.id,
      note: newUser.note,
      is_banned: employee.isBanned,
      current_location: newUser.locationId,
      service_count: newUser.user._count.services,
      location_count: newUser.user._count.locations,
      profile: {
        id: newUser.user.id,
        email: newUser.user.email,
        phone: newUser.user.phone,
        first_name: newUser.user.firstName,
        last_name: newUser.user.lastName,
        full_name: getFullName(newUser.user.firstName, newUser.user.lastName),
        avatar: buildFileUrl(newUser.user.avatar),
        status: newUser.user.status,
        position: newUser.user.position,
        role: newUser.user.role,
        birthday: newUser.birthday,
      },
      services: newUser.user.services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        avatar: buildFileUrl(s.service.avatar),
      })),
      locations: newUser.user.locations.map((l) => ({
        id: l.location.id,
        name: l.location.name,
        avatar: buildFileUrl(l.location.avatar),
      })),
    };
  }

  async changePassword(dto: ChangePasswordDto, userId: string) {
    const { new_password, confirm_password } = dto;

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Сотрудник не найден",
        },
        HttpStatus.NOT_FOUND,
      );

    if (new_password !== confirm_password)
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          title: "Пароли не совпадают",
          detail: "Пароли не совпадают",
        },
        HttpStatus.CONFLICT,
      );

    const passwordHash = await bcrypt.hash(new_password, 8);

    await this.prismaService.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  async blocked(
    dto: EmployeeBlockedDto,
    userId: string,
    locationId: string,
  ): Promise<SuccessResponse> {
    const isExist = await this.prismaService.userLocation.findUnique({
      where: { userId_locationId: { userId, locationId } },
    });

    if (!isExist)
      throw new HttpException(
        {
          title: "Ошибка",
          description: "Пользователь не найден",
          detail: [`ID ${userId}`],
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    const { is_banned } = dto;

    await this.prismaService.userLocation.update({
      where: { userId_locationId: { userId, locationId } },
      data: { isBanned: is_banned },
    });

    return { success: true };
  }

  async delete(
    userId: string,
    locationId: string,
  ): Promise<EmployeeDeleteResponse> {
    const isExist = await this.prismaService.userLocation.findUnique({
      where: { userId_locationId: { userId, locationId } },
    });

    if (!isExist)
      throw new HttpException(
        {
          title: "Ошибка",
          description: "Пользователь не найден",
          detail: [`ID ${userId}`],
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    const user = await this.prismaService.userLocation.delete({
      where: { userId_locationId: { userId, locationId } },
    });

    return {
      success: true,
      user: { id: user.id, location_id: user.locationId },
    };
  }

  async getEmployees(
    locationId: string,
    pagination: PaginationQuery,
    filters?: { search?: string; status?: UserStatus; role?: string },
  ) {
    const { search, status, role } = filters ?? {};
    const { page, limit, skip } = getPaginationParams(pagination);

    const userFilter: Prisma.UserWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          {
            firstName: { contains: search, mode: Prisma.QueryMode.insensitive },
          },
          {
            lastName: { contains: search, mode: Prisma.QueryMode.insensitive },
          },
          {
            phoneNormalized: {
              contains: normalizePhone(search),
              mode: Prisma.QueryMode.insensitive,
            },
          },
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };

    const where = {
      locationId,
      ...(role && {
        role: { name: { equals: role, mode: Prisma.QueryMode.insensitive } },
      }),
      ...(Object.keys(userFilter).length && { user: userFilter }),
    };

    const [userLocations, total] = await Promise.all([
      this.prismaService.userLocation.findMany({
        where,
        select: {
          isBanned: true,
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
              phone: true,
              firstName: true,
              lastName: true,
              avatar: true,
              status: true,
              position: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          user: {
            createdAt: "desc",
          },
        },
        skip,
        take: limit,
      }),
      this.prismaService.userLocation.count({ where }),
    ]);

    const data = userLocations.map((userLocation) => ({
      id: userLocation.user.id,
      email: userLocation.user.email,
      phone: userLocation.user.phone,
      full_name: getFullName(
        userLocation.user.firstName,
        userLocation.user.lastName,
      ),
      first_name: userLocation.user.firstName,
      last_name: userLocation.user.lastName,
      avatar: buildFileUrl(userLocation.user.avatar),
      status: userLocation.user.status,
      position: userLocation.user.position,
      role: userLocation.role,
      is_banned: userLocation.isBanned,
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  /**
    ===== ДЕТАЛЬНАЯ ИНФОРМАЦИЯ О СОТРУДНИКЕ =====

    УБРАЛ ИНФОРМАЦИЮ О ДОСТУПНЫХ ЛОКАЦИЯХ СОТРУДНИКУ
  **/
  async getEmployee(locationId: string, userId: string) {
    const employee = await this.prismaService.userLocation.findFirst({
      where: { locationId, userId },
      select: {
        id: true,
        birthday: true,
        note: true,
        isBanned: true,
        locationId: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            avatar: true,
            status: true,
            position: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
            services: {
              take: 6,
              select: {
                service: {
                  select: {
                    id: true,
                    avatar: true,
                    name: true,
                  },
                },
              },
            },
            // locations: {
            //   take: 6,
            //   select: {
            //     location: {
            //       select: {
            //         id: true,
            //         name: true,
            //         avatar: true,
            //       },
            //     },
            //   },
            // },
            _count: {
              select: { services: true, locations: true },
            },
          },
        },
      },
    });

    if (!employee)
      throw new HttpException(
        {
          title: "Ошибка",
          description: "Пользователь не найден",
          detail: [`ID ${userId}`],
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    return {
      id: employee.id,
      note: employee.note,
      is_banned: employee.isBanned,
      current_location: employee.locationId,
      service_count: employee.user._count.services,
      location_count: employee.user._count.locations,
      profile: {
        id: employee.user.id,
        email: employee.user.email,
        phone: employee.user.phone,
        first_name: employee.user.firstName,
        last_name: employee.user.lastName,
        full_name: getFullName(employee.user.firstName, employee.user.lastName),
        avatar: buildFileUrl(employee.user.avatar),
        status: employee.user.status,
        position: employee.user.position,
        role: employee.user.role,
        birthday: employee.birthday,
      },
      services: employee.user.services.map((s) => ({
        id: s.service.id,
        avatar: buildFileUrl(s.service.avatar),
        name: s.service.name,
      })),
      // locations: employee.user.locations.map((l) => ({
      //   id: l.location.id,
      //   name: l.location.name,
      //   avatar: buildFileUrl(l.location.avatar),
      // })),
    };
  }

  /**
    ==== ДОБАВЛЕНИE УСЛУГИ ДЛЯ СОТРУДНИКА ===== 
  **/
  async addServiceToUser(userId: string, serviceId: string, companyId: string) {
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: пользователь не найден",
          detail: `Пользователь с id ${userId} не существует.`,
        },
        HttpStatus.NOT_FOUND,
      );

    const service = await this.prismaService.service.findFirst({
      where: { id: serviceId, companyId },
      select: { id: true },
    });

    if (!service)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не обнаружена",
          detail: "Услуга не найдена.",
        },
        HttpStatus.NOT_FOUND,
      );

    try {
      await this.prismaService.userService.create({
        data: { userId: user.id, serviceId: service.id },
      });
    } catch {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка: услуга уже привязана",
          detail: "Эта услуга уже назначена пользователю",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return { success: true };
  }

  async removeServiceFromUser(
    userId: string,
    serviceId: string,
    companyId: string,
  ) {
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });

    if (!user)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: пользователь не найден",
          detail: `Пользователь с id ${userId} не существует.`,
        },
        HttpStatus.NOT_FOUND,
      );

    const deleteRes = await this.prismaService.userService.deleteMany({
      where: { userId, serviceId },
    });

    if (deleteRes.count === 0)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: услуга не найдена",
          detail: "Услуга не привязана к пользователю",
        },
        HttpStatus.NOT_FOUND,
      );

    return { success: true };
  }

  /**
    ===== ПРОВЕРКА СУЩЕСТВУЕТ ЛИ СОТРУДНИК В ТЕКУЩЕЙ ЛОКАЦИИ ===== 
  **/
  async checkEmployeeInLocation(userId: string, locationId: string) {
    const employee = await this.prismaService.user.findFirst({
      where: { id: userId },
      select: { id: true },
    });

    if (!employee)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка: пользователь не найден",
          detail: `Пользователь с id ${userId} не существует.`,
        },
        HttpStatus.NOT_FOUND,
      );

    const exist = await this.prismaService.userLocation.findFirst({
      where: { userId, locationId },
    });

    if (exist)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка: сотрудник уже привязан локации",
          detail: "Сотрудник уже привязан к данной локации",
        },
        HttpStatus.BAD_REQUEST,
      );

    return { success: true };
  }
}
