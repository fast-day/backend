import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { BookingsPublicService } from "./bookings-public.service";
import { GetPublicBookingDto } from "./dto/public/employee-query.dto";

@ApiTags("Публичная запись")
@Controller()
export class BookingsPublicController {
  constructor(private readonly bookingService: BookingsPublicService) {}

  @ApiOperation({
    summary: "",
  })
  @Get("booking/widgets/:public_name")
  @HttpCode(HttpStatus.OK)
  getEmployee(
    @Param("public_name") publicName: string,
    @Query() query: GetPublicBookingDto,
  ) {
    return this.bookingService.getEmployee(publicName, query);
  }
}
