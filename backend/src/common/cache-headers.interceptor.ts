/**
 * 전역 응답 캐시 헤더 인터셉터 — `/api/*` 만 처리한다.
 *
 * 계약:
 *   - 응답 body 를 JSON.stringify 해 SHA-256 (base64 27자) 로 weak ETag 계산
 *   - ETag · Cache-Control: public, max-age=60 헤더 부착
 *   - If-None-Match 가 같은 값이면 body 없이 304 로 종결 (return undefined → rxjs 파이프 종결, Nest 는 undefined body 를 안 씀)
 *   - `/health` 는 `/api` 접두사 밖이라 자연 통과 (조건에서 제외)
 *
 * asOf 는 서비스 DTO 에 이미 포함돼 있어 시각 정보는 body 로 흐른다.
 * 캐시가 60초라 조회 응답 신선도(백필/실시간과 무관한 정적 카탈로그)와 맞다.
 */
import { createHash } from 'node:crypto';
import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';

@Injectable()
export class CacheHeaderInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    // `/api/*` 만 대상 — `/health` 는 자연 통과 (헤더 붙지 않음)
    if (!req.url.startsWith('/api/')) return next.handle();

    const res = ctx.switchToHttp().getResponse<Response>();

    // `/api/me/*` 는 사용자별 응답 — 어떤 캐시(브라우저·CDN·엣지)에도 넣지 않는다.
    // Authorization 헤더가 요청마다 다르므로 Vary: Authorization 을 명시해 혹시라도
    // 중간 캐시가 무시하면 안 되는 축을 알린다 (google-login 3판).
    const isMe = req.url.startsWith('/api/me/');

    // POST 등 비-GET 은 캐시하지 않는다. Vercel 엣지가 Cache-Control: public 을 보고
    // POST /api/assistant 응답을 60초 캐시 → 같은 URL 로 오는 다른 질문에 첫 답 재사용
    // (2026-09-15 실측 · `x-vercel-cache: HIT` · 19ms · 같은 ETag). no-store 로 엣지 캐시 차단.
    if (req.method !== 'GET') {
      if (isMe) {
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('Vary', 'Authorization');
      } else {
        res.setHeader('Cache-Control', 'no-store');
      }
      return next.handle();
    }

    // GET /api/me/* — ETag/If-None-Match 로직을 건너뛴다 (개인 응답 · 캐시 금지).
    if (isMe) {
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Vary', 'Authorization');
      return next.handle();
    }

    return next.handle().pipe(
      map((body: unknown) => {
        const json = JSON.stringify(body);
        const etag = 'W/"' + createHash('sha256').update(json).digest('base64').slice(0, 27) + '"';
        res.setHeader('ETag', etag);
        const isLive = req.url.startsWith('/api/live');
        res.setHeader(
          'Cache-Control',
          isLive ? 'public, max-age=0, s-maxage=5' : 'public, max-age=60',
        );
        const ifNone = req.header('if-none-match');
        if (ifNone && ifNone === etag) {
          // 304 는 body 를 보내지 않는다. Express send() 가 statusCode 304 면
          // Content-Type · Content-Length 를 자동으로 제거하고 body 를 무시한다 —
          // 직접 res.end() 를 호출하면 그 다음 Nest reply(res.send) 가 헤더 제거를 시도해 ERR_HTTP_HEADERS_SENT.
          res.status(304);
          return undefined;
        }
        return body;
      }),
    );
  }
}
