import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ["1"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // СВАГА //
  const confSwagger = new DocumentBuilder()
    .setTitle("API")
    .setDescription("")
    .setVersion("1.0")
    .addBearerAuth()
    .addServer("http://api.fast-day.ru")
    .build();
  const document = SwaggerModule.createDocument(app, confSwagger);
  SwaggerModule.setup("docs", app, document);

  app.enableCors({
    origin: config.getOrThrow<string>("ALLOWED_ORIGINS").split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposedHeaders: ["Content-Type", "Authorization", "Accept"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.listen(process.env.PORT ?? 8080);
}

void bootstrap();
