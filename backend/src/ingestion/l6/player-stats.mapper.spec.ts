/**
 * L6 매핑 — null 규칙 (DATA_RULES 3장 · 마이그레이션 20260908090000)
 *
 * 요점은 하나다: **API 가 전부 null 을 줘도 세 컬럼만 null 로 남고 나머지는 0 이 된다.**
 * 이 표가 깨지면 "도움 0인 시즌" 과 "도움 데이터가 없는 시즌" 이 화면에서 같아진다.
 */
import { describe, it, expect } from 'vitest';
import {
  parseMeasure,
  pickSeasonStats,
  rankingValueOf,
  toPlayerProfileRow,
  toPlayerSeasonStatRow,
  toTeamSeasonStatRow,
} from './player-stats.mapper.js';
import type { ApiPlayerSeason, ApiPlayerSeasonStat, ApiTeamStatistics } from '../api-football/api-football.types.js';

const NOW = '2026-09-08T00:00:00.000Z';
const IDS = { playerId: 1, teamId: 2, competitionSeasonId: 3 };

/** 모든 숫자 필드가 null 인 항목 — 과거 시즌 실측 모양 */
const nullStat = (league = 39, season = 2022): ApiPlayerSeasonStat => ({
  team: { id: 33, name: 'T', logo: null },
  league: { id: league, name: null, country: null, logo: null, flag: null, season },
  games: { appearences: null, lineups: null, minutes: null, number: null, position: null, rating: null, captain: null },
  substitutes: { in: null, out: null, bench: null },
  shots: { total: null, on: null },
  goals: { total: null, conceded: null, assists: null, saves: null },
  passes: { total: null, key: null, accuracy: null },
  tackles: { total: null, blocks: null, interceptions: null },
  duels: { total: null, won: null },
  dribbles: { attempts: null, success: null, past: null },
  fouls: { drawn: null, committed: null },
  cards: { yellow: null, yellowred: null, red: null },
  penalty: { won: null, commited: null, scored: null, missed: null, saved: null },
});

describe('player-stats.mapper — null 규칙', () => {
  it('전부 null 이면 세 컬럼만 null 이고 나머지는 0 이다', () => {
    const row = toPlayerSeasonStatRow(nullStat(), IDS, NOW);

    // ★ null 을 지키는 셋
    expect(row.assists).toBeNull();
    expect(row.yellowred_cards).toBeNull();
    expect(row.passes_key).toBeNull();
    // 3-2 — 평점 0점과 평점 없음은 다르다
    expect(row.rating_avg).toBeNull();

    // 3-1 — 0 으로 접는 것들
    expect(row.appearances).toBe(0);
    expect(row.lineups_count).toBe(0);
    expect(row.minutes).toBe(0);
    expect(row.goals).toBe(0);
    expect(row.yellow_cards).toBe(0);
    expect(row.red_cards).toBe(0);
    expect(row.shots_total).toBe(0);
    expect(row.shots_on).toBe(0);
    expect(row.tackles_total).toBe(0);
    expect(row.interceptions).toBe(0);
    expect(row.duels_total).toBe(0);
    expect(row.duels_won).toBe(0);
    expect(row.dribbles_success).toBe(0);

    expect(row.source).toBe('API');
    expect(row.as_of).toBe(NOW);
  });

  it('0 은 0 으로 남는다 — null 로 바뀌지 않는다', () => {
    const st = nullStat();
    st.goals.assists = 0;
    st.cards.yellowred = 0;
    st.passes.key = 0;
    const row = toPlayerSeasonStatRow(st, IDS, NOW);
    expect(row.assists).toBe(0);
    expect(row.yellowred_cards).toBe(0);
    expect(row.passes_key).toBe(0);
  });

  it('rating 은 문자열 그대로 넘긴다 — 우리가 반올림하지 않는다', () => {
    const st = nullStat();
    st.games.rating = '7.062500';
    expect(toPlayerSeasonStatRow(st, IDS, NOW).rating_avg).toBe('7.062500');
  });

  it('값이 있으면 그대로 매핑한다', () => {
    const st = nullStat();
    st.games.appearences = 30;
    st.games.lineups = 28;
    st.games.minutes = 2500;
    st.goals.total = 12;
    st.goals.assists = 7;
    st.cards.yellow = 4;
    st.cards.yellowred = 1;
    st.cards.red = 0;
    st.shots.total = 60;
    st.shots.on = 25;
    st.passes.key = 33;
    st.tackles.total = 18;
    st.tackles.interceptions = 9;
    st.duels.total = 200;
    st.duels.won = 110;
    st.dribbles.success = 40;
    const row = toPlayerSeasonStatRow(st, IDS, NOW);
    expect(row).toMatchObject({
      appearances: 30, lineups_count: 28, minutes: 2500, goals: 12, assists: 7,
      yellow_cards: 4, yellowred_cards: 1, red_cards: 0,
      shots_total: 60, shots_on: 25, passes_key: 33,
      tackles_total: 18, interceptions: 9, duels_total: 200, duels_won: 110, dribbles_success: 40,
    });
  });
});

