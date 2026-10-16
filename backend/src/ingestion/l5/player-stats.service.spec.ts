/**
 * L5PlayerStatsService.persist — 승격 헬퍼 호출 계약 유닛.
 *
 * 판 A(L3/L5 배치)와 판 B(L4 라이브) 가 같은 persist() 를 공유한다.
 * opts.promote=false 이면 promoteIfAllDetailsChecked 는 절대 안 부른다.
 *
 * 실제 파싱·player_match_stats upsert 는 e2e 소관.
 * 여기서는 빈 items 로 최소 경로만 (findUnique(+competitionSeasonId) → updateMany
 * → 조건부 promote) 통과시켜 승격 호출 여부만 확인한다.
 *
 * 예외 하나 — id 없는 선수 회귀 (운영 실측 원문 test/fixtures/fixture-ids-1635690.json).
 * parsePlayerStats(순수) 와, batchUpsert 를 mock 한 persist 로 "무엇을 쓰려 했는가" 만 본다.
 * DB 에 실제로 쓰는 쪽은 test/no-id-players.e2e-spec.ts 소관.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ApiFootballClient } from '../api-football/api-football.client.js';
import type { ApiFixturePlayersItem } from '../api-football/api-football.types.js';
import { knownApiPlayerId } from '../api-football/api-player-id.js';

vi.mock('../../common/match-detail-status.js', () => ({
  promoteIfAllDetailsChecked: vi.fn(async () => ({ promoted: false, hasAll: false })),
}));

// batchUpsert 도 모듈 스코프 함수 — DB 없이 "보내려던 행" 만 받는다.
// 팩토리는 호이스팅되므로 바깥 변수를 쓰지 않고 안에서 완결한다.
// 반환은 실제 BatchUpsertResult 모양(rows·deduped·statements·returned) 그대로.
vi.mock('../../prisma/batch-upsert.js', () => ({
  batchUpsert: vi.fn(async (_db: unknown, spec: { table: string }, rows: readonly Record<string, unknown>[]) => {
    let returned: Record<string, unknown>[] = [];
    if (spec.table === 'players') returned = rows.map((r, i) => ({ id: i + 1, api_player_id: r.api_player_id }));
    else if (spec.table === 'coaches') returned = rows.map((r, i) => ({ id: i + 1, api_coach_id: r.api_coach_id }));
    return { rows: rows.length, deduped: 0, statements: rows.length > 0 ? 1 : 0, returned };
  }),
}));

import { promoteIfAllDetailsChecked } from '../../common/match-detail-status.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import { L5PlayerStatsService, parsePlayerStats } from './player-stats.service.js';

/** 운영 실측 원문 — /fixtures?ids=1635690 봉투 (Man City 50 vs PSG 85, 2026 UCL) */
const FIXTURE_PATH = resolve(__dirname, '../../../test/fixtures/fixture-ids-1635690.json');
/** 매 호출마다 새로 parse — 테스트 간 변형 누수 방지 */
const loadPlayers = (): ApiFixturePlayersItem[] => {
  const raw = readFileSync(FIXTURE_PATH, 'utf8');
  return (JSON.parse(raw) as { response: { players: ApiFixturePlayersItem[] }[] }).response[0].players;
};

describe('parsePlayerStats — id 0 선수 (실측 1635690 · PSG Adam Mouak id=0)', () => {
  it('playerIdByApi 에 0 이 들어 있어도 id 0 선수는 행을 만들지 않는다', () => {
    const items = loadPlayers();
    const all = items.flatMap((it) => it.players);
    const known = all.filter((p) => knownApiPlayerId(p.player.id) !== null);
    expect(all).toHaveLength(46);
    expect(known).toHaveLength(45);
    expect(all.filter((p) => p.player.id === 0)).toHaveLength(1);

    // 픽스처의 모든 player.id (0 포함) → id + 1_000_000. 0 은 1_000_000 으로 간다
    const playerIdByApi = new Map<number, number>();
    for (const p of all) {
      if (p.player.id !== null) playerIdByApi.set(p.player.id, p.player.id + 1_000_000);
    }
    expect(playerIdByApi.has(0)).toBe(true);

    const { rows, missingTeams } = parsePlayerStats(items, {
      matchId: 4,
      competitionSeasonId: 555,
      teamIdByApi: new Map([[50, 10], [85, 20]]),
      playerIdByApi,
    });

    expect(rows).toHaveLength(45);
    expect(rows).toHaveLength(known.length);
    expect(rows.some((r) => r.player_id === 1_000_000)).toBe(false);
    expect(missingTeams).toEqual([]);
  });
});

