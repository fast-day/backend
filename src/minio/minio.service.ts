import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "minio";
import { BufferedFile, FileFormat } from "./file.model";
import * as crypto from "crypto";
import { Response } from "express";
import { MIME } from "./constant/mime.constant";
import { pipeline } from "stream/promises";

@Injectable()
export class MinioService {
  private readonly minioClient: Client;

  private readonly logger = new Logger(MinioService.name);

  constructor(private config: ConfigService) {
    this.minioClient = new Client({
      endPoint: config.get("MINIO_ENDPOINT") || "localhost",
      port: config.get("MINIO_PORT"),
      useSSL: config.get("MINIO_PORT") === "true",
      accessKey: config.get("MINIO_USER"),
      secretKey: config.get("MINIO_PASSWORD"),
    });
  }

  async ensureBucket(bucket: string) {
    if (!(await this.minioClient.bucketExists(bucket))) {
      await this.minioClient.makeBucket(bucket);
    }
  }

  async uploadFile(bucket: string, file: BufferedFile, oldFile?: string) {
    if (!(file.mimetype.includes("jpeg") || file.mimetype.includes("png")))
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          title: "Ошибка загрузки изображения",
        },
        HttpStatus.BAD_REQUEST,
      );

    if (oldFile) await this.deleteFile(bucket, oldFile);

    const temp_filename = Date.now().toString();
    const hashedFileName = crypto
      .createHash("md5")
      .update(temp_filename)
      .digest("hex");
    const ext = file.originalname.substring(
      file.originalname.lastIndexOf("."),
      file.originalname.length,
    );
    const metaData = {
      "Content-Type": file.mimetype,
    };
    const filename = hashedFileName + ext;
    const fileName: string = `${filename}`;

    const isExists = await this.minioClient
      .bucketExists(bucket)
      .catch(() => false);

    if (isExists)
      await this.minioClient.putObject(
        bucket,
        filename,
        file.buffer,
        file.buffer.length,
        metaData,
      );

    return fileName;
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
