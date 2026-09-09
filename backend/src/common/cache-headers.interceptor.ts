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
    return next.handle().pipe(
      map((body: unknown) => {
        const json = JSON.stringify(body);
        const etag = 'W/"' + createHash('sha256').update(json).digest('base64').slice(0, 27) + '"';
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'public, max-age=60');
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
