/**
 * GET/PUT /api/me/favorites e2e — google-login 3판.
 *
 * SUPABASE_JWKS provider 를 로컬 JWKS 로 override 하고, 같은 ES256 개인키로 서명한 토큰을 붙인다.
 * 실제 Supabase 네트워크 호출 없음. 원격 DB 가드는 l1.e2e-spec.ts 규약 그대로.
 *
 * 케이스:
 *   1. GET (즐겨찾기 없음) → asOf · items===[]
 *   2. PUT 3개 → items.length===3 · position 0/1/2
 *   3. GET 반영 → PUT 결과와 같음
 *   4. PUT 상한 초과 (11개) → 400 favorites_limit_exceeded
 *   5. PUT 없는 ref → 400 favorites_unknown_team + details 원문
 *   6. PUT 중복 apiId → 400 favorites_duplicate
 *   7. PUT 트랜잭션 — 실패 후 GET 이 이전 상태를 유지
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import type { GenerateKeyPairResult, JWTVerifyGetKey } from 'jose';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SUPABASE_JWKS } from '../src/auth/jwks.provider.js';

type PrivateKeyType = GenerateKeyPairResult['privateKey'];

/** 이 스펙 전용 유저 UUID — afterAll 이 이 목록으로 즐겨찾기를 지운다 */
const USER_A = '00000000-0000-0000-0000-999000000001';
const USER_B = '00000000-0000-0000-0000-999000000002';
const TEST_USER_IDS = [USER_A, USER_B];

const ISSUER_HOST = process.env.SUPABASE_URL ?? 'https://test-project.supabase.co';
const KID = 'user-favorites-e2e-kid';

