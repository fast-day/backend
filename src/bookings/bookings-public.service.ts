import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { GetPublicBookingDto } from "./dto/public/employee-query.dto";
import { buildFileUrl } from "src/shared/utils/build-url";
import { getFullName } from "src/shared/utils/get-full-name.util";

@Injectable()
export class BookingsPublicService {
  constructor(private readonly prismaService: PrismaService) {}

  private async company(publicName: string, locationId: string) {
    const isExist = await this.prismaService.company.findFirst({
      where: {
        publicName: publicName,
        locations: { some: { id: locationId } },
      },
      select: {
        logo: true,
        currency: true,
      },
    });

    if (!isExist)
      throw new HttpException(
        {
          title: "Компания не найдена",
          description: "Не удалось найти компанию или компания не существует",
          detail: { public_name: publicName },
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    return isExist;
  }

  private async employee(userId: string, locationId: string) {
    const employee = await this.prismaService.userLocation.findUnique({
      where: { userId_locationId: { userId, locationId } },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            position: true,
            avatar: true,
          },
        },
      },
    });

    if (!employee)
      throw new HttpException(
        {
          title: "Сотрудник не найден",
          description: "Не удалось найти сотрудника",
          detail: { employee_id: userId },
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );

    return {
      id: employee.id,
      profile: {
        id: employee.userId,
        first_name: employee.user.firstName,
        last_name: employee.user.lastName,
        full_name: getFullName(employee.user.firstName, employee.user.lastName),
        phone: employee.user.phone,
        position: employee.user.position,
        avatar: buildFileUrl(employee.user.avatar),
      },
    };
  }

  async getEmployee(publicName: string, query: GetPublicBookingDto) {
    const { user_id, location_id } = query;

    const company = await this.company(publicName, location_id);
    const employee = await this.employee(user_id, location_id);

    return { company, employee };
  }
}
