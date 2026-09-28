/**
 * Supabase JWT 검증 Guard — ES256 · issuer = `${SUPABASE_URL}/auth/v1` · audience = 'authenticated'.
 *
 * 시나리오:
 *   - Authorization 헤더 없음 · 'Bearer' 아님 → 401
 *   - jose.jwtVerify 실패 (서명·만료·발급자·수신자) → 401
 *   - payload.role !== 'authenticated' → 401
 *   - 성공 → req.user = { id: sub, email: email ?? null }
 *
 * JWKS 는 `SUPABASE_JWKS` provider 로 주입 (jwks.provider.ts). 테스트는 override 한다.
 */
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { SUPABASE_JWKS } from './jwks.provider.js';

/** req.user 타입 — 컨트롤러 파라미터 데코레이터에서 재사용 */
export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

/** Express Request 확장 — Nest 는 req 객체에 임의 프로퍼티 추가를 허용 */
export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private cachedIssuer: string | null = null;

  constructor(
    @Inject(SUPABASE_JWKS) private readonly jwks: JWTVerifyGetKey,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * `${SUPABASE_URL}/auth/v1` — 마지막 슬래시 유무를 흡수한다.
   *
   * 첫 인증 시도로 미룬다 — SUPABASE_URL 이 없어도 Guard 자체는 인스턴스화되고,
   * 실제 canActivate 때만 값이 필요하다. AuthModule 을 안 쓰는 다른 e2e 가
   * SUPABASE_URL 없이 AppModule 을 띄워도 이 Guard 가 폭발하지 않도록.
   * (env.validation.ts 는 SUPABASE_URL 을 필수로 잡지만 일부 e2e 가 override 함.)
   */
  private get issuer(): string {
    if (this.cachedIssuer === null) {
      const url = this.config.get('SUPABASE_URL', { infer: true });
      this.cachedIssuer = `${url.replace(/\/$/, '')}/auth/v1`;
    }
    return this.cachedIssuer;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearer(req.header('authorization'));
    if (!token) throw new UnauthorizedException('missing_bearer_token');

    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(token, this.jwks, {
        algorithms: ['ES256'],
        issuer: this.issuer,
        audience: 'authenticated',
      });
      payload = verified.payload;
    } catch (cause) {
      // 상세 에러는 서버 로그에만 — 클라이언트에는 원인을 노출하지 않는다
      this.logger.warn(`jwt_verify_failed: ${cause instanceof Error ? cause.message : String(cause)}`);
      throw new UnauthorizedException('invalid_token');
    }

    if (payload.role !== 'authenticated') throw new UnauthorizedException('invalid_role');
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException('missing_subject');
    }

    const email = typeof payload.email === 'string' && payload.email.length > 0 ? payload.email : null;
    req.user = { id: payload.sub, email };
    return true;
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const parts = header.split(' ');
  if (parts.length !== 2) return null;
  if (parts[0] !== 'Bearer') return null;
  const token = parts[1]?.trim() ?? '';
  return token.length > 0 ? token : null;
}
