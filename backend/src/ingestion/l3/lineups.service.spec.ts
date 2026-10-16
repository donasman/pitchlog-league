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
 *
 * 명단 없는 라인업 (실측 test/fixtures/api-football/lineups_1485809.json — startXI·substitutes 키 없음)
 * 도 같은 방식이다. 두 팀 모두 선수 0명이면 빈 응답과 같이 has_lineups=false 만 쓰고,
 * 한 팀만 명단이 없으면 그 팀은 match_lineups 행만 생긴다.
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

/** 운영 실측 원문 — /fixtures/lineups?fixture=1485809 봉투 (Cannes 9932 vs Annecy 3012, Coupe de France 2025) */
const NO_ROSTER_FIXTURE_ID = 1_485_809;
const NO_ROSTER_PATH = resolve(__dirname, '../../../test/fixtures/api-football/lineups_1485809.json');
const loadNoRosterLineups = (): ApiFixtureLineupItem[] => {
  const raw = readFileSync(NO_ROSTER_PATH, 'utf8');
  return (JSON.parse(raw) as { response: ApiFixtureLineupItem[] }).response;
};

/** 선발 + 벤치 — 키가 없거나 null 이면 빈 배열 */
const rosterOf = (it: ApiFixtureLineupItem) => [...(it.startXI ?? []), ...(it.substitutes ?? [])];

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
    const all = items.flatMap(rosterOf);
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

  it('명단 없는 라인업 (실측 1485809 · startXI·substitutes 키 없음) 은 빈 응답과 같이 has_lineups=false 만 쓰고 log 1줄', async () => {
    const items = loadNoRosterLineups();

    // 픽스처에서 직접 확인 — 2팀 · 명단 키 없음 · formation null · 선수 0명
    expect(items).toHaveLength(2);
    expect(items.every((it) => !('startXI' in it) && !('substitutes' in it))).toBe(true);
    expect(items.every((it) => it.formation === null)).toBe(true);
    expect(items.flatMap(rosterOf)).toHaveLength(0);

    prisma.match.findUnique.mockResolvedValue({
      id: MATCH_ID,
      apiFixtureId: NO_ROSTER_FIXTURE_ID,
      detailEligible: true,
      homeTeamId: TEAM_MCI,
      awayTeamId: TEAM_PSG,
    });
    const log = vi
      .spyOn((service as unknown as { logger: Logger }).logger, 'log')
      .mockImplementation(() => undefined);
    const noRosterLogs = () => log.mock.calls.filter(([msg]) => String(msg).includes('선수 명단 없는 라인업'));

    const res = await service.persist(MATCH_ID, NO_ROSTER_FIXTURE_ID, items, { promote: false });

    expect(res).toEqual({ ok: true, hasLineups: false, lineups: 0, entries: 0, skippedNoId: 0, promoted: false });

    // coaches·players·match_lineups·lineup_entries 어느 것도 쓰지 않고 트랜잭션도 열지 않는다
    expect(batchUpsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.team.findMany).not.toHaveBeenCalled();
    // matches 는 has_lineups=false 한 번만
    expect(prisma.match.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { id: MATCH_ID, detailEligible: true },
      data: { hasLineups: false },
    });

    expect(noRosterLogs()).toHaveLength(1);
    expect(String(noRosterLogs()[0][0])).toContain(`apiFixtureId=${NO_ROSTER_FIXTURE_ID}`);
    expect(String(noRosterLogs()[0][0])).toContain(`${items.length}팀`);

    expect(promoteIfAllDetailsChecked).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();

    // 빈 응답 분기와 같은 객체 — 새 필드가 없다. 빈 응답은 이 log 를 남기지 않는다
    const empty = await service.persist(MATCH_ID, NO_ROSTER_FIXTURE_ID, [], { promote: false });
    expect(res).toEqual(empty);
    expect(Object.keys(res).sort()).toEqual(Object.keys(empty).sort());
    expect(noRosterLogs()).toHaveLength(1);
  });

  it('명단 없는 라인업 (실측 1485809) + persist({promote:true}) 는 promoteIfAllDetailsChecked 를 정확히 한 번 부르고 그 결과를 돌려준다', async () => {
    const items = loadNoRosterLineups();
    expect(items.flatMap(rosterOf)).toHaveLength(0);

    prisma.match.findUnique.mockResolvedValue({
      id: MATCH_ID,
      apiFixtureId: NO_ROSTER_FIXTURE_ID,
      detailEligible: true,
      homeTeamId: TEAM_MCI,
      awayTeamId: TEAM_PSG,
    });
    vi.spyOn((service as unknown as { logger: Logger }).logger, 'log').mockImplementation(() => undefined);
    // 기본 mock 은 promoted:false — 이번 한 번만 true 로 바꿔 결과가 헬퍼 반환값을 따르는지 본다
    vi.mocked(promoteIfAllDetailsChecked).mockResolvedValueOnce({ promoted: true, hasAll: true });

    const res = await service.persist(MATCH_ID, NO_ROSTER_FIXTURE_ID, items, { promote: true });

    expect(res).toEqual({ ok: true, hasLineups: false, lineups: 0, entries: 0, skippedNoId: 0, promoted: true });
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledTimes(1);
    expect(promoteIfAllDetailsChecked).toHaveBeenCalledWith(prisma, MATCH_ID);

    expect(batchUpsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.match.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { id: MATCH_ID, detailEligible: true },
      data: { hasLineups: false },
    });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('한 팀만 명단 (실측 1635690 에서 PSG startXI·substitutes 키 삭제) 은 라인업 2행 · 엔트리는 Man City 만', async () => {
    const items = loadLineups();
    const mci = items.find((it) => it.team.id === 50);
    const psg = items.find((it) => it.team.id === 85);
    if (mci === undefined || psg === undefined) throw new Error('픽스처 1635690 에 Man City(50)·PSG(85) 라인업이 없다');
    delete psg.startXI;
    delete psg.substitutes;

    // 픽스처에서 직접 센 기대값 — Man City 선발+벤치 (id 없는 선수 없음), PSG 0명
    const mciStarters = mci.startXI ?? [];
    const mciBench = mci.substitutes ?? [];
    const mciAll = rosterOf(mci);
    const mciKnown = mciAll.filter((e) => knownApiPlayerId(e.player.id) !== null);
    expect(mciAll).toHaveLength(23);
    expect(mciKnown).toHaveLength(mciAll.length);
    expect(rosterOf(psg)).toHaveLength(0);

    const log = vi
      .spyOn((service as unknown as { logger: Logger }).logger, 'log')
      .mockImplementation(() => undefined);
    const warn = vi
      .spyOn((service as unknown as { logger: Logger }).logger, 'warn')
      .mockImplementation(() => undefined);

    const res = await service.persist(MATCH_ID, API_FIXTURE_ID, items, { promote: false });

    expect(res).toEqual({ ok: true, hasLineups: true, lineups: 2, entries: 23, skippedNoId: 0, promoted: false });
    expect(res.entries).toBe(mciAll.length);

    const callsFor = (table: string) => vi.mocked(batchUpsert).mock.calls.filter(([, spec]) => spec.table === table);

    // players — Man City 만
    const playerCalls = callsFor('players');
    expect(playerCalls).toHaveLength(1);
    expect(playerCalls[0][2]).toHaveLength(mciKnown.length);

    // lineup_entries — 전부 Man City 매핑 team_id. 선발·벤치 수도 원문 그대로
    const entryCalls = callsFor('lineup_entries');
    expect(entryCalls).toHaveLength(1);
    expect(entryCalls[0][0]).toBe(tx);
    const entryRows = entryCalls[0][2];
    expect(entryRows).toHaveLength(mciAll.length);
    expect(entryRows.every((r) => r.team_id === TEAM_MCI)).toBe(true);
    expect(entryRows.filter((r) => r.is_starter === true)).toHaveLength(mciStarters.length);
    expect(entryRows.filter((r) => r.is_starter === false)).toHaveLength(mciBench.length);

    // match_lineups — 2행. 명단 없는 PSG 도 라인업 행은 생긴다 (formation 원문 그대로)
    const lineupCalls = callsFor('match_lineups');
    expect(lineupCalls).toHaveLength(1);
    const lineupRows = lineupCalls[0][2];
    expect(lineupRows).toHaveLength(2);
    expect(lineupRows.filter((r) => r.team_id === TEAM_MCI)).toHaveLength(1);
    const psgRows = lineupRows.filter((r) => r.team_id === TEAM_PSG);
    expect(psgRows).toHaveLength(1);
    expect(psgRows[0].formation).toBe(psg.formation);

    // has_lineups 는 트랜잭션 안에서 true. 미제공 분기는 타지 않는다
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.match.updateMany).toHaveBeenCalledWith({
      where: { id: MATCH_ID, detailEligible: true },
      data: { hasLineups: true },
    });
    expect(prisma.match.updateMany).not.toHaveBeenCalled();
    expect(log.mock.calls.filter(([msg]) => String(msg).includes('선수 명단 없는 라인업'))).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled();

    expect(promoteIfAllDetailsChecked).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });
});
