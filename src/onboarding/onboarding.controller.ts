import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { CompanyGuard } from "src/access/guard/company.guard";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { SurveyDto } from "./dto/survey.dto";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post("survey")
  @UseGuards(AuthGuard, LoadUserGuard, CompanyGuard)
  @HttpCode(HttpStatus.CREATED)
  sendSurvey(@Body() dto: SurveyDto, @Req() req) {
    const companyId = req.user.companyId;
    return this.onboardingService.sendSurvey(dto, companyId);
  }
}
