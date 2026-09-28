/**
 * Supabase JWKS provider — DI 토큰 `SUPABASE_JWKS`.
 *
 * `jose.createRemoteJWKSet` 은 URL 을 받아 keyset lookup 함수 (JWTVerifyGetKey) 를 반환한다.
 * jose 는 알아서 캐시하고 5분마다 재검증하므로 우리 층에서 캐시 관리하지 않는다.
 *
 * URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
 *
 * URL 구성을 첫 호출로 미룬다 — SUPABASE_URL 이 없어도 부팅은 되고, 실제 인증을 시도할 때만
 * 실패한다. AuthModule 을 쓰지 않는 다른 e2e 가 SUPABASE_URL 없이 AppModule 을 띄워도
 * 이 팩토리가 폭발하지 않도록.
 *
 * 테스트는 이 provider 를 `overrideProvider(SUPABASE_JWKS).useValue(localJwks)` 로 갈아 끼운다 —
 * `jose.createLocalJWKSet` 이 반환하는 함수도 동일 시그니처.
 */
import { ConfigService } from '@nestjs/config';
import type { Provider } from '@nestjs/common';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import type { EnvironmentVariables } from '../config/env.validation.js';

/** DI 토큰. string 이 아닌 Symbol 로 잡음을 줄인다. */
export const SUPABASE_JWKS = Symbol('SUPABASE_JWKS');

export const supabaseJwksProvider: Provider = {
  provide: SUPABASE_JWKS,
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvironmentVariables, true>): JWTVerifyGetKey => {
    let cached: JWTVerifyGetKey | null = null;
    return async (protectedHeader, token) => {
      if (!cached) {
        const supabaseUrl = config.get('SUPABASE_URL', { infer: true });
        cached = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
      }
      return cached(protectedHeader, token);
    };
  },
};
