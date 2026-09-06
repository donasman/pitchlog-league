import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // 모든 입력은 ValidationPipe 를 통과한다 (BACKEND_GUIDE)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // DTO 에 없는 필드는 버린다
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger 스펙이 곧 응답 계약이다 (NEXT_STEPS 6장). 별도 문서를 쓰지 않는다
  const doc = new DocumentBuilder()
    .setTitle('PitchLog API')
    .setDescription('유럽 클럽축구 12대회 · 최근 5시즌. 모든 응답은 asOf(데이터 기준 시각)를 포함한다.')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc), {
    jsonDocumentUrl: 'docs/openapi.json',
  });

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