describe('GET/PUT /api/me/favorites (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let privateKey: PrivateKeyType;
  let ref33: string; // Manchester United (apiId 33)
  let ref40: string; // Liverpool (apiId 40)
  let ref42: string; // Arsenal (apiId 42)

  async function sign(userId: string): Promise<string> {
    return new SignJWT({ role: 'authenticated', email: `${userId}@example.com` })
      .setProtectedHeader({ alg: 'ES256', kid: KID })
      .setSubject(userId)
      .setIssuer(`${ISSUER_HOST.replace(/\/$/, '')}/auth/v1`)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(privateKey);
  }

  beforeAll(async () => {
    // 원격 DB 가드 — l1.e2e-spec.ts:76-81 와 같은 규칙
    const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    if (!local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1') {
      throw new Error(
        `user-favorites e2e 는 실제 DB 를 쓰므로 원격 DB(${host})에서는 돌리지 않는다 — 로컬 Postgres 를 쓰거나 E2E_ALLOW_REMOTE_DB=1`,
      );
    }

    // 자체 ES256 keypair → 로컬 JWKS → SUPABASE_JWKS provider 갈아 끼움
    const kp = await generateKeyPair('ES256');
    privateKey = kp.privateKey;
    const publicJwk = await exportJWK(kp.publicKey);
    publicJwk.kid = KID;
    publicJwk.alg = 'ES256';
    publicJwk.use = 'sig';
    const localJwks: JWTVerifyGetKey = createLocalJWKSet({ keys: [publicJwk] });

    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_JWKS)
      .useValue(localJwks)
      .compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);

    // 사전 세션 데이터 정리
    await prisma.userFavoriteTeam.deleteMany({ where: { userId: { in: TEST_USER_IDS } } });

    // 팀 3개 실측 (l0 이 이미 넣어 둔 EPL 상수). 없으면 스킵 이유를 알리고 실패.
    const t33 = await prisma.team.findFirst({ where: { apiTeamId: 33 } });
    const t40 = await prisma.team.findFirst({ where: { apiTeamId: 40 } });
    const t42 = await prisma.team.findFirst({ where: { apiTeamId: 42 } });
    if (!t33 || !t40 || !t42) {
      throw new Error(
        'user-favorites e2e 는 apiTeamId 33·40·42 (Manchester United·Liverpool·Arsenal) 팀 데이터가 필요하다. L0 을 먼저 돌리거나 시드해 두어야 한다.',
      );
    }
    ref33 = `${t33.apiTeamId}-${t33.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    ref40 = `${t40.apiTeamId}-${t40.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    ref42 = `${t42.apiTeamId}-${t42.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }, 60_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await prisma.userFavoriteTeam.deleteMany({ where: { userId: { in: TEST_USER_IDS } } });
      } catch (cause) {
        console.warn('[user-favorites e2e] 픽스처 정리 실패:', cause);
      }
    }
    await app?.close();
  }, 60_000);

  const auth = async (userId: string): Promise<string> => `Bearer ${await sign(userId)}`;

  it('1. GET — 즐겨찾기 없음 → asOf · items===[]', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/me/favorites?locale=ko')
      .set('Authorization', await auth(USER_A))
      .expect(200);
    expect(res.body.items).toEqual([]);
    expect(typeof res.body.asOf).toBe('string');
    // 헤더 계약도 확인 (인터셉터)
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['vary']).toBe('Authorization');
    expect(res.headers.etag).toBeUndefined();
  });

  it('2. PUT — 3개 → items.length===3 · position 0/1/2', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/me/favorites?locale=ko')
      .set('Authorization', await auth(USER_A))
      .set('Content-Type', 'application/json')
      .send({ teamRefs: [ref33, ref40, ref42] })
      .expect(200);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.items.map((i: { position: number }) => i.position)).toEqual([0, 1, 2]);
    expect(res.body.items.map((i: { apiId: number }) => i.apiId)).toEqual([33, 40, 42]);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('3. GET — PUT 결과 반영', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/me/favorites?locale=ko')
      .set('Authorization', await auth(USER_A))
      .expect(200);
    expect(res.body.items.map((i: { apiId: number }) => i.apiId)).toEqual([33, 40, 42]);
    expect(res.body.items.map((i: { position: number }) => i.position)).toEqual([0, 1, 2]);
  });

  it('4. PUT — 상한 초과 (11개) → 400 favorites_limit_exceeded', async () => {
    const many = Array.from({ length: 11 }, (_, i) => `${100 + i}-team-${i}`);
    const res = await request(app.getHttpServer())
      .put('/api/me/favorites')
      .set('Authorization', await auth(USER_B))
      .set('Content-Type', 'application/json')
      .send({ teamRefs: many })
      .expect(400);
    expect(res.body.code).toBe('favorites_limit_exceeded');
  });

  it('5. PUT — 없는 ref → 400 favorites_unknown_team + details 원문', async () => {
    const unknownRef = '99999999-nonexistent-team';
    const res = await request(app.getHttpServer())
      .put('/api/me/favorites')
      .set('Authorization', await auth(USER_A))
      .set('Content-Type', 'application/json')
      .send({ teamRefs: [ref33, unknownRef] })
      .expect(400);
    expect(res.body.code).toBe('favorites_unknown_team');
    expect(res.body.details).toEqual([unknownRef]);
  });

  it('6. PUT — 중복 apiId (다른 슬러그) → 400 favorites_duplicate', async () => {
    const alt = `33-mufc-alt`;
    const res = await request(app.getHttpServer())
      .put('/api/me/favorites')
      .set('Authorization', await auth(USER_A))
      .set('Content-Type', 'application/json')
      .send({ teamRefs: [ref33, alt] })
      .expect(400);
    expect(res.body.code).toBe('favorites_duplicate');
  });

  it('7. PUT — 실패 후 GET 이 이전 상태를 유지 (트랜잭션 계약)', async () => {
    // 케이스 2 에서 저장한 [33, 40, 42] 가 그대로 남아 있어야 한다.
    // 5·6 은 검증 단계에서 실패해 트랜잭션에 진입하지 않는다.
    const res = await request(app.getHttpServer())
      .get('/api/me/favorites?locale=ko')
      .set('Authorization', await auth(USER_A))
      .expect(200);
    expect(res.body.items.map((i: { apiId: number }) => i.apiId)).toEqual([33, 40, 42]);
  });

  it('8. 인증 없음 → 401', async () => {
    await request(app.getHttpServer()).get('/api/me/favorites').expect(401);
    await request(app.getHttpServer())
      .put('/api/me/favorites')
      .send({ teamRefs: [] })
      .expect(401);
  });
});
