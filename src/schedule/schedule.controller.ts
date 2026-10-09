import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ScheduleService } from "./schedule.service";
import {
  BulkDayOffDto,
  BulkScheduleDto,
  ScheduleDto,
} from "./dto/schedule.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger/dist/decorators";
import { Scopes } from "src/access/decorator/scopes.decorator";
import { LoadUserGuard } from "src/user/guard/user.guard";
import { LocationGuard } from "src/access/guard/location.guard";
import { ScopeGuard } from "src/access/guard/scope.guard";
import { AuthGuard } from "src/auth/guard/auth.guard";
import { ScheduleIdsDto } from "./dto/schedule-ids.dto";
import {
  BulkDayOffResponseDto,
  BulkScheduleResponseDto,
  CreateScheduleResponseDto,
  ScheduleDetailResponseDto,
  ScheduleResponseDto,
} from "./dto/schedule-response.dto";
import { UnAuthorizedDto } from "src/shared/dto/errors.dto";
import { GlobalSuccessDto } from "src/shared/dto/global.dto";

@ApiTags("Расписание")
@Controller("schedule")
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: "Создание расписания для сотрудника" })
  @ApiParam({
    name: "location_id",
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
  })
  @ApiBody({ type: ScheduleDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Расписание успешно создано",
    type: CreateScheduleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Post("/:location_id")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, ScopeGuard)
  @Scopes("schedule:create")
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: ScheduleDto, @Param("location_id") locationId: string) {
    return this.scheduleService.create(dto, locationId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Массовое создание расписания для сотрудника",
    description: "Расписание на переданные даты заменяется новым",
  })
  @ApiParam({
    name: "location_id",
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
  })
  @ApiBody({ type: BulkScheduleDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Расписание успешно создано",
    type: BulkScheduleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Некорректные даты или интервалы",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Post("/:location_id/bulk")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, ScopeGuard)
  @Scopes("schedule:create")
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(
    @Body() dto: BulkScheduleDto,
    @Param("location_id") locationId: string,
  ) {
    return this.scheduleService.bulkCreate(dto, locationId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Массовое назначение выходных дней сотруднику",
    description:
      "Расписание на переданные даты удаляется, дни становятся выходными",
  })
  @ApiParam({
    name: "location_id",
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
  })
  @ApiBody({ type: BulkDayOffDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Выходные успешно назначены",
    type: BulkDayOffResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Некорректные даты",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Post("/:location_id/bulk/day-off")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, ScopeGuard)
  @Scopes("schedule:delete")
  @HttpCode(HttpStatus.OK)
  bulkDayOff(
    @Body() dto: BulkDayOffDto,
    @Param("location_id") locationId: string,
  ) {
    return this.scheduleService.bulkDayOff(dto, locationId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Получение всего расписания сотрудника в локации" })
  @ApiParam({
    name: "user_id",
    example: "89e1ff87-f273-47a4-ab34-a90c716c59f0",
    description: "ID сотрудника",
  })
  @ApiParam({
    name: "location_id",
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Список расписаний",
    type: ScheduleResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("/:user_id/:location_id")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, ScopeGuard)
  @Scopes("schedule:all")
  @HttpCode(HttpStatus.OK)
  findAll(
    @Param("user_id") userId: string,
    @Param("location_id") locationId: string,
    @Query("month") month?: string,
    @Query("year") year?: string,
  ) {
    return this.scheduleService.findAll(userId, locationId, month, year);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Получение детального расписания сотрудника по ID" })
  @ApiParam({
    name: "location_id",
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
  })
  @ApiBody({ type: ScheduleIdsDto })
  @ApiResponse({
    status: 200,
    description: "Детальная информация о расписании",
    type: ScheduleDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Get("/:location_id")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, ScopeGuard)
  @Scopes("schedule:first")
  @HttpCode(HttpStatus.OK)
  findById(
    @Param("location_id") location_id: string,
    @Body() dto: ScheduleIdsDto,
  ) {
    const { user_id, schedule_id } = dto;
    return this.scheduleService.findById(user_id, schedule_id, location_id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Редактирование расписания" })
  @ApiParam({
    name: "location_id",
    example: "a8f4ff39-f908-472e-bf19-259b557c952a",
    description: "ID локации",
  })
  @ApiParam({ name: "schedule_id", example: "1", description: "ID расписания" })
  @ApiBody({ type: ScheduleDto })
  @ApiResponse({
    status: 200,
    description: "Расписание успешно обновлено",
    type: CreateScheduleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Patch("/:location_id/schedule/:schedule_id")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, ScopeGuard)
  @Scopes("schedule:update")
  @HttpCode(HttpStatus.OK)
  update(
    @Body() dto: ScheduleDto,
    @Param("location_id") location_id: string,
    @Param("schedule_id") schedule_id: string,
  ) {
    return this.scheduleService.update(dto, location_id, Number(schedule_id));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Удаление расписания" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "success",
    type: GlobalSuccessDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "not found",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "unauthorized",
    type: UnAuthorizedDto,
  })
  @Delete("/:location_id")
  @UseGuards(AuthGuard, LoadUserGuard, LocationGuard, ScopeGuard)
  @Scopes("schedule:delete")
  @HttpCode(HttpStatus.OK)
  delete(
    @Param("location_id") location_id: string,
    @Body() dto: ScheduleIdsDto,
  ) {
    const { user_id, schedule_id } = dto;
    return this.scheduleService.delete(user_id, schedule_id, location_id);
  }
}