describe('pickSeasonStats — statistics[] 필터', () => {
  const entry = (stats: ApiPlayerSeasonStat[]): ApiPlayerSeason => ({
    player: { id: 1, name: 'P', firstname: null, lastname: null, age: null, birth: { date: null, place: null, country: null }, nationality: null, height: null, weight: null, injured: false, photo: null },
    statistics: stats,
  });

  it('다른 대회 · 다른 시즌 항목을 버린다', () => {
    const mine = nullStat(39, 2022);
    const otherLeague = nullStat(140, 2022);
    const otherSeason = nullStat(39, 2023);
    const picked = pickSeasonStats(entry([otherLeague, mine, otherSeason]), 39, 2022);
    expect(picked).toEqual([mine]);
  });

  it('이적 선수는 같은 대회시즌에 팀별 항목이 여럿 남는다', () => {
    const a = nullStat(39, 2022);
    const b = nullStat(39, 2022);
    b.team.id = 34;
    const picked = pickSeasonStats(entry([a, b]), 39, 2022);
    expect(picked.map((s) => s.team.id)).toEqual([33, 34]);
  });

  it('statistics 가 비어도 터지지 않는다', () => {
    expect(pickSeasonStats(entry([]), 39, 2022)).toEqual([]);
  });
});

describe('parseMeasure', () => {
  it.each([
    ['190 cm', 190],
    ['190', 190],
    ['84 kg', 84],
    [null, null],
    ['', null],
    ['unknown', null],
  ])('%s → %s', (input, expected) => {
    expect(parseMeasure(input as string | null)).toBe(expected);
  });
});

describe('toPlayerProfileRow — profile_fetched_at 가드', () => {
  const player = (over: Partial<ApiPlayerSeason['player']> = {}): ApiPlayerSeason['player'] => ({
    id: 100, name: 'Someone', firstname: null, lastname: null, age: null,
    birth: { date: null, place: null, country: null },
    nationality: null, height: null, weight: null, injured: false, photo: null,
    ...over,
  });

  it('birth.date 도 nationality 도 없으면 null — L1 #9 가 이 선수를 건너뛰면 안 된다', () => {
    expect(toPlayerProfileRow(player(), NOW).profile_fetched_at).toBeNull();
  });

  it('birth.date 만 있어도 세운다', () => {
    const row = toPlayerProfileRow(player({ birth: { date: '1995-02-05', place: 'X', country: 'Y' } }), NOW);
    expect(row.profile_fetched_at).toBe(NOW);
    expect(row.birth_date).toBe('1995-02-05');
  });

  it('nationality 만 있어도 세운다', () => {
    expect(toPlayerProfileRow(player({ nationality: 'Korea' }), NOW).profile_fetched_at).toBe(NOW);
  });

  it('height · weight 는 cm/kg 를 떼고 정수로', () => {
    const row = toPlayerProfileRow(player({ height: '190 cm', weight: '84 kg' }), NOW);
    expect(row.height_cm).toBe(190);
    expect(row.weight_kg).toBe(84);
  });
});

