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

// feat/scope-expansion 판 (2026-09-17) — 본선 판정 (isMainStage) · 팀 수 연속 3 이상
describe('본선 판정 (isMainStage)', () => {
  // 리그페이즈 8라운드에 36팀이 다 참가하되 3개 라운드만 시뮬 (연속 3 임계에 걸리게)
  // 5대리그 팀은 TOP(1)~TOP(15) · 나머지 21팀은 LOW · 이 3라운드 중 첫 두 라운드는 비5대리그 맞대결만
  const LEAGUE_STAGE_TEAMS = Array.from({ length: 36 }, (_, i) => (i < 15 ? TOP(i) : LOW(i - 15)));

  it('UCL 리그페이즈 비5대리그 맞대결이 (신규) 상세 대상에 포함된다', () => {
    // League Stage 1~3: 36팀 유지 → 연속 3 → isMainStage=true → detailEligible=true
    // 비5대리그 팀만 붙는 경기여도 hasTopFlight=false 인데 isMainStage=true 로 잡힘
    const r = resolveRoundScope({
      roundNames: ['League Stage - 1', 'League Stage - 2', 'League Stage - 3'],
      fixtures: [
        ...roundOf('League Stage - 1', LEAGUE_STAGE_TEAMS),
        ...roundOf('League Stage - 2', LEAGUE_STAGE_TEAMS),
        ...roundOf('League Stage - 3', LEAGUE_STAGE_TEAMS),
      ],
      topFlightApiTeamIds: topFlight(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15),
    });
    const byName = Object.fromEntries(r.rounds.map((rr) => [rr.name, rr]));
    // 세 라운드 다 팀 수 36 · 연속 3 → 본선
    expect(byName['League Stage - 1'].isMainStage).toBe(true);
    expect(byName['League Stage - 2'].isMainStage).toBe(true);
    expect(byName['League Stage - 3'].isMainStage).toBe(true);
    // 세 라운드 다 hasTopFlight=true (5대리그 팀 15명 포함) 이므로 detailEligible 은 무관 확정
    // 비5대리그 맞대결도 라운드 수준에서 잡힘 (라운드 = 대상 최소 단위)
    expect(byName['League Stage - 1'].detailEligible).toBe(true);
  });

  it('UEFA 예선 라운드는 여전히 제외된다 (연속 1)', () => {
    // Q1(14팀) · Q2(18팀) · Q3(26팀) — 팀 수 다 다름 · 연속 1 · isMainStage=false
    // 5대리그 팀 없으므로 hasTopFlight=false · isLateStage 도 false (팀 수 > 16)
    const Q1_TEAMS = Array.from({ length: 14 }, (_, i) => LOW(i));
    const Q2_TEAMS = Array.from({ length: 18 }, (_, i) => LOW(20 + i));
    const Q3_TEAMS = Array.from({ length: 26 }, (_, i) => LOW(40 + i));
    const r = resolveRoundScope({
      roundNames: ['1st Qualifying Round', '2nd Qualifying Round', '3rd Qualifying Round'],
      fixtures: [
        ...roundOf('1st Qualifying Round', Q1_TEAMS),
        ...roundOf('2nd Qualifying Round', Q2_TEAMS),
        ...roundOf('3rd Qualifying Round', Q3_TEAMS),
      ],
      topFlightApiTeamIds: topFlight(1),
    });
    for (const rr of r.rounds) {
      expect(rr.isMainStage).toBe(false);
      expect(rr.detailEligible).toBe(false);
    }
    // 5대리그 팀 하나도 없으므로 cutOrdinal=null → included 도 다 false
    expect(r.cutOrdinal).toBeNull();
  });

  it('국내 컵 (팀 수 계속 감소) 판정은 바뀌지 않는다', () => {
    // Round of 64(64팀) → Round of 32(32) → Round of 16(16) → QF(8) → SF(4) → F(2)
    // 팀 수 계속 감소 · 연속 1 · isMainStage=false · isLateStage 는 R16 부터
    const round = (size: number) => Array.from({ length: size }, (_, i) => (i < 4 ? TOP(i) : LOW(i)));
    const r = resolveRoundScope({
      roundNames: ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'],
      fixtures: [
        ...roundOf('Round of 64', round(64)),
        ...roundOf('Round of 32', round(32)),
        ...roundOf('Round of 16', round(16)),
        ...roundOf('Quarter-finals', round(8)),
        ...roundOf('Semi-finals', round(4)),
        ...roundOf('Final', round(2)),
      ],
      topFlightApiTeamIds: topFlight(0, 1, 2, 3),
    });
    for (const rr of r.rounds) {
      expect(rr.isMainStage).toBe(false); // 컵은 본선 개념 없음
    }
    // detailEligible 은 기존 규칙(hasTopFlight OR isLateStage) 대로
    const byName = Object.fromEntries(r.rounds.map((rr) => [rr.name, rr]));
    expect(byName['Round of 64'].detailEligible).toBe(true);  // hasTopFlight
    expect(byName['Round of 16'].detailEligible).toBe(true);  // isLateStage
  });

  it('2022·2023 구 조별리그(32팀 유지)에서도 본선으로 잡힌다', () => {
    const GROUP_TEAMS = Array.from({ length: 32 }, (_, i) => (i < 10 ? TOP(i) : LOW(i - 10)));
    const r = resolveRoundScope({
      roundNames: ['Group Stage - 1', 'Group Stage - 2', 'Group Stage - 3'],
      fixtures: [
        ...roundOf('Group Stage - 1', GROUP_TEAMS),
        ...roundOf('Group Stage - 2', GROUP_TEAMS),
        ...roundOf('Group Stage - 3', GROUP_TEAMS),
      ],
      topFlightApiTeamIds: topFlight(0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    });
    for (const rr of r.rounds) {
      expect(rr.isMainStage).toBe(true);
    }
  });

  it('경기 없는 라운드(추첨 전 · 팀 수 0)는 판정 유예 · 연속을 끊는다', () => {
    // League Stage - 1(36팀) · League Stage - 2(0 · 추첨 전) · League Stage - 3(36팀)
    // 팀 수 0 은 판정에서 빠지고 연속도 리셋 → 1,3 은 연속 1 · isMainStage=false
    const TEAMS = Array.from({ length: 36 }, (_, i) => TOP(i));
    const r = resolveRoundScope({
      roundNames: ['League Stage - 1', 'League Stage - 2', 'League Stage - 3'],
      fixtures: [
        ...roundOf('League Stage - 1', TEAMS),
        // League Stage - 2 는 경기 0
        ...roundOf('League Stage - 3', TEAMS),
      ],
      topFlightApiTeamIds: topFlight(0),
    });
    const byName = Object.fromEntries(r.rounds.map((rr) => [rr.name, rr]));
    expect(byName['League Stage - 2'].isMainStage).toBe(false); // 팀 수 0
    // 1·3 도 연속이 끊겨 각각 길이 1 → isMainStage=false
    expect(byName['League Stage - 1'].isMainStage).toBe(false);
    expect(byName['League Stage - 3'].isMainStage).toBe(false);
    // 다만 hasTopFlight=true 라 detailEligible 은 그대로 true
    expect(byName['League Stage - 1'].detailEligible).toBe(true);
  });
});
