import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { MinioService } from "src/minio/minio.service";
import * as QRCode from "qrcode";
import { createHash } from "crypto";
import { Response } from "express";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class QrService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  private readonly bucket = "qrcode";
  private logo: Buffer | undefined;

  // async onModuleInit() {
  //   const raw = await readFile("assets/logo/logo.png");
  //   this.logo = await sharp()
  //     .resize(84, 84, { fit: "contain", background: "#FFF" })
  //     .extend({ top: 10, bottom: 10, left: 10, right: 10, background: "#FFF" })
  //     .png()
  //     .toBuffer();
  // }

  async generate(data: string) {
    const qr = await QRCode.toBuffer(data, {
      width: 512,
      margin: 2,
      color: { dark: "#000000", light: "#0000" },
      errorCorrectionLevel: "H",
    });
    const key = createHash("sha1").update(data).digest("hex");

    // const buffer = await sharp(qr)
    //   .composite([{ input: this.logo, gravity: "center" }])
    //   .png()
    //   .toBuffer();

    return await this.minio.uploadDocument(this.bucket, qr, key, "image/png");
  }

  async download(companyId: string, res: Response) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { publicName: true, widgetQrCode: true },
    });

    if (!company?.widgetQrCode)
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Файл не найден",
          detail: "Похоже файла не существует",
        },
        HttpStatus.NOT_FOUND,
      );

    const [bucket, fileName] = company.widgetQrCode.split("/");

    await this.minio.download(
      bucket,
      fileName,
      { name: `qr-online-zapis-${company.publicName}`, format: "png" },
      res,
      "attachment",
    );
  }
}
