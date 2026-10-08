/**
 * GET/PUT /api/me/favorites e2e — google-login 3판.
 *
 * SUPABASE_JWKS provider 를 로컬 JWKS 로 override 하고, 같은 ES256 개인키로 서명한 토큰을 붙인다.
 * 실제 Supabase 네트워크 호출 없음. 원격 DB 가드는 l1.e2e-spec.ts 규약 그대로.
 *
 * 픽스처 id 대역: 팀 989_xxx (989_000~989_999) — 실제 팀 apiId 를 쓰지 않는다.
 *   beforeAll 이 대역을 먼저 비우고 989_001~003 을 심는다. afterAll 이 즐겨찾기 → 대역 팀 순으로 지운다.
 *
 * 케이스:
 *   1. GET (즐겨찾기 없음) → asOf · items===[]
 *   2. PUT 3개 → items.length===3 · position 0/1/2
 *   3. GET 반영 → PUT 결과와 같음
 *   4. PUT 상한 초과 (11개) → 400 favorites_limit_exceeded
 *   5. PUT 없는 ref → 400 favorites_unknown_team + details 원문
 *   6. PUT 중복 apiId → 400 favorites_duplicate
 *   7. PUT 400(검증 실패) 뒤 GET 이 이전 상태를 유지 — 검증은 트랜잭션 진입 전
 *   8. 인증 없음 → 401
 *   9. 사용자 격리 — USER_B 의 GET/PUT 이 USER_A 에 닿지 않음
 *  10. 같은 사용자 동시 PUT 3개 × 3라운드 → 전부 200 · 최종 상태가 셋 중 하나 · position 연속
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

/** 이 스펙 전용 팀 apiId 대역 */
const BAND_MIN = 989_000;
const BAND_MAX = 989_999;
const TEAM_SEEDS = [
  { apiTeamId: 989_001, name: 'Favorites Fixture Alpha', country: 'Testland' },
  { apiTeamId: 989_002, name: 'Favorites Fixture Beta', country: 'Testland' },
  { apiTeamId: 989_003, name: 'Favorites Fixture Gamma', country: 'Testland' },
];
// toRef(apiTeamId, name) 결과와 같다 (src/common/ref.ts)
const REF_A = '989001-favorites-fixture-alpha';
const REF_B = '989002-favorites-fixture-beta';
const REF_C = '989003-favorites-fixture-gamma';
/** REF_A 와 같은 apiId · 다른 슬러그 */
const REF_DUP = '989001-alpha-alt';
/** 대역 안이지만 심지 않은 apiId */
const REF_MISSING = '989999-nonexistent-team';

const ISSUER_HOST = process.env.SUPABASE_URL ?? 'https://test-project.supabase.co';
const KID = 'user-favorites-e2e-kid';

