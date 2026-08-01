import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "minio";
import { BufferedFile } from "./file.model";
import * as crypto from "crypto";

@Injectable()
export class MinioService {
  private readonly minioClient: Client;

  constructor(private config: ConfigService) {
    this.minioClient = new Client({
      endPoint: config.get("MINIO_ENDPOINT") || "localhost",
      port: config.get("MINIO_PORT"),
      useSSL: config.get("MINIO_PORT") === "true",
      accessKey: config.get("MINIO_USER"),
      secretKey: config.get("MINIO_PASSWORD"),
    });
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
    await this.minioClient.removeObject(bucket, fileName);
    return true;
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
          title: "Ошибка загрузки документа",
          detail: "Хранилище недоступно",
          meta: { bucket },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    await this.minioClient.putObject(bucket, fileName, buffer, buffer.length, {
      "Content-Type": mimetype,
    });

    return fileName;
  }

  async getFileStream(bucket: string, fileName: string) {
    return this.minioClient.getObject(bucket, fileName);
  }
}
