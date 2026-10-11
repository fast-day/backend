import { Body, Controller, Post } from "@nestjs/common";
import { QrService } from "./qr.service";
import { ApiExcludeEndpoint } from "@nestjs/swagger";

@Controller("qr")
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @ApiExcludeEndpoint(true)
  @Post()
  create(@Body("data") data: string) {
    return this.qrService.generate(data);
  }
}
