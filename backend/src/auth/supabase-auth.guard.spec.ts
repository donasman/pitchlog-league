/**
 * SupabaseAuthGuard 단위 스펙 — DB · 네트워크 없음.
 *
 * 자체 ES256 키페어로 서명한 JWT 를 만들고 `createLocalJWKSet` 로 검증한다.
 * NestJS Testing 대신 직접 인스턴스를 만든다 (Guard 는 순수 함수 조합).
 *
 * 7 케이스:
 *   1. Authorization 헤더 없음 → 401
 *   2. 'Basic xxx' → 401
 *   3. 만료 토큰 → 401
 *   4. 잘못된 issuer → 401
 *   5. 잘못된 audience → 401
 *   6. role !== 'authenticated' → 401
 *   7. 정상 → req.user.id 설정
 */
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import type { GenerateKeyPairResult, JWTVerifyGetKey } from 'jose';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';

type PrivateKeyType = GenerateKeyPairResult['privateKey'];
import { SupabaseAuthGuard, type RequestWithUser } from './supabase-auth.guard.js';

const SUPABASE_URL = 'https://test-project.supabase.co';
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const AUDIENCE = 'authenticated';
const KID = 'test-key-1';

/** 테스트 유틸: 헤더가 담긴 ExecutionContext 를 만든다. req.user 는 사후 검사용으로 노출한다. */
function makeCtx(authorization?: string): { ctx: ExecutionContext; req: RequestWithUser } {
  const req = {
    header: (name: string): string | undefined =>
      name.toLowerCase() === 'authorization' ? authorization : undefined,
  } as unknown as RequestWithUser;
  const ctx = {
    switchToHttp: () => ({
      getRequest: <T>() => req as unknown as T,
      getResponse: <T>() => ({}) as unknown as T,
    }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

/** ConfigService 모조 — SUPABASE_URL 만 필요. */
function makeConfig(): ConfigService {
  return {
    get: (key: string) => {
      if (key === 'SUPABASE_URL') return SUPABASE_URL;
      return undefined;
    },
  } as unknown as ConfigService;
}

interface TokenOptions {
  issuer?: string;
  audience?: string;
  role?: string;
  sub?: string;
  email?: string;
  expiresIn?: string;
  issuedAt?: number;
}

describe('SupabaseAuthGuard', () => {
  let privateKey: PrivateKeyType;
  let jwks: JWTVerifyGetKey;

  beforeAll(async () => {
    // ES256 keypair · publicJwk 를 JWKS 하나짜리로 감싼다
    const kp = await generateKeyPair('ES256');
    privateKey = kp.privateKey;
    const publicJwk = await exportJWK(kp.publicKey);
    publicJwk.kid = KID;
    publicJwk.alg = 'ES256';
    publicJwk.use = 'sig';
    jwks = createLocalJWKSet({ keys: [publicJwk] });
  });

  async function sign(opts: TokenOptions = {}): Promise<string> {
    const issuer = opts.issuer ?? ISSUER;
    const audience = opts.audience ?? AUDIENCE;
    const role = opts.role ?? 'authenticated';
    const sub = opts.sub ?? '11111111-1111-1111-1111-111111111111';
    const email = opts.email ?? 'user@example.com';
    const expiresIn = opts.expiresIn ?? '1h';

    let builder = new SignJWT({ role, email })
      .setProtectedHeader({ alg: 'ES256', kid: KID })
      .setSubject(sub)
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(expiresIn);
    if (opts.issuedAt !== undefined) builder = builder.setIssuedAt(opts.issuedAt);
    return builder.sign(privateKey);
  }

  function makeGuard(): SupabaseAuthGuard {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new SupabaseAuthGuard(jwks, makeConfig() as any);
  }

  it('1. Authorization 헤더 없음 → 401', async () => {
    const guard = makeGuard();
    const { ctx } = makeCtx(undefined);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("2. 'Basic xxx' → 401", async () => {
    const guard = makeGuard();
    const { ctx } = makeCtx('Basic dXNlcjpwYXNz');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('3. 만료 토큰 → 401', async () => {
    const guard = makeGuard();
    // 1시간 전에 발급 · 30분 전 만료
    const nowSec = Math.floor(Date.now() / 1000);
    const token = await sign({ issuedAt: nowSec - 3600, expiresIn: `${nowSec - 1800}s` });
    // expiresIn 문자열이 절대초로 해석되지 않도록 직접 초 지정
    const expired = await new SignJWT({ role: 'authenticated', email: 'a@b' })
      .setProtectedHeader({ alg: 'ES256', kid: KID })
      .setSubject('11111111-1111-1111-1111-111111111111')
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(nowSec - 3600)
      .setExpirationTime(nowSec - 1800)
      .sign(privateKey);
    // 위에서 만든 token 은 안 쓰지만 sign() 경로 회귀도 겸함
    expect(token).toBeTypeOf('string');
    const { ctx } = makeCtx(`Bearer ${expired}`);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('4. 잘못된 issuer → 401', async () => {
    const guard = makeGuard();
    const token = await sign({ issuer: 'https://evil.example.com/auth/v1' });
    const { ctx } = makeCtx(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('5. 잘못된 audience → 401', async () => {
    const guard = makeGuard();
    const token = await sign({ audience: 'anon' });
    const { ctx } = makeCtx(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("6. role !== 'authenticated' → 401", async () => {
    const guard = makeGuard();
    const token = await sign({ role: 'anon' });
    const { ctx } = makeCtx(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('7. 정상 → req.user 에 { id, email } 세팅', async () => {
    const guard = makeGuard();
    const sub = '22222222-2222-2222-2222-222222222222';
    const email = 'ok@example.com';
    const token = await sign({ sub, email });
    const { ctx, req } = makeCtx(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ id: sub, email });
  });
});
