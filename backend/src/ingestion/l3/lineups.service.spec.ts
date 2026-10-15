/**
 * L3LineupsService.persist — 승격 헬퍼 호출 계약 유닛.
 *
 * 판 A(L3/L5 배치)와 판 B(L4 라이브) 가 같은 persist() 를 공유한다.
 * 라이브에서는 다른 갈래가 아직 채워지지 않은 상태로 부를 수 있으므로
 * opts.promote=false 일 때 promoteIfAllDetailsChecked 를 절대 부르면 안 된다.
 *
 * 여기서는 진짜 저장 로직·트랜잭션은 검증하지 않는다 — 그건 test/l3.e2e-spec.ts 소관.
 * 이 파일은 빈 items 로 persist 를 호출해 최소 경로만 통과시키고 (findUnique →
 * updateMany → 조건부 promote) 승격 헬퍼 호출 여부만 관측한다.
 *
 * 예외 하나 — id 없는 선수 회귀 (운영 실측 원문 test/fixtures/fixture-ids-1635690.json).
 * DB 없이 batchUpsert 를 mock 해 "무엇을 쓰려 했는가" 만 본다. DB 에 실제로 쓰는 쪽은
 * test/no-id-players.e2e-spec.ts 소관.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ApiFootballClient } from '../api-football/api-football.client.js';
import type { ApiFixtureLineupItem } from '../api-football/api-football.types.js';
import { knownApiPlayerId } from '../api-football/api-player-id.js';

// promote 헬퍼는 모듈 스코프 함수라 vi.mock 로 갈아끼운다. 아래 import 는
// 모킹된 버전을 참조하게 되고, 서비스가 부르는 곳도 같은 모듈이라 같은 스텁을 본다.
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
import { L3LineupsService } from './lineups.service.js';

/** 운영 실측 원문 — /fixtures?ids=1635690 봉투 (Man City 50 vs PSG 85, 2026 UCL) */
const FIXTURE_PATH = resolve(__dirname, '../../../test/fixtures/fixture-ids-1635690.json');
/** 매 호출마다 새로 parse — 테스트 간 변형 누수 방지 */
const loadLineups = (): ApiFixtureLineupItem[] => {
  const raw = readFileSync(FIXTURE_PATH, 'utf8');
  return (JSON.parse(raw) as { response: { lineups: ApiFixtureLineupItem[] }[] }).response[0].lineups;
};

describe('L3LineupsService.persist — 승격 헬퍼 호출 계약', () => {
  const MATCH_ID = 1;
  const API_FIXTURE_ID = 999_001;
  const TEAM_MCI = 10; // apiTeamId 50
  const TEAM_PSG = 20; // apiTeamId 85

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
  let service: L3LineupsService;

  beforeEach(() => {
    vi.mocked(promoteIfAllDetailsChecked).mockClear();
    vi.mocked(batchUpsert).mockClear();

    tx = { match: { updateMany: vi.fn(async () => ({ count: 1 })) } };
    prisma = {
      match: {
        findUnique: vi.fn(async () => ({
          id: MATCH_ID,
          apiFixtureId: API_FIXTURE_ID,
          detailEligible: true,
          homeTeamId: TEAM_MCI,
          awayTeamId: TEAM_PSG,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      team: {
        findMany: vi.fn(async () => [
          { id: TEAM_MCI, apiTeamId: 50 },
          { id: TEAM_PSG, apiTeamId: 85 },
        ]),
      },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    api = { get: vi.fn() };

    service = new L3LineupsService(
      prisma as unknown as PrismaService,
      api as unknown as ApiFootballClient,
    );
  });

  it('persist({promote:false}) 는 promoteIfAllDetailsChecked 를 부르지 않는다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: false });

    expect(res.ok).toBe(true);
    expect(res.hasLineups).toBe(false);
    expect(res.promoted).toBe(false);
    expect(promoteIfAllDetailsChecked).not.toHaveBeenCalled();
    // 외부 호출은 persist 안에서 하지 않는다
    expect(api.get).not.toHaveBeenCalled();
  });

  it('persist({promote:true}) 는 promoteIfAllDetailsChecked 를 정확히 한 번 부른다 (빈 응답 브랜치)', async () => {
    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, [], { promote: true });

    expect(res.ok).toBe(true);
    expect(res.hasLineups).toBe(false);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledTimes(1);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledWith(prisma, MATCH_ID);
  });

  it('id 없는 선수 (실측 1635690 · PSG 벤치 Adam Mouak id=null) 는 players·lineup_entries 에서 빠지고 warn 1줄', async () => {
    const items = loadLineups();

    // 픽스처에서 직접 센 기대값 — 하드코딩 값과 같아야 한다
    const all = items.flatMap((it) => [...it.startXI, ...it.substitutes]);
    const known = all.filter((e) => knownApiPlayerId(e.player.id) !== null);
    expect(all).toHaveLength(46);
    expect(known).toHaveLength(45);
    expect(all.length - known.length).toBe(1);

    const warn = vi
      .spyOn((service as unknown as { logger: Logger }).logger, 'warn')
      .mockImplementation(() => undefined);

    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, items, { promote: false });

    expect(res).toEqual({ ok: true, hasLineups: true, lineups: 2, entries: 45, skippedNoId: 1, promoted: false });
    expect(res.entries).toBe(known.length);
    expect(res.skippedNoId).toBe(all.length - known.length);

    const callsFor = (table: string) => vi.mocked(batchUpsert).mock.calls.filter(([, spec]) => spec.table === table);

    // players — 45행, 전부 양의 정수 id
    const playerCalls = callsFor('players');
    expect(playerCalls).toHaveLength(1);
    const playerRows = playerCalls[0][2];
    expect(playerRows).toHaveLength(45);
    expect(playerRows).toHaveLength(known.length);
    const apiIds = playerRows.map((r) => r.api_player_id as number);
    expect(apiIds.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
    expect(playerRows.some((r) => r.name === 'Adam Mouak')).toBe(false);

    // lineup_entries — 트랜잭션 클라이언트로 45행. 선발 22 · 벤치 23 · PSG 22 · PSG 80번 없음
    const entryCalls = callsFor('lineup_entries');
    expect(entryCalls).toHaveLength(1);
    expect(entryCalls[0][0]).toBe(tx);
    const entryRows = entryCalls[0][2];
    expect(entryRows).toHaveLength(45);
    expect(entryRows.filter((r) => r.is_starter === true)).toHaveLength(22);
    expect(entryRows.filter((r) => r.is_starter === false)).toHaveLength(23);
    expect(entryRows.filter((r) => r.team_id === TEAM_PSG)).toHaveLength(22);
    expect(entryRows.filter((r) => r.team_id === TEAM_PSG && r.jersey_number === 80)).toHaveLength(0);
    expect(entryRows.every((r) => Number.isInteger(r.player_id as number) && (r.player_id as number) > 0)).toBe(true);

    // match_lineups 2행 · has_lineups 는 트랜잭션 안에서 true
    expect(callsFor('match_lineups')[0][2]).toHaveLength(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.match.updateMany).toHaveBeenCalledWith({
      where: { id: MATCH_ID, detailEligible: true },
      data: { hasLineups: true },
    });

    // warn 은 정확히 1줄, skip 된 선수 이름#번호 포함
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('Adam Mouak#80');

    expect(promoteIfAllDetailsChecked).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });
});
