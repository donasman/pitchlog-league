import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';

async function bootstrap(): Promise<void> {
  const app = setupApp(await NestFactory.create(AppModule));

  // Swagger 스펙이 곧 응답 계약이다 (NEXT_STEPS 6장). 별도 문서를 쓰지 않는다
  const doc = new DocumentBuilder()
    .setTitle('PitchLog API')
    .setDescription(
      '유럽 클럽축구 12대회 · 최근 5시즌. 모든 응답은 asOf(데이터 기준 시각)를 포함한다. ' +
      '식별자는 `<apiId>-<slug>` (숫자가 기준, 뒤는 읽기용). 대회시즌의 dataState(NONE/PARTIAL/COMPLETE)로 백필 여부를 안다.',
    )
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc), {
    jsonDocumentUrl: 'docs/openapi.json',
  });

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
