import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Vercel rewrite 1홉 뒤. 안 켜면 req.ip 가 Vercel edge IP 하나로 묶여
  // 어시스턴트 rate limit (10/분·IP · assistant-rate-limit.guard.ts:27) 이 전 사용자를 하나로 집계한다.
  // 위조 우회는 EC2:3000 직접 호출자에 한해 성립 — docs/DEPLOY.md 알려진 한계 절.
  app.set('trust proxy', 1);
  setupApp(app);

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
