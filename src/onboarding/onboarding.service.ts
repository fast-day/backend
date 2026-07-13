import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { SurveyDto } from "./dto/survey.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class OnboardingService {
  constructor(private readonly prismaService: PrismaService) {}

  async sendSurvey(dto: SurveyDto, companyId: string) {
    const isExists = await this.prismaService.onboardingSurvey.findUnique({
      where: { companyId },
    });

    if (isExists)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Не удалось пройти опрос",
          detail: "Вы ранее уже оставляли свой ответ.",
          meta: { company_id: companyId },
        },
        HttpStatus.BAD_REQUEST,
      );

    await this.prismaService.onboardingSurvey.create({
      data: {
        companyId,
        clientsRange: dto.clients_range,
        mainGoal: dto.main_goal,
        source: dto.source,
      },
    });
    return { success: true };
  }
}
