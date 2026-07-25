import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { ScheduleDto } from "./dto/schedule.dto";
import { UserService } from "src/user/user.service";
import { getFullName } from "src/shared/utils/get-full-name.util";
import { fromZonedTime } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "src/shared/constant/timezone.constant";
import { formatIntervalTime } from "src/shared/utils/format-time.util";

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
  ) {}

  private async getUserLocationWithTimezone(
    userId: string,
    locationId: string,
  ): Promise<{ userLocationId: string; timezone: string }> {
    const user = await this.prismaService.userLocation.findUnique({
      where: { userId_locationId: { userId, locationId } },
      select: {
        id: true,
        location: { select: { address: { select: { timezone: true } } } },
      },
    });

    if (!user) {
      throw new HttpException(
        {
          title: "Ошибка",
          description: "Пользователь не найден",
          detail: `user_id ${userId}`,
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      userLocationId: user.id,
      timezone: user.location.address?.timezone ?? DEFAULT_TIMEZONE,
    };
  }

  async create(dto: ScheduleDto, locationId: string) {
    const { user_id: userId } = dto;

    const { userLocationId, timezone } = await this.getUserLocationWithTimezone(
      userId,
      locationId,
    );

    const isExist = await this.prismaService.schedule.findFirst({
      where: { date: new Date(dto.date), userLocationId },
    });

    if (isExist)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка создания расписания",
          detail:
            "У выбранного сотрудника уже существует расписание на выбранную дату.",
          meta: { employee_id: userLocationId },
        },
        HttpStatus.BAD_REQUEST,
      );

    const schedule = await this.prismaService.$transaction(async (t) => {
      const sch = await t.schedule.create({
        data: {
          date: new Date(dto.date),
          userLocation: { connect: { id: userLocationId } },
        },
        select: {
          id: true,
          date: true,
        },
      });

      const intervals = await t.scheduleInterval.createManyAndReturn({
        data: dto.intervals.map((i) => {
          const start_utc = fromZonedTime(i.start, timezone);
          const end_utc = fromZonedTime(i.end, timezone);

          return {
            start: new Date(
              Date.UTC(
                1970,
                0,
                1,
                start_utc.getUTCHours(),
                start_utc.getUTCMinutes(),
              ),
            ),
            end: new Date(
              Date.UTC(
                1970,
                0,
                1,
                end_utc.getUTCHours(),
                end_utc.getUTCMinutes(),
              ),
            ),
            scheduleId: sch.id,
          };
        }),
        select: { start: true, end: true },
      });

      return { ...sch, intervals };
    });

    return {
      ...schedule,
      intervals: schedule.intervals.map((interval) => ({
        start: formatIntervalTime(interval.start, timezone),
        end: formatIntervalTime(interval.end, timezone),
      })),
      date: schedule.date.toISOString().split("T")[0],
    };
  }

  async findAll(
    userId: string,
    locationId: string,
    month?: string,
    year?: string,
  ) {
    const { timezone } = await this.getUserLocationWithTimezone(
      userId,
      locationId,
    );

    if (!month || !year) {
      const now = new Date();
      month = String(now.getMonth() + 1).padStart(2, "0");
      year = String(now.getFullYear());
    }

    const schedule = await this.prismaService.schedule.findMany({
      take: 31,
      where: {
        userLocation: { userId, locationId },
        date: {
          gte: new Date(Date.UTC(Number(year), Number(month) - 1, 1)),
          lt: new Date(Date.UTC(Number(year), Number(month), 1)),
        },
      },
      select: {
        id: true,
        date: true,
        intervals: { select: { start: true, end: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return schedule.map((schedule) => ({
      id: schedule.id,
      date: schedule.date.toISOString().split("T")[0],
      intervals: schedule.intervals.map((interval) => ({
        start: formatIntervalTime(interval.start, timezone),
        end: formatIntervalTime(interval.end, timezone),
      })),
    }));
  }

  async update(dto: ScheduleDto, locationId: string, scheduleId: number) {
    const { user_id: userId } = dto;

    if (!scheduleId)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка расписания",
          detail: "Не указан schedule_id",
        },
        HttpStatus.NOT_FOUND,
      );

    const { userLocationId, timezone } = await this.getUserLocationWithTimezone(
      userId,
      locationId,
    );

    const isExist = await this.prismaService.schedule.findFirst({
      where: { id: scheduleId, userLocationId },
    });

    if (!isExist)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка расписания",
          detail: "Расписание не найдено",
        },
        HttpStatus.NOT_FOUND,
      );

    const schedule = await this.prismaService.$transaction(async (t) => {
      const sch = await t.schedule.update({
        where: { id: scheduleId },
        data: {
          date: new Date(dto.date),
          userLocation: { connect: { id: userLocationId } },
        },
        select: { id: true },
      });

      await t.scheduleInterval.deleteMany({
        where: { scheduleId: sch.id },
      });

      await t.scheduleInterval.createMany({
        data: dto.intervals.map((i) => {
          const start_utc = fromZonedTime(i.start, timezone);
          const end_utc = fromZonedTime(i.end, timezone);

          return {
            start: new Date(
              Date.UTC(
                1970,
                0,
                1,
                start_utc.getUTCHours(),
                start_utc.getUTCMinutes(),
              ),
            ),
            end: new Date(
              Date.UTC(
                1970,
                0,
                1,
                end_utc.getUTCHours(),
                end_utc.getUTCMinutes(),
              ),
            ),
            scheduleId: sch.id,
          };
        }),
      });

      const result = await t.schedule.findUnique({
        where: { id: sch.id },
        select: {
          id: true,
          intervals: { select: { start: true, end: true } },
          date: true,
          userLocation: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  position: true,
                },
              },
              locationId: true,
              isBanned: true,
            },
          },
        },
      });

      return result;
    });

    const res = {
      id: schedule!.id,
      date: schedule!.date.toISOString().split("T")[0],
      intervals: schedule!.intervals.map((interval) => ({
        start: formatIntervalTime(interval.start, timezone),
        end: formatIntervalTime(interval.end, timezone),
      })),
      location_id: schedule!.userLocation.locationId,
      user: {
        id: schedule!.userLocation.id,
        full_name: getFullName(
          schedule!.userLocation.user.firstName,
          schedule!.userLocation.user.lastName,
        ),
        first_name: schedule!.userLocation.user.firstName,
        last_name: schedule!.userLocation.user.lastName,
        phone: schedule!.userLocation.user.phone,
        position: schedule!.userLocation.user.position,
        is_banned: schedule!.userLocation.isBanned,
      },
    };
    return res;
  }

  async delete(userId: string, scheduleId: number, locationId: string) {
    if (!userId)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка пользователя",
          detail: "Не указан user_id",
        },
        HttpStatus.NOT_FOUND,
      );

    const { userLocationId } = await this.getUserLocationWithTimezone(
      userId,
      locationId,
    );

    const isExist = await this.prismaService.schedule.findFirst({
      where: { id: scheduleId, userLocationId },
    });

    if (!isExist)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка расписания",
          detail: "Расписание не найдено",
        },
        HttpStatus.NOT_FOUND,
      );

    await this.prismaService.schedule.delete({ where: { id: scheduleId } });

    return { success: true, schedule_id: scheduleId };
  }

  async findById(userId: string, scheduleId: number, locationId: string) {
    if (!userId)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка пользователя",
          detail: "Не указан user_id",
        },
        HttpStatus.NOT_FOUND,
      );

    const { userLocationId, timezone } = await this.getUserLocationWithTimezone(
      userId,
      locationId,
    );

    const schedule = await this.prismaService.schedule.findFirst({
      where: { id: scheduleId, userLocationId },
      select: {
        id: true,
        intervals: { select: { start: true, end: true } },
        date: true,
        userLocation: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                position: true,
              },
            },
            locationId: true,
            isBanned: true,
          },
        },
      },
    });

    if (!schedule)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Ошибка расписания",
          detail: "Расписание не найдено",
        },
        HttpStatus.NOT_FOUND,
      );

    const res = {
      id: schedule.id,
      date: schedule.date.toISOString().split("T")[0],
      intervals: schedule.intervals.map((interval) => ({
        start: formatIntervalTime(interval.start, timezone),
        end: formatIntervalTime(interval.end, timezone),
      })),
      location_id: schedule.userLocation.locationId,
      user: {
        id: schedule.userLocation.id,
        full_name: getFullName(
          schedule.userLocation.user.firstName,
          schedule.userLocation.user.lastName,
        ),
        first_name: schedule.userLocation.user.firstName,
        last_name: schedule.userLocation.user.lastName,
        phone: schedule.userLocation.user.phone,
        position: schedule.userLocation.user.position,
        is_banned: schedule.userLocation.isBanned,
      },
    };

    return res;
  }
}
