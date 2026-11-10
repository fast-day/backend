import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SpecializationDto } from "./dto/specialization/specialization.dto";
import { buildImageUrls } from "src/shared/utils/build-url";

@Injectable()
export class SpecializationService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: SpecializationDto) {
    try {
      return await this.prismaService.specialization.create({
        data: {
          name: dto.name,
          description: dto.description,
          icon: dto.icon,
          industry: {
            create: dto.industryNames.map((name) => ({ name })),
          },
        },
        include: { industry: true },
      });
    } catch (err) {
      console.error("Ошибка при создании Спициализации", err);
      throw new InternalServerErrorException("Ошибка сервера");
    }
  }

  async getAll() {
    const specializations = await this.prismaService.specialization.findMany({
      select: { id: true, name: true, description: true, icon: true },
    });

    return specializations.map((s) => ({
      ...s,
      icon: buildImageUrls(s.icon, "specialization-avatars"),
    }));
  }

  async getIndustry(specializationId: number) {
    if (!specializationId) {
      throw new NotFoundException("Не указан specializationId");
    }

    const industry = await this.prismaService.industry.findMany({
      where: { specializationId },
      select: { id: true, name: true },
    });

    if (industry.length === 0) {
      throw new NotFoundException("Industry не найдена");
    }

    return industry;
  }
}
