import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "minio";
import { BufferedFile, FileFormat } from "./file.model";
import * as crypto from "crypto";
import { Response } from "express";
import { MIME } from "./constant/mime.constant";
import { pipeline } from "stream/promises";
import sharp from "sharp";
import convert from "heic-convert";
import { SIZES } from "src/shared/constant/image-size.constant";
import { BUCKETS } from "./constant/bucket.constant";

export type ImageSize = keyof typeof SIZES;

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly minioClient: Client;

  private readonly logger = new Logger(MinioService.name);

  private ALLOWED = /^image\/(jpe?g|png|webp|heic|heif)$/i;
  private isHeic = (f: BufferedFile) =>
    /hei[cf]/i.test(f.mimetype) || /\.hei[cf]$/i.test(f.originalname);

  private async toWebpVariants(file: BufferedFile) {
    let input = file.buffer;
    if (this.isHeic(file)) {
      input = Buffer.from(
        await convert({ buffer: input, format: "JPEG", quality: 0.9 }),
      );
    }
    const base = sharp(input).rotate();

    return Promise.all(
      (Object.entries(SIZES) as [ImageSize, number][]).map(
        async ([size, width]) =>
          [
            size,
            await base
              .clone()
              .resize({ width, withoutEnlargement: true })
              .webp({ quality: size === "thumb" ? 70 : 80 })
              .toBuffer(),
          ] as const,
      ),
    );
  }

  constructor(private config: ConfigService) {
    this.minioClient = new Client({
      endPoint: config.get("MINIO_ENDPOINT") || "localhost",
      port: Number(config.get("MINIO_PORT")),
      useSSL: config.get("MINIO_USE_SSL") === "true",
      accessKey: config.get("MINIO_USER"),
      secretKey: config.get("MINIO_PASSWORD"),
    });
  }

  async onModuleInit() {
    for (const bucket of Object.values(BUCKETS)) {
      await this.ensureBucket(bucket, true);
    }
  }

  async ensureBucket(bucket: string, isPublic = false) {
    if (!(await this.minioClient.bucketExists(bucket))) {
      await this.minioClient.makeBucket(bucket);
    }
    if (isPublic) {
      await this.minioClient.setBucketPolicy(
        bucket,
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        }),
      );
    }
  }

  async uploadFile(bucket: string, file: BufferedFile, oldFile?: string) {
    if (!this.ALLOWED.test(file.mimetype) && !this.isHeic(file))
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка загрузки изображения",
        },
        HttpStatus.BAD_REQUEST,
      );

    const variants = await this.toWebpVariants(file).catch(() => {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Не удалось обработать изображение",
        },
        HttpStatus.BAD_REQUEST,
      );
    });

    const id = crypto.randomUUID();

    await Promise.all(
      variants.map(([size, buf]) =>
        this.minioClient.putObject(
          bucket,
          `${id}-${size}.webp`,
          buf,
          buf.length,
          {
            "Content-Type": "image/webp",
          },
        ),
      ),
    );

    if (oldFile) await this.deleteFile(bucket, oldFile);

    return id;
  }

  async getFileUrl(bucket: string, fileName: string) {
    return await this.minioClient.presignedUrl("GET", bucket, fileName);
  }

  async deleteFile(bucket: string, fileName: string) {
    return await this.minioClient.removeObject(bucket, fileName);
  }

  async uploadDocument(
    bucket: string,
    buffer: Buffer,
    fileName: string,
    mimetype: string,
  ) {
    const isExists = await this.minioClient
      .bucketExists(bucket)
      .catch(() => false);

    if (!isExists)
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          title: "Неудалось загрузить файл",
          detail: "Хранилище недоступно",
          meta: { bucket },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    await this.minioClient.putObject(bucket, fileName, buffer, buffer.length, {
      "Content-Type": mimetype,
    });

    return `${bucket}/${fileName}`;
  }

  async getFileStream(bucket: string, fileName: string) {
    try {
      return await this.minioClient.getObject(bucket, fileName);
    } catch {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          title: "Файл не найден",
          detail: "Документ отсутствует в базе",
          meta: { bucket, file_name: fileName },
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async download(
    bucket: string,
    fileName: string,
    file: { name: string; format: FileFormat },
    res: Response,
    disposition: "attachment" | "inline" = "attachment",
  ) {
    const stream = await this.getFileStream(bucket, fileName);
    const fullName = `${file.name}.${file.format}`;

    res.set({
      "Content-Type":
        MIME[file.format.toLowerCase()] ?? "application/octet-stream",
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(fullName)}`,
    });

    try {
      await pipeline(stream, res);
    } catch (e: any) {
      if (e?.code === "ERR_STREAM_PREMATURE_CLOSE") return;

      this.logger.error(`Download file failed: ${e.message}`, {
        bucket,
        file_name: fileName,
      });

      if (!res.headersSent) {
        res.removeHeader("Content-Disposition");
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          title: "Ошибка при отправке файла",
          detail: "Не удалось передать документ",
        });
      } else {
        res.destroy();
      }
    }
  }
}
