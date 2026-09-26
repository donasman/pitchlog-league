/**
 * CacheHeaderInterceptor 단위 스펙 — 경로별 Cache-Control 분기.
 *
 * 계약:
 *   - `/api/live` 로 시작하면 `public, max-age=0, s-maxage=5`
 *   - 그 밖의 `/api/*` 는 `public, max-age=60` (회귀)
 *   - POST 등 비-GET 은 `no-store` (기존 동작 유지)
 *   - `/api/` 밖은 인터셉터가 손대지 않음
 */
import { firstValueFrom, of, type Observable } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { CacheHeaderInterceptor } from './cache-headers.interceptor.js';

type Headers = Record<string, string>;

function makeCtx(opts: { url: string; method?: string; ifNoneMatch?: string }): {
  ctx: ExecutionContext;
  resHeaders: Headers;
  statusRef: { code: number };
} {
  const method = opts.method ?? 'GET';
  const resHeaders: Headers = {};
  const statusRef = { code: 200 };
  const req = {
    url: opts.url,
    method,
    header: (name: string): string | undefined =>
      name.toLowerCase() === 'if-none-match' ? opts.ifNoneMatch : undefined,
  };
  const res = {
    setHeader: (name: string, value: string): void => {
      resHeaders[name] = value;
    },
    status: (code: number) => {
      statusRef.code = code;
      return res;
    },
  };
  const ctx = {
    switchToHttp: () => ({
      getRequest: <T>() => req as unknown as T,
      getResponse: <T>() => res as unknown as T,
    }),
  } as unknown as ExecutionContext;
  return { ctx, resHeaders, statusRef };
}

function makeHandler(body: unknown): CallHandler {
  return {
    handle: (): Observable<unknown> => of(body),
  };
}

describe('CacheHeaderInterceptor', () => {
  const interceptor = new CacheHeaderInterceptor();

  it('GET /api/live 는 Cache-Control: public, max-age=0, s-maxage=5', async () => {
    const { ctx, resHeaders } = makeCtx({ url: '/api/live' });
    await firstValueFrom(interceptor.intercept(ctx, makeHandler({ items: [] })));
    expect(resHeaders['Cache-Control']).toBe('public, max-age=0, s-maxage=5');
    expect(resHeaders['ETag']).toMatch(/^W\/"[A-Za-z0-9+/=]+"$/);
  });

  it('GET /api/matches 는 Cache-Control: public, max-age=60 (회귀)', async () => {
    const { ctx, resHeaders } = makeCtx({ url: '/api/matches?competition=39&season=2026' });
    await firstValueFrom(interceptor.intercept(ctx, makeHandler({ items: [], total: 0 })));
    expect(resHeaders['Cache-Control']).toBe('public, max-age=60');
    expect(resHeaders['ETag']).toMatch(/^W\/"[A-Za-z0-9+/=]+"$/);
  });

  it('POST /api/assistant 는 Cache-Control: no-store (비-GET)', async () => {
    const { ctx, resHeaders } = makeCtx({ url: '/api/assistant', method: 'POST' });
    await firstValueFrom(interceptor.intercept(ctx, makeHandler({ ok: true })));
    expect(resHeaders['Cache-Control']).toBe('no-store');
    // 비-GET 은 ETag 를 붙이지 않는다
    expect(resHeaders['ETag']).toBeUndefined();
  });

  it('/api/ 밖은 인터셉터가 손대지 않는다', async () => {
    const { ctx, resHeaders } = makeCtx({ url: '/health' });
    await firstValueFrom(interceptor.intercept(ctx, makeHandler({ status: 'ok' })));
    expect(resHeaders['Cache-Control']).toBeUndefined();
    expect(resHeaders['ETag']).toBeUndefined();
  });
});