describe('rankingValueOf', () => {
  it('카테고리마다 다른 필드를 본다', () => {
    const st = nullStat();
    st.goals.total = 30;
    st.goals.assists = 12;
    st.cards.yellow = 9;
    st.cards.red = 2;
    expect(rankingValueOf(st, 'SCORERS')).toBe(30);
    expect(rankingValueOf(st, 'ASSISTS')).toBe(12);
    expect(rankingValueOf(st, 'YELLOW_CARDS')).toBe(9);
    expect(rankingValueOf(st, 'RED_CARDS')).toBe(2);
  });

  it('null 이면 null — 0 으로 접지 않는다 (0골 득점왕을 만들지 않는다)', () => {
    expect(rankingValueOf(nullStat(), 'SCORERS')).toBeNull();
  });
});

describe('toTeamSeasonStatRow', () => {
  const stats = (): ApiTeamStatistics => ({
    league: { id: 39, name: null, country: null, logo: null, flag: null, season: 2026 },
    team: { id: 33, name: 'T', logo: null },
    form: 'WWDLW',
    fixtures: {
      played: { home: 5, away: 4, total: 9 },
      wins: { home: 3, away: 1, total: 4 },
      draws: { home: 1, away: 2, total: 3 },
      loses: { home: 1, away: 1, total: 2 },
    },
    goals: {
      for: { total: { home: 10, away: 6, total: 16 } },
      against: { total: { home: 4, away: 5, total: 9 } },
    },
    biggest: {
      streak: { wins: 3, draws: 1, loses: 1 },
      // 원정 최다승이 없다 — null 이 "해당 없음" 이다
      wins: { home: '4-0', away: null },
      loses: { home: null, away: '0-3' },
      goals: { for: { home: 4, away: 2 }, against: { home: 2, away: 3 } },
    },
    clean_sheet: { home: 2, away: 1, total: 3 },
    failed_to_score: { home: 0, away: 2, total: 2 },
    penalty: { scored: { total: 2, percentage: '100%' }, missed: { total: 0, percentage: '0%' }, total: 2 },
    lineups: [{ formation: '4-3-3', played: 7 }, { formation: '4-2-3-1', played: 2 }],
    cards: { yellow: { '0-15': { total: 1, percentage: '10%' } }, red: {} },
  });

  it('숫자는 접고 biggest_* 는 null 을 지킨다', () => {
    const row = toTeamSeasonStatRow(stats(), { competitionSeasonId: 3, teamId: 2 }, NOW);
    expect(row).toMatchObject({
      form: 'WWDLW',
      played_home: 5, played_away: 4, played_total: 9,
      wins_home: 3, wins_away: 1, draws_home: 1, draws_away: 2, loses_home: 1, loses_away: 1,
      goals_for_home: 10, goals_for_away: 6, goals_against_home: 4, goals_against_away: 5,
      biggest_win_home: '4-0', biggest_win_away: null,
      biggest_lose_home: null, biggest_lose_away: '0-3',
      clean_sheet_total: 3, failed_to_score_total: 2,
      penalty_scored: 2, penalty_missed: 0,
    });
    expect(row.formations).toEqual([{ formation: '4-3-3', played: 7 }, { formation: '4-2-3-1', played: 2 }]);
    expect(row.cards).toEqual({ yellow: { '0-15': { total: 1, percentage: '10%' } }, red: {} });
  });

  it('시즌 시작 전 — 전부 null 이면 0 으로 접고 form 만 null 로 둔다', () => {
    const s = stats();
    s.form = null;
    s.fixtures.played = { home: null, away: null, total: null };
    s.goals.for.total = { home: null, away: null, total: null };
    s.clean_sheet = { home: null, away: null, total: null };
    s.penalty.scored.total = null;
    const row = toTeamSeasonStatRow(s, { competitionSeasonId: 3, teamId: 2 }, NOW);
    expect(row.form).toBeNull();
    expect(row.played_total).toBe(0);
    expect(row.goals_for_home).toBe(0);
    expect(row.clean_sheet_total).toBe(0);
    expect(row.penalty_scored).toBe(0);
  });
});
