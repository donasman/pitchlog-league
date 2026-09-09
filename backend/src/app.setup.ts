/**
 * main.ts 와 e2e 가 같은 앱 설정을 쓴다 — 테스트가 실제 라우팅(/api 접두사)·검증 파이프와 어긋나지 않게.
 */
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { CacheHeaderInterceptor } from './common/cache-headers.interceptor.js';

/**
 * 허용 출처 목록. 쉼표로 여러 개. 비어 있으면 CORS 를 켜지 않는다 —
 * 브라우저가 아닌 호출(e2e·curl)은 CORS 와 무관하므로 기본값을 열어둘 이유가 없다.
 */
function corsOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function setupApp(app: INestApplication): INestApplication {
  // 조회 API 는 /api 아래. /health 는 인프라 감시용이라 접두사 없이 둔다
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // 프론트는 다른 출처(Vite 5173 · Cloudflare Pages)에서 뜬다. 목록에 있는 출처만 허용한다
  const origins = corsOrigins();
  if (origins.length > 0) {
    app.enableCors({ origin: origins, methods: ['GET'], maxAge: 600 });
  }
  // 모든 입력은 ValidationPipe 를 통과한다 (BACKEND_GUIDE)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO 에 없는 필드는 버린다
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  // 조회 응답에 ETag · Cache-Control 60s. `/api/*` 만 대상 (`/health` 자연 제외)
  app.useGlobalInterceptors(new CacheHeaderInterceptor());
  return app;
}
