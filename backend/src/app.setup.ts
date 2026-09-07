/**
 * main.ts 와 e2e 가 같은 앱 설정을 쓴다 — 테스트가 실제 라우팅(/api 접두사)·검증 파이프와 어긋나지 않게.
 */
import { ValidationPipe, type INestApplication } from '@nestjs/common';

export function setupApp(app: INestApplication): INestApplication {
  // 조회 API 는 /api 아래. /health 는 인프라 감시용이라 접두사 없이 둔다
  app.setGlobalPrefix('api', { exclude: ['health'] });
  // 모든 입력은 ValidationPipe 를 통과한다 (BACKEND_GUIDE)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO 에 없는 필드는 버린다
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  return app;
}
