/**
 * /api/search e2e — 팀·선수·대회 통합 검색.
 * 자체 시드(apiId 9,100,000대 — read-api e2e 의 9,000,000대와 겹치지 않음)를 넣고 끝나면 지운다.
 *
 * 검증:
 *   · q 없음 → 400 (ValidationPipe)
 *   · q 길이 1 → 200, 빈 items
 *   · q 길이 2 (접두만 매칭)
 *   · q 길이 3+ (부분 매칭)
 *   · limit 범위 밖 → 400
 *   · 이름 정렬(prefix > partial · 이름 짧은 순)
 *   · localized_names(ko) 로도 매칭됨
 *   · 팀 tracked 참가팀 우선
 *   · 선수 teamName (현재 소속)
 *
 * 원격 DB 가드 — 실 DB (Supabase) 에서는 스킵. 로컬 Postgres/CI 에서만.
 */
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  CompetitionFormat,
  CompetitionType,
  EntityType,
  LocaleSource,
} from '../src/generated/prisma/client.js';

const API = 9_100_000;

const skipIfRemote = (): boolean => {
  const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname;
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  return !local && !process.env.CI && process.env.E2E_ALLOW_REMOTE_DB !== '1';
};

describe('/api/search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids = {
    compA: 0,
    compB: 0,
    csA: 0,
    teamAlpha: 0,
    teamAlphaBeta: 0,
    teamAztecs: 0,
    teamUntracked: 0,
    playerAlvarez: 0,
    playerAlonso: 0,
    playerAlphaSon: 0,
  };
  let willSkip = false;

  beforeAll(async () => {
    if (skipIfRemote()) {
      console.warn(
        `[search e2e] 원격 DB(${new URL(process.env.DATABASE_URL ?? 'postgresql://x/').hostname}) — 스킵`,
      );
      willSkip = true;
      return;
    }

    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    // 대회 2개 — 추적 vs 추적 안 함
    const compA = await prisma.competition.create({
      data: {
        apiCompetitionId: API + 1,
        name: 'Alpha League',
        country: 'Testland',
        type: CompetitionType.LEAGUE,
        format: CompetitionFormat.ROUND_ROBIN,
        isTracked: true,
        displayOrder: 91_001,
      },
    });
    const compB = await prisma.competition.create({
      data: {
        apiCompetitionId: API + 2,
        name: 'Alphabet Cup',
        country: 'Testland',
        type: CompetitionType.CUP,
        format: CompetitionFormat.KNOCKOUT,
        isTracked: false,
        displayOrder: 91_002,
      },
    });

    // 시즌 · CompetitionSeason (추적 대회만) — 정렬 규칙 검증용 (tracked_bit)
    const season2099 = await prisma.season.upsert({ where: { year: 2099 }, create: { year: 2099 }, update: {} });
    const csA = await prisma.competitionSeason.create({
      data: {
        competitionId: compA.id,
        seasonId: season2099.id,
        apiSeasonValue: 2099,
        asOf: new Date('2026-09-10T00:00:00Z'),
      },
    });

    // 팀 4개 — Alpha (짧고 접두 · 참가) / Alpha Beta (긴 접두 · 참가) / Aztecs (부분매칭 · 참가) /
    //        Untracked Alpha FC (참가 안 함, 정렬 아래로)
    const teamAlpha = await prisma.team.create({
      data: { apiTeamId: API + 10, name: 'Alpha', country: 'Testland' },
    });
    const teamAlphaBeta = await prisma.team.create({
      data: { apiTeamId: API + 11, name: 'Alpha Beta FC', country: 'Testland' },
    });
    const teamAztecs = await prisma.team.create({
      data: { apiTeamId: API + 12, name: 'Aztecs United', country: 'Testland' },
    });
    const teamUntracked = await prisma.team.create({
      data: { apiTeamId: API + 13, name: 'Alpha Shorts', country: 'Otherland' },
    });

    await prisma.competitionEntry.createMany({
      data: [
        { competitionSeasonId: csA.id, teamId: teamAlpha.id },
        { competitionSeasonId: csA.id, teamId: teamAlphaBeta.id },
        { competitionSeasonId: csA.id, teamId: teamAztecs.id },
      ],
    });

    // 선수 3개
    const playerAlvarez = await prisma.player.create({
      data: { apiPlayerId: API + 20, name: 'Julian Alvarez', firstname: 'Julian', lastname: 'Alvarez', nationality: 'Argentina' },
    });
    const playerAlonso = await prisma.player.create({
      data: { apiPlayerId: API + 21, name: 'Xabi Alonso', firstname: 'Xabi', lastname: 'Alonso', nationality: 'Spain' },
    });
    const playerAlphaSon = await prisma.player.create({
      data: { apiPlayerId: API + 22, name: 'Alpha Son', firstname: 'Alpha', lastname: 'Son', nationality: 'Testland' },
    });

    // teamName 검증용 SquadEntry — Alvarez → Alpha (validTo null)
    await prisma.squadEntry.create({
      data: {
        playerId: playerAlvarez.id,
        teamId: teamAlpha.id,
        seasonYear: 2099,
        validFrom: new Date('2099-08-01'),
        observedAt: new Date('2026-09-10T00:00:00Z'),
      },
    });

    // 한국어 매칭 — Alvarez 를 '알바레스' 로 등록. `알바` 3자 매칭이 이 선수를 잡아야 한다
    await prisma.localizedName.create({
      data: {
        entityType: EntityType.PLAYER,
        entityId: playerAlvarez.id,
        locale: 'ko',
        name: '훌리안 알바레스',
        shortName: '알바레스',
        source: LocaleSource.MANUAL,
      },
    });

    Object.assign(ids, {
      compA: compA.id,
      compB: compB.id,
      csA: csA.id,
      teamAlpha: teamAlpha.id,
      teamAlphaBeta: teamAlphaBeta.id,
      teamAztecs: teamAztecs.id,
      teamUntracked: teamUntracked.id,
      playerAlvarez: playerAlvarez.id,
      playerAlonso: playerAlonso.id,
      playerAlphaSon: playerAlphaSon.id,
    });
  }, 60_000);

  afterAll(async () => {
    if (willSkip) return;
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    if (!prisma) return;
    const compIds = (
      await prisma.competition.findMany({
        where: { apiCompetitionId: { in: [API + 1, API + 2] } },
        select: { id: true },
      })
    ).map((c) => c.id);
    const csIds = (
      await prisma.competitionSeason.findMany({ where: { competitionId: { in: compIds } }, select: { id: true } })
    ).map((c) => c.id);
    await prisma.competitionEntry.deleteMany({ where: { competitionSeasonId: { in: csIds } } });
    await prisma.competitionSeason.deleteMany({ where: { id: { in: csIds } } });
    await prisma.competition.deleteMany({ where: { id: { in: compIds } } });

    const playerRows = await prisma.player.findMany({
      where: { apiPlayerId: { in: [API + 20, API + 21, API + 22] } },
      select: { id: true },
    });
    const playerInternalIds = playerRows.map((p) => p.id);
    await prisma.squadEntry.deleteMany({ where: { playerId: { in: playerInternalIds } } });
    await prisma.localizedName.deleteMany({
      where: {
        entityType: EntityType.PLAYER,
        entityId: { in: playerInternalIds },
      },
    });
    await prisma.player.deleteMany({ where: { id: { in: playerInternalIds } } });

    await prisma.team.deleteMany({ where: { apiTeamId: { in: [API + 10, API + 11, API + 12, API + 13] } } });
  }

  const get = (path: string) => request(app.getHttpServer()).get(path);

  it('q 누락 → 400', async () => {
    if (willSkip) return;
    await get('/api/search').expect(400);
  });

  it('q 길이 1 → 200, 빈 items · asOf 존재', async () => {
    if (willSkip) return;
    const res = await get('/api/search?q=A').expect(200);
    expect(res.body).toMatchObject({ q: 'A', teams: [], players: [], competitions: [] });
    expect(new Date(res.body.asOf).toString()).not.toBe('Invalid Date');
  });

  it('limit 범위 밖 → 400', async () => {
    if (willSkip) return;
    await get('/api/search?q=Alpha&limit=0').expect(400);
    await get('/api/search?q=Alpha&limit=21').expect(400);
  });

  it('q 100자 초과 → 400', async () => {
    if (willSkip) return;
    const long = 'a'.repeat(101);
    await get(`/api/search?q=${long}`).expect(400);
  });

  it('알 수 없는 필드 → 400 (forbidNonWhitelisted)', async () => {
    if (willSkip) return;
    await get('/api/search?q=Alpha&bogus=1').expect(400);
  });

  it('q=Al (2자 접두) → 접두 매칭만 (팀 3개 · Aztecs 는 안 나옴)', async () => {
    if (willSkip) return;
    const res = await get('/api/search?q=Al').expect(200);
    const refs = res.body.teams.map((t: { ref: string }) => t.ref);
    expect(refs).toEqual(
      expect.arrayContaining([`${API + 10}-alpha`, `${API + 11}-alpha-beta-fc`, `${API + 13}-alpha-shorts`]),
    );
    expect(refs).not.toContain(`${API + 12}-aztecs-united`);
    // 대회도 잡혀야 함 — 'Alpha League' · 'Alphabet Cup' 둘 다 'Al' 접두
    const compRefs = res.body.competitions.map((c: { ref: string }) => c.ref);
    expect(compRefs).toEqual(expect.arrayContaining([`${API + 1}-alpha-league`, `${API + 2}-alphabet-cup`]));
  });

  it('q=Alpha (3자+ 부분매칭) → Aztecs 는 매칭 안 됨, tracked 팀이 Untracked Alpha Shorts 보다 앞', async () => {
    if (willSkip) return;
    const res = await get('/api/search?q=Alpha').expect(200);
    const refs = res.body.teams.map((t: { ref: string }) => t.ref);
    // Alpha (짧고 접두 · tracked) 가 첫번째. Alpha Beta 도 앞. Alpha Shorts (untracked) 는 뒤
    expect(refs[0]).toBe(`${API + 10}-alpha`);
    expect(refs).toContain(`${API + 11}-alpha-beta-fc`);
    // Untracked 는 마지막 (또는 뒤)
    const idxAlphaShorts = refs.indexOf(`${API + 13}-alpha-shorts`);
    const idxAlphaBeta = refs.indexOf(`${API + 11}-alpha-beta-fc`);
    expect(idxAlphaShorts).toBeGreaterThan(idxAlphaBeta);
  });

  it('선수 검색: q=Alv 3자+ → Alvarez 매칭, teamName=Alpha', async () => {
    if (willSkip) return;
    const res = await get('/api/search?q=Alv').expect(200);
    const alvarez = res.body.players.find((p: { apiId: number }) => p.apiId === API + 20);
    expect(alvarez).toBeDefined();
    expect(alvarez.teamName).toBe('Alpha');
    expect(alvarez.ref).toBe(`${API + 20}-julian-alvarez`);
  });

  it('한국어 매칭: q=알바 → Alvarez 잡힘 (localized_names 통해)', async () => {
    if (willSkip) return;
    const res = await get('/api/search?q=%EC%95%8C%EB%B0%94').expect(200); // "알바"
    const found = res.body.players.find((p: { apiId: number }) => p.apiId === API + 20);
    expect(found).toBeDefined();
  });

  it('lastname 매칭: q=Alonso 3자+ → Xabi Alonso 잡힘', async () => {
    if (willSkip) return;
    const res = await get('/api/search?q=Alonso').expect(200);
    const found = res.body.players.find((p: { apiId: number }) => p.apiId === API + 21);
    expect(found).toBeDefined();
    // teamName 없음 (SquadEntry 없음)
    expect(found.teamName).toBeNull();
  });

  it('limit 반영: q=Al&limit=2 → teams 최대 2개', async () => {
    if (willSkip) return;
    const res = await get('/api/search?q=Al&limit=2').expect(200);
    expect(res.body.teams.length).toBeLessThanOrEqual(2);
  });
});