describe('GET/PUT /api/me/favorites (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let privateKey: PrivateKeyType;

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

    // 이전 실행 잔여물 정리 — 자식(즐겨찾기) 먼저, 그다음 대역 팀 (Restrict 에뮬레이션)
    await prisma.userFavoriteTeam.deleteMany({ where: { userId: { in: TEST_USER_IDS } } });
    await prisma.team.deleteMany({ where: { apiTeamId: { gte: BAND_MIN, lte: BAND_MAX } } });

    // 팀 3개 self-seed — CI 는 fresh Postgres 라 L0 seed 가 없다.
    for (const seed of TEAM_SEEDS) {
      await prisma.team.upsert({
        where: { apiTeamId: seed.apiTeamId },
        create: seed,
        update: {},
      });
    }
  }, 60_000);

  afterAll(async () => {
    if (prisma) {
      try {
        await prisma.userFavoriteTeam.deleteMany({ where: { userId: { in: TEST_USER_IDS } } });
      } catch (cause) {
        console.warn('[user-favorites e2e] 즐겨찾기 정리 실패:', cause);
      }
      try {
        await prisma.team.deleteMany({ where: { apiTeamId: { gte: BAND_MIN, lte: BAND_MAX } } });
      } catch (cause) {
        console.warn('[user-favorites e2e] 대역 팀 정리 실패:', cause);
      }
    }
    try {
      await app?.close();
    } catch (cause) {
      console.warn('[user-favorites e2e] app.close 실패:', cause);
    }
  }, 60_000);

  const auth = async (userId: string): Promise<string> => `Bearer ${await sign(userId)}`;
  const apiIdsOf = (body: { items: { apiId: number }[] }): number[] => body.items.map((i) => i.apiId);
  const positionsOf = (body: { items: { position: number }[] }): number[] =>
    body.items.map((i) => i.position);

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
      .send({ teamRefs: [REF_A, REF_B, REF_C] })
      .expect(200);
    expect(res.body.items).toHaveLength(3);
    expect(positionsOf(res.body)).toEqual([0, 1, 2]);
    expect(apiIdsOf(res.body)).toEqual([989001, 989002, 989003]);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('3. GET — PUT 결과 반영', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/me/favorites?locale=ko')
      .set('Authorization', await auth(USER_A))
      .expect(200);
    expect(apiIdsOf(res.body)).toEqual([989001, 989002, 989003]);
    expect(positionsOf(res.body)).toEqual([0, 1, 2]);
  });

  it('4. PUT — 상한 초과 (11개) → 400 favorites_limit_exceeded', async () => {
    // 대역 안 미시드 apiId 989100~989110 — 상한 검사가 DB 조회보다 먼저지만, 순서가 바뀌어도 실제 팀에 닿지 않게
    const many = Array.from({ length: 11 }, (_, i) => `${989_100 + i}-team-${i}`);
    const res = await request(app.getHttpServer())
      .put('/api/me/favorites')
      .set('Authorization', await auth(USER_B))
      .set('Content-Type', 'application/json')
      .send({ teamRefs: many })
      .expect(400);
    expect(res.body.code).toBe('favorites_limit_exceeded');
  });

  it('5. PUT — 없는 ref → 400 favorites_unknown_team + details 원문', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/me/favorites')
      .set('Authorization', await auth(USER_A))
      .set('Content-Type', 'application/json')
      .send({ teamRefs: [REF_A, REF_MISSING] })
      .expect(400);
    expect(res.body.code).toBe('favorites_unknown_team');
    expect(res.body.details).toEqual([REF_MISSING]);
  });

  it('6. PUT — 중복 apiId (다른 슬러그) → 400 favorites_duplicate', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/me/favorites')
      .set('Authorization', await auth(USER_A))
      .set('Content-Type', 'application/json')
      .send({ teamRefs: [REF_A, REF_DUP] })
      .expect(400);
    expect(res.body.code).toBe('favorites_duplicate');
  });

  it('7. PUT 400(검증 실패) 뒤 GET 이 이전 상태를 유지 — 검증은 트랜잭션 진입 전', async () => {
    // 케이스 2 에서 저장한 [A, B, C] 가 그대로 남아 있어야 한다.
    // 5·6 은 검증 단계에서 실패해 트랜잭션에 진입하지 않는다.
    const res = await request(app.getHttpServer())
      .get('/api/me/favorites?locale=ko')
      .set('Authorization', await auth(USER_A))
      .expect(200);
    expect(apiIdsOf(res.body)).toEqual([989001, 989002, 989003]);
  });

  it('8. 인증 없음 → 401', async () => {
    await request(app.getHttpServer()).get('/api/me/favorites').expect(401);
    await request(app.getHttpServer())
      .put('/api/me/favorites')
      .send({ teamRefs: [] })
      .expect(401);
  });

  it('9. 사용자 격리 — USER_B 의 GET/PUT 이 USER_A 에 닿지 않음', async () => {
    // 이 시점 USER_A = [A, B, C] (케이스 2·7). USER_B 는 beforeAll 이 비웠고 그 뒤 USER_B 로 성공한 PUT 이 없어 비어 있다.
    const bGet = await request(app.getHttpServer())
      .get('/api/me/favorites?locale=ko')
      .set('Authorization', await auth(USER_B))
      .expect(200);
    expect(bGet.body.items).toEqual([]);

    const bPut = await request(app.getHttpServer())
      .put('/api/me/favorites?locale=ko')
      .set('Authorization', await auth(USER_B))
      .set('Content-Type', 'application/json')
      .send({ teamRefs: [REF_B] })
      .expect(200);
    expect(apiIdsOf(bPut.body)).toEqual([989002]);

    const aGet = await request(app.getHttpServer())
      .get('/api/me/favorites?locale=ko')
      .set('Authorization', await auth(USER_A))
      .expect(200);
    expect(apiIdsOf(aGet.body)).toEqual([989001, 989002, 989003]);
  });

  it('10. 같은 사용자 동시 PUT 3개 × 3라운드 → 전부 200 · 최종 상태가 셋 중 하나 · position 연속', async () => {
    const bodies = [[REF_A, REF_B], [REF_C], [REF_B, REF_C, REF_A]];
    const expectedApiIds = [[989001, 989002], [989003], [989002, 989003, 989001]];

    for (let round = 0; round < 3; round++) {
      const token = await auth(USER_A);
      const results = await Promise.all(
        bodies.map((teamRefs) =>
          request(app.getHttpServer())
            .put('/api/me/favorites?locale=ko')
            .set('Authorization', token)
            .set('Content-Type', 'application/json')
            .send({ teamRefs }),
        ),
      );
      expect(results.map((r) => r.status)).toEqual([200, 200, 200]);

      const res = await request(app.getHttpServer())
        .get('/api/me/favorites?locale=ko')
        .set('Authorization', token)
        .expect(200);
      const ids = apiIdsOf(res.body);
      expect(expectedApiIds).toContainEqual(ids);
      expect(positionsOf(res.body)).toEqual(ids.map((_, i) => i));
    }
  }, 60_000);
});