describe('L5PlayerStatsService.persist — 승격 헬퍼 호출 계약', () => {
  const MATCH_ID = 4;
  const API_FIXTURE_ID = 999_004;
  const COMP_SEASON_ID = 555;

  let prisma: {
    match: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    team: { findMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  /** 트랜잭션 안에서 서비스가 직접 부르는 것은 tx.match.updateMany 뿐 (batchUpsert(tx, …) 는 mock) */
  let tx: { match: { updateMany: ReturnType<typeof vi.fn> } };
  let api: { get: ReturnType<typeof vi.fn> };
  let service: L5PlayerStatsService;

  beforeEach(() => {
    vi.mocked(promoteIfAllDetailsChecked).mockClear();
    vi.mocked(batchUpsert).mockClear();

    tx = { match: { updateMany: vi.fn(async () => ({ count: 1 })) } };
    prisma = {
      match: {
        // player-stats 는 파싱에 필요해서 competitionSeasonId 도 select 한다
        findUnique: vi.fn(async () => ({
          id: MATCH_ID,
          apiFixtureId: API_FIXTURE_ID,
          detailEligible: true,
          competitionSeasonId: COMP_SEASON_ID,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      team: {
        findMany: vi.fn(async () => [
          { id: 10, apiTeamId: 50 },
          { id: 20, apiTeamId: 85 },
        ]),
      },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    api = { get: vi.fn() };

    service = new L5PlayerStatsService(
      prisma as unknown as PrismaService,
      api as unknown as ApiFootballClient,
    );
  });

  it('persist({promote:false}) 는 promoteIfAllDetailsChecked 를 부르지 않는다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: false });

    expect(res.ok).toBe(true);
    expect(res.hasPlayerStats).toBe(false);
    expect(res.promoted).toBe(false);
    expect(promoteIfAllDetailsChecked).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('persist({promote:true}) 는 promoteIfAllDetailsChecked 를 정확히 한 번 부른다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: true });

    expect(res.ok).toBe(true);
    expect(res.hasPlayerStats).toBe(false);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledTimes(1);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledWith(prisma, MATCH_ID);
  });

  it('id 0 선수 (실측 1635690 · PSG Adam Mouak) 는 players·player_match_stats 에서 빠지고 warn 1줄', async () => {
    const items = loadPlayers();
    const all = items.flatMap((it) => it.players);
    const known = all.filter((p) => knownApiPlayerId(p.player.id) !== null);

    const warn = vi
      .spyOn((service as unknown as { logger: Logger }).logger, 'warn')
      .mockImplementation(() => undefined);

    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, items, { promote: false });

    expect(res).toEqual({
      ok: true,
      hasPlayerStats: true,
      players: 45,
      missingTeams: [],
      promoted: false,
      skippedNoId: 1,
    });
    expect(res.players).toBe(known.length);
    expect(res.skippedNoId).toBe(all.length - known.length);

    const callsFor = (table: string) => vi.mocked(batchUpsert).mock.calls.filter(([, spec]) => spec.table === table);

    // players — 45행, api_player_id 0 없음
    const playerCalls = callsFor('players');
    expect(playerCalls).toHaveLength(1);
    const playerRows = playerCalls[0][2];
    expect(playerRows).toHaveLength(45);
    const apiIds = playerRows.map((r) => r.api_player_id as number);
    expect(apiIds).not.toContain(0);
    expect(apiIds.every((id) => Number.isInteger(id) && id > 0)).toBe(true);

    // player_match_stats — 트랜잭션 클라이언트로 45행
    const statCalls = callsFor('player_match_stats');
    expect(statCalls).toHaveLength(1);
    expect(statCalls[0][0]).toBe(tx);
    expect(statCalls[0][2]).toHaveLength(45);
    expect(statCalls[0][2].filter((r) => r.team_id === 20)).toHaveLength(22);
    expect(tx.match.updateMany).toHaveBeenCalledWith({
      where: { id: MATCH_ID, detailEligible: true },
      data: { hasPlayerStats: true },
    });

    // warn 은 정확히 1줄, skip 된 선수 이름 포함
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('Adam Mouak');

    expect(promoteIfAllDetailsChecked).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });
});
