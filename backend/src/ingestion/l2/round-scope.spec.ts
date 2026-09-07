/**
 * 라운드 컷 판정 (INGESTION_STRATEGY 2-2)
 *
 * 이름으로 자르지 않는다는 것이 요점이다 — 아래 시나리오는 전부 팀 구성으로만 판정한다.
 */
import { describe, it, expect } from 'vitest';
import { resolveRoundScope, type FixtureRef } from './round-scope.js';

/** 1부 팀은 100번대, 하부·해외 팀은 900번대 */
const TOP = (n: number) => 100 + n;
const LOW = (n: number) => 900 + n;

const fx = (round: string, home: number, away: number, day = 1): FixtureRef => ({
  round,
  homeApiTeamId: home,
  awayApiTeamId: away,
  kickoffAt: `2026-09-${String(day).padStart(2, '0')}T18:00:00+00:00`,
});

/** n팀이 붙는 라운드 — n/2 경기 */
const roundOf = (round: string, ids: number[], day = 1): FixtureRef[] =>
  ids.filter((_, i) => i % 2 === 0).map((_, i) => fx(round, ids[i * 2], ids[i * 2 + 1], day));

const topFlight = (...ns: number[]) => new Set(ns.map(TOP));

describe('라운드 컷 판정', () => {
  it('리그 — 모든 라운드가 1부라 아무것도 잘리지 않는다', () => {
    const r = resolveRoundScope({
      roundNames: ['Regular Season - 1', 'Regular Season - 2'],
      fixtures: [
        ...roundOf('Regular Season - 1', [TOP(1), TOP(2), TOP(3), TOP(4)]),
        ...roundOf('Regular Season - 2', [TOP(1), TOP(3), TOP(2), TOP(4)], 8),
      ],
      topFlightApiTeamIds: topFlight(1, 2, 3, 4),
    });
    expect(r.cutOrdinal).toBe(0);
    expect(r.rounds.every((x) => x.included)).toBe(true);
    expect(r.rounds.every((x) => x.hasTopFlight)).toBe(true);
  });

  it('UCL — 1부 팀이 없는 예선은 잘리고 리그페이즈부터 들어온다', () => {
    const r = resolveRoundScope({
      roundNames: ['1st Qualifying Round', '2nd Qualifying Round', 'League Stage - 1'],
      fixtures: [
        ...roundOf('1st Qualifying Round', [LOW(1), LOW(2), LOW(3), LOW(4)]),
        ...roundOf('2nd Qualifying Round', [LOW(1), LOW(3)], 8),
        ...roundOf('League Stage - 1', [TOP(1), LOW(1), TOP(2), TOP(3)], 15),
      ],
      topFlightApiTeamIds: topFlight(1, 2, 3),
    });
    expect(r.cutOrdinal).toBe(2);
    expect(r.rounds.map((x) => x.included)).toEqual([false, false, true]);
    // 잘려도 번호는 원래 위치를 유지한다 — 나중에 앞을 채워도 다시 매기지 않는다
    expect(r.rounds.map((x) => x.ordinal)).toEqual([0, 1, 2]);
  });

  it('예선에 1부 팀이 끼면 컷이 앞당겨진다 — 그 팀 경기는 보여줘야 한다', () => {
    const r = resolveRoundScope({
      roundNames: ['Play-offs', 'League Stage - 1'],
      fixtures: [
        ...roundOf('Play-offs', [TOP(9), LOW(1)]),
        ...roundOf('League Stage - 1', [TOP(1), TOP(2)], 15),
      ],
      topFlightApiTeamIds: topFlight(1, 2, 9),
    });
    expect(r.cutOrdinal).toBe(0);
    expect(r.rounds.every((x) => x.included)).toBe(true);
  });

  it('1부 팀이 한 라운드에도 없으면 아무것도 저장하지 않는다', () => {
    const r = resolveRoundScope({
      roundNames: ['Qualifying'],
      fixtures: roundOf('Qualifying', [LOW(1), LOW(2)]),
      topFlightApiTeamIds: topFlight(1),
    });
    expect(r.cutOrdinal).toBeNull();
    expect(r.rounds.every((x) => !x.included)).toBe(true);
  });

  it('16강 이상 — 마지막부터 역순 연속만 인정한다 (예선이 16강으로 잡히지 않게)', () => {
    // 예선 4팀 → 32강 32팀 → 16강 16팀 → 8강 8팀
    const r = resolveRoundScope({
      roundNames: ['Preliminary', 'Round of 32', 'Round of 16', 'Quarter-finals'],
      fixtures: [
        ...roundOf('Preliminary', [LOW(1), LOW(2), LOW(3), LOW(4)]),
        ...roundOf('Round of 32', Array.from({ length: 32 }, (_, i) => TOP(i)), 8),
        ...roundOf('Round of 16', Array.from({ length: 16 }, (_, i) => TOP(i)), 15),
        ...roundOf('Quarter-finals', Array.from({ length: 8 }, (_, i) => TOP(i)), 22),
      ],
      topFlightApiTeamIds: topFlight(...Array.from({ length: 32 }, (_, i) => i)),
    });
    const byName = Object.fromEntries(r.rounds.map((x) => [x.name, x]));
    // 예선은 4팀이지만 16강이 아니다 — 32강에서 연속이 끊긴다
    expect(byName['Preliminary'].isLateStage).toBe(false);
    expect(byName['Round of 32'].isLateStage).toBe(false);
    expect(byName['Round of 16'].isLateStage).toBe(true);
    expect(byName['Quarter-finals'].isLateStage).toBe(true);
  });

  it('추첨 전 라운드(경기 0)는 16강 연속을 끊지도, 16강이 되지도 않는다', () => {
    const r = resolveRoundScope({
      roundNames: ['Round of 32', 'Round of 16', 'Final'],
      fixtures: [
        ...roundOf('Round of 32', Array.from({ length: 32 }, (_, i) => TOP(i))),
        ...roundOf('Round of 16', Array.from({ length: 16 }, (_, i) => TOP(i)), 8),
        // Final 은 아직 추첨 전 — 경기가 없다
      ],
      topFlightApiTeamIds: topFlight(...Array.from({ length: 32 }, (_, i) => i)),
    });
    const byName = Object.fromEntries(r.rounds.map((x) => [x.name, x]));
    expect(byName['Final'].matchCount).toBe(0);
    expect(byName['Final'].isLateStage).toBe(false);
    // Final 이 판정에서 빠져도 16강은 그대로 인정된다
    expect(byName['Round of 16'].isLateStage).toBe(true);
  });

  it('상세 수집 대상 — (1부 팀 참가) OR (16강 이상)', () => {
    const r = resolveRoundScope({
      roundNames: ['Round of 32', 'Round of 16'],
      fixtures: [
        // 32강은 하부팀끼리 — 1부 없음, 32팀이라 16강도 아님
        ...roundOf('Round of 32', Array.from({ length: 32 }, (_, i) => LOW(i))),
        // 16강도 하부팀끼리지만 16팀이라 후반 라운드다
        ...roundOf('Round of 16', Array.from({ length: 16 }, (_, i) => LOW(i)), 8),
      ],
      topFlightApiTeamIds: topFlight(1),
    });
    const byName = Object.fromEntries(r.rounds.map((x) => [x.name, x]));
    expect(byName['Round of 32'].detailEligible).toBe(false);
    expect(byName['Round of 16'].detailEligible).toBe(true);
  });

  it('라운드 목록에 없는 이름은 저장하지 않고 보고한다', () => {
    const r = resolveRoundScope({
      roundNames: ['Regular Season - 1'],
      fixtures: [...roundOf('Regular Season - 1', [TOP(1), TOP(2)]), fx('Relegation Play-off', TOP(1), TOP(2))],
      topFlightApiTeamIds: topFlight(1, 2),
    });
    expect(r.unknownRounds).toEqual(['Relegation Play-off']);
    expect(r.rounds).toHaveLength(1);
  });

  it('firstKickoffAt 은 그 라운드에서 가장 이른 경기다', () => {
    const r = resolveRoundScope({
      roundNames: ['Regular Season - 1'],
      fixtures: [fx('Regular Season - 1', TOP(1), TOP(2), 5), fx('Regular Season - 1', TOP(3), TOP(4), 3)],
      topFlightApiTeamIds: topFlight(1),
    });
    expect(r.rounds[0].firstKickoffAt).toContain('2026-09-03');
    expect(r.rounds[0].matchCount).toBe(2);
    expect(r.rounds[0].teamCount).toBe(4);
  });
});
