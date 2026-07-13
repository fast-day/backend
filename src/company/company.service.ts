import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UserService } from "src/user/user.service";
import { CreateCompanyDto } from "./dto/create.dto";
import { LocationService } from "src/location/location.service";
import { slugify } from "transliteration";
import { BufferedFile } from "src/minio/file.model";
import { MinioService } from "src/minio/minio.service";
import { buildFileUrl } from "src/shared/utils/build-url";
import { UpdateCompanyDto } from "./dto/update.dto";
import { Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";

@Injectable()
export class CompanyService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly locationService: LocationService,
    private readonly minioService: MinioService,
  ) {}

  private async generatePublicName(slug: string, t: Prisma.TransactionClient) {
    const exist = await t.company.findMany({
      where: { publicName: { startsWith: slug } },
      select: { publicName: true },
    });

    if (exist.length === 0) return slug;

    const taken = new Set(exist.map((c) => c.publicName));
    if (!taken.has(slug)) return slug;

    return `${slug}-${customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6)()}`;
  }

  async create(dto: CreateCompanyDto, userId: string) {
    const user = await this.userService.findById(userId);

    const isExists = await this.prismaService.company.findFirst({
      where: { users: { some: { id: userId } } },
    });

    if (isExists)
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          title: "Повторная попытка создания компании",
          description: "Вы уже создали компанию!",
          details: [
            "Одна компания может существовать только единожды в вашем профиле.",
            "Изменить данные существующей компании можно в соответствующем разделе",
          ],
          recommendations: [
            "Если возникли трудности, обратитесь в службу поддержки.",
          ],
        },
        HttpStatus.CONFLICT,
        { cause: new Error() },
      );

    const slug = slugify(dto.name, { lowercase: true, separator: "-" });

    const company = await this.prismaService.$transaction(async (t) => {
      const publicName = await this.generatePublicName(slug, t);
      const company = await t.company.create({
        data: {
          name: dto.name,
          publicName,
          currency: dto.currency,
          users: { connect: { id: user.id } },
        },
        select: {
          id: true,
          name: true,
          currency: true,
        },
      });

      const locationData = {
        ...dto,
        name: "Основная",
        phone: user.phone,
      };

      await this.locationService.createFirst(
        t,
        locationData,
        userId,
        user.role_id.id,
        company.id,
      );

      return company;
    });

    return company;
  }

  async findById(id: string) {
    const company = await this.prismaService.company.findUnique({
      where: { id },
    });

    if (!company) throw new NotFoundException("Компания не найдена");

    return company;
  }

  async uploadLogo(image: BufferedFile, companyId: string) {
    const { logo } = await this.findById(companyId);
    const upload = await this.minioService.uploadFile(
      "company-avatars",
      image,
      logo || undefined,
    );

    const key = `company-avatars/${upload}`;

    await this.prismaService.company.update({
      where: { id: companyId },
      data: { logo: key },
    });
    return { success: true, avatar: buildFileUrl(key) };
  }

  async update(companyId: string, dto: UpdateCompanyDto) {
    const { id } = await this.findById(companyId);

    const { name, currency } = dto;

    const company = await this.prismaService.company.update({
      where: { id },
      data: {
        name,
        currency,
        /**
          =====!! ДОБАВИТЬ СМЕНУ ПУБЛИЧНОГО ИМЕНИ !!=====
        **/
        // publicName: slugify(name, { lowercase: true, separator: "-" }),
      },
      select: {
        id: true,
        name: true,
        publicName: true,
        logo: true,
        currency: true,
      },
    });

    return {
      id: company.id,
      name: company.name,
      logo: buildFileUrl(company.logo),
      site_url: `http://app.fast-day.ru/${company.publicName}`,
      currency: company.currency,
    };
  }
}
