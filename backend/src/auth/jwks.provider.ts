/**
 * Supabase JWKS provider — DI 토큰 `SUPABASE_JWKS`.
 *
 * `jose.createRemoteJWKSet` 은 URL 을 받아 keyset lookup 함수 (JWTVerifyGetKey) 를 반환한다.
 * jose 는 알아서 캐시하고 5분마다 재검증하므로 우리 층에서 캐시 관리하지 않는다.
 *
 * URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
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
    const supabaseUrl = config.get('SUPABASE_URL', { infer: true });
    const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    return createRemoteJWKSet(jwksUrl);
  },
};
