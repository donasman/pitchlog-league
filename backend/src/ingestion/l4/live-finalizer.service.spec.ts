/**
 * LiveFinalizerService 유닛.
 *
 * fixture-ids-1622630.json 원문을 읽어 실제 shape 로 검증한다 (판 A 이후 4배열 존재 확인 완료).
 * 4서비스는 persist 만 mock 한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LiveFinalizerService } from './live-finalizer.service.js';
import type { L3LineupsService } from '../l3/lineups.service.js';
import type { L3EventsService } from '../l3/events.service.js';
import type { L5TeamStatsService } from '../l5/team-stats.service.js';
import type { L5PlayerStatsService } from '../l5/player-stats.service.js';
import type { L2Service } from '../l2/l2.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { CompetitionFormat } from '../../generated/prisma/client.js';

const FIXTURE_PATH = resolve(__dirname, '../../../test/fixtures/fixture-ids-1622630.json');
const fixtureItem = ((): Record<string, unknown> => {
  const raw = readFileSync(FIXTURE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as { response: Record<string, unknown>[] };
  return parsed.response[0];
})();

function mkPrisma(overrides: Partial<{
  teamFindMany: ReturnType<typeof vi.fn>;
  csFindUnique: ReturnType<typeof vi.fn>;
}> = {}): {
  team: { findMany: ReturnType<typeof vi.fn> };
  competitionSeason: { findUnique: ReturnType<typeof vi.fn> };
} {
  return {
    team: {
      findMany: overrides.teamFindMany ?? vi.fn().mockResolvedValue([
        { id: 1, apiTeamId: 40 },
        { id: 2, apiTeamId: 33 },
      ]),
    },
    competitionSeason: {
      findUnique: overrides.csFindUnique ?? vi.fn(),
    },
  };
}

function mkL2(): { collectStandings: ReturnType<typeof vi.fn> } {
  return { collectStandings: vi.fn().mockResolvedValue(20) };
}

function mkServices(prisma: ReturnType<typeof mkPrisma>, l2: ReturnType<typeof mkL2>): {
  finalizer: LiveFinalizerService;
  lineups: { persist: ReturnType<typeof vi.fn> };
  events: { persist: ReturnType<typeof vi.fn> };
  teamStats: { persist: ReturnType<typeof vi.fn> };
  playerStats: { persist: ReturnType<typeof vi.fn> };
} {
  const lineups = { persist: vi.fn().mockResolvedValue({ ok: true }) };
  const events = { persist: vi.fn().mockResolvedValue({ ok: true }) };
  const teamStats = { persist: vi.fn().mockResolvedValue({ ok: true }) };
  const playerStats = { persist: vi.fn().mockResolvedValue({ ok: true }) };
  const finalizer = new LiveFinalizerService(
    lineups as unknown as L3LineupsService,
    events as unknown as L3EventsService,
    teamStats as unknown as L5TeamStatsService,
    playerStats as unknown as L5PlayerStatsService,
    l2 as unknown as L2Service,
    prisma as unknown as PrismaService,
  );
  return { finalizer, lineups, events, teamStats, playerStats };
}

describe('LiveFinalizerService', () => {
  let prisma: ReturnType<typeof mkPrisma>;
  let l2: ReturnType<typeof mkL2>;

  beforeEach(() => {
    prisma = mkPrisma();
    l2 = mkL2();
  });

  it('(1) 네 배열이 다 있으면 4서비스 persist 를 각각 { promote: false } 로 1회씩', async () => {
    const { finalizer, lineups, events, teamStats, playerStats } = mkServices(prisma, l2);
    const res = await finalizer.onFinal(999, 1622630, fixtureItem);

    expect(lineups.persist).toHaveBeenCalledTimes(1);
    expect(events.persist).toHaveBeenCalledTimes(1);
    expect(teamStats.persist).toHaveBeenCalledTimes(1);
    expect(playerStats.persist).toHaveBeenCalledTimes(1);

    // { promote: false } 로 부르는지
    for (const spy of [lineups.persist, events.persist, teamStats.persist, playerStats.persist]) {
      const call = spy.mock.calls[0];
      expect(call[3]).toEqual({ promote: false });
      expect(call[0]).toBe(999);
      expect(call[1]).toBe(1622630);
    }

    expect(res.lineups).toBe('ok');
    expect(res.events).toBe('ok');
    expect(res.teamStats).toBe('ok');
    expect(res.playerStats).toBe('ok');
    // counts 는 items.length — 실제 fixture 값으로 검증
    expect(res.counts.lineups).toBeGreaterThan(0);
    expect(res.counts.events).toBeGreaterThan(0);
    expect(res.counts.teamStats).toBeGreaterThan(0);
    expect(res.counts.playerStats).toBeGreaterThan(0);
  });

  it('(2) lineups 만 빈 배열이면 lineups=skip · 나머지 3갈래는 정상 호출', async () => {
    const item = { ...fixtureItem, lineups: [] };
    const { finalizer, lineups, events, teamStats, playerStats } = mkServices(prisma, l2);
    const res = await finalizer.onFinal(999, 1622630, item);

    expect(lineups.persist).not.toHaveBeenCalled();
    expect(events.persist).toHaveBeenCalledTimes(1);
    expect(teamStats.persist).toHaveBeenCalledTimes(1);
    expect(playerStats.persist).toHaveBeenCalledTimes(1);

    expect(res.lineups).toBe('skip');
    expect(res.counts.lineups).toBe(0);
    expect(res.events).toBe('ok');
    expect(res.teamStats).toBe('ok');
    expect(res.playerStats).toBe('ok');
  });

  it('(3) events persist 가 throw → events=error · 다른 3갈래는 정상', async () => {
    const { finalizer, lineups, events, teamStats, playerStats } = mkServices(prisma, l2);
    events.persist.mockRejectedValueOnce(new Error('boom'));

    const res = await finalizer.onFinal(999, 1622630, fixtureItem);

    expect(lineups.persist).toHaveBeenCalledTimes(1);
    expect(events.persist).toHaveBeenCalledTimes(1);
    expect(teamStats.persist).toHaveBeenCalledTimes(1);
    expect(playerStats.persist).toHaveBeenCalledTimes(1);

    expect(res.events).toBe('error');
    expect(res.counts.events).toBe(0);
    expect(res.lineups).toBe('ok');
    expect(res.teamStats).toBe('ok');
    expect(res.playerStats).toBe('ok');
  });

  it('(4) competition.format=KNOCKOUT 인 csId 는 collectStandings 호출 안 함', async () => {
    prisma.competitionSeason.findUnique.mockResolvedValue({
      id: 500,
      seasonId: 10,
      competitionId: 20,
      competition: {
        id: 20,
        apiCompetitionId: 143,
        name: 'Copa del Rey',
        format: CompetitionFormat.KNOCKOUT,
      },
      season: { id: 10, year: 2025 },
    });
    const { finalizer } = mkServices(prisma, l2);
    const n = await finalizer.refreshStandings([500]);
    expect(l2.collectStandings).not.toHaveBeenCalled();
    expect(n).toBe(0);
  });

  it('(5) LEAGUE_PHASE_KNOCKOUT 은 대상 — collectStandings 호출됨', async () => {
    prisma.competitionSeason.findUnique.mockResolvedValue({
      id: 600,
      seasonId: 10,
      competitionId: 30,
      competition: {
        id: 30,
        apiCompetitionId: 2,
        name: 'UEFA Champions League',
        format: CompetitionFormat.LEAGUE_PHASE_KNOCKOUT,
      },
      season: { id: 10, year: 2025 },
    });
    const { finalizer } = mkServices(prisma, l2);
    const n = await finalizer.refreshStandings([600]);
    expect(l2.collectStandings).toHaveBeenCalledTimes(1);
    // (csId, apiCompetitionId, year, label, teamIdByApi)
    const call = l2.collectStandings.mock.calls[0];
    expect(call[0]).toBe(600);
    expect(call[1]).toBe(2);
    expect(call[2]).toBe(2025);
    expect(call[3]).toBe('UEFA Champions League 2025');
    expect(call[4]).toBeInstanceOf(Map);
    expect(n).toBe(20);
  });

  it('(6) teamIdByApi 는 refreshStandings 호출당 새로 만든다 (findMany 호출 회수 검증)', async () => {
    prisma.competitionSeason.findUnique.mockResolvedValue({
      id: 700,
      seasonId: 10,
      competitionId: 40,
      competition: {
        id: 40,
        apiCompetitionId: 39,
        name: 'Premier League',
        format: CompetitionFormat.ROUND_ROBIN,
      },
      season: { id: 10, year: 2025 },
    });
    const { finalizer } = mkServices(prisma, l2);

    await finalizer.refreshStandings([700]);
    await finalizer.refreshStandings([700]);
    // 각 호출마다 1회씩 findMany
    expect(prisma.team.findMany).toHaveBeenCalledTimes(2);
  });

  it('(7) item.lineups 가 배열이 아니면 lineups=skip', async () => {
    const item = { ...fixtureItem, lineups: null };
    const { finalizer, lineups, events } = mkServices(prisma, l2);
    const res = await finalizer.onFinal(999, 1622630, item);

    expect(lineups.persist).not.toHaveBeenCalled();
    expect(events.persist).toHaveBeenCalledTimes(1);
    expect(res.lineups).toBe('skip');
    expect(res.counts.lineups).toBe(0);
  });
});
