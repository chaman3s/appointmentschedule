import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  console.log("🚀 Starting app...");
  const app = await NestFactory.create(AppModule);
  console.log("✅ App created");

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  console.log("📡 Before listen");

  await app.listen(3000, '0.0.0.0');

  console.log("🔥 Listening on 3000");
}

bootstrap();
