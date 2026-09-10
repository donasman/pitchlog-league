/**
 * response-compaction 단위 — 승인된 shape 를 필드로 잠근다.
 * - 도구 10개 각 압축 shape · 원본 mutation 없음
 * - form 5글자 유지 (get_standings)
 * - assists null 유지 (get_player)
 * - ht/ft/et/pen null 판정 (get_match)
 * - primaryTeam null 유지 (get_player)
 */
import { compressForModel } from './response-compaction.js';

interface AnyObj {
  [k: string]: unknown;
}

function assertKeys(obj: AnyObj, keys: string[]): void {
  expect(Object.keys(obj).sort()).toEqual([...keys].sort());
}

describe('compressForModel', () => {
  it('unknown 도구 이름 → 원본 그대로', () => {
    const src = { foo: 1 };
    expect(compressForModel('nope_no_tool', src)).toBe(src);
  });

  // ─── get_standings ─────────────────────────────────
  describe('get_standings', () => {
    const raw = {
      items: [
        {
          competition: {
            ref: '39-premier-league',
            apiId: 39,
            displayName: 'Premier League',
            shortDisplayName: 'EPL',
            originalName: 'Premier League',
            type: 'LEAGUE',
            format: 'ROUND_ROBIN',
          },
          season: {
            year: 2026,
            label: '2026-27',
            status: 'IN_PROGRESS',
            dataState: 'PARTIAL',
            isCurrent: true,
            startDate: '2026-08-15',
            endDate: '2027-05-30',
          },
          unavailableReason: null,
          asOf: '2026-09-10T00:00:00.000Z',
          rows: [
            {
              team: {
                ref: '33-manchester-united',
                apiId: 33,
                displayName: 'Manchester United',
                shortDisplayName: 'Man Utd',
                originalName: 'Manchester United',
                code: 'MUN',
                country: 'England',
                founded: 1878,
                logoUrl: 'https://...',
              },
              groupName: null,
              rank: 1,
              points: 25,
              played: 10,
              win: 8,
              draw: 1,
              lose: 1,
              goalsFor: 24,
              goalsAgainst: 8,
              goalDiff: 16,
              home: { played: 5, win: 4, draw: 1, lose: 0, gf: 12, ga: 3 },
              away: { played: 5, win: 4, draw: 0, lose: 1, gf: 12, ga: 5 },
              form: 'WWDLW',
              description: 'Promotion',
              status: 'same',
              asOf: '2026-09-10T00:00:00.000Z',
            },
          ],
        },
      ],
      asOf: '2026-09-10T00:00:00.000Z',
    };

    it('shape 잠금', () => {
      const rawCopy = JSON.parse(JSON.stringify(raw));
      const c = compressForModel('get_standings', raw) as AnyObj;
      // 원본 mutation 금지
      expect(raw).toEqual(rawCopy);

      assertKeys(c, ['items', 'asOf']);
      const item = (c.items as AnyObj[])[0]!;
      assertKeys(item, ['competition', 'season', 'unavailableReason', 'asOf', 'rows']);
      assertKeys(item.competition as AnyObj, ['ref']);
      assertKeys(item.season as AnyObj, ['year']);

      const row = (item.rows as AnyObj[])[0]!;
      assertKeys(row, [
        'rank',
        'groupName',
        'team',
        'played',
        'win',
        'draw',
        'lose',
        'goalsFor',
        'goalsAgainst',
        'goalDiff',
        'points',
        'form',
      ]);
      assertKeys(row.team as AnyObj, ['ref', 'displayName']);
      expect(row.form).toBe('WWDLW');
      expect((row.form as string).length).toBe(5);
    });

    it('groupName · unavailableReason null 유지', () => {
      const c = compressForModel('get_standings', raw) as AnyObj;
      const item = (c.items as AnyObj[])[0]!;
      expect(item.unavailableReason).toBeNull();
      const row = (item.rows as AnyObj[])[0]!;
      expect(row.groupName).toBeNull();
    });
  });

  // ─── list_matches ─────────────────────────────────
  describe('list_matches', () => {
    const raw = {
      total: 3,
      hasMore: false,
      items: [
        {
          id: 1234567,
          kickoffAt: '2026-11-22T15:00:00.000Z',
          statusShort: 'FT',
          statusLong: 'Match Finished',
          elapsed: 90,
          extraElapsed: null,
          statsState: 'NONE',
          confirmedAt: null,
          goals: { home: 2, away: 1 },
          ht: { home: 1, away: 0 },
          ft: { home: 2, away: 1 },
          et: { home: null, away: null },
          pen: { home: null, away: null },
          winnerTeamRef: '33-manchester-united',
          home: {
            ref: '33-manchester-united',
            displayName: 'Manchester United',
            shortDisplayName: 'Man Utd',
            originalName: 'Manchester United',
            apiId: 33,
            code: 'MUN',
            country: 'England',
            founded: 1878,
            logoUrl: 'x',
          },
          away: {
            ref: '40-liverpool',
            displayName: 'Liverpool',
            shortDisplayName: 'LIV',
            originalName: 'Liverpool',
            apiId: 40,
            code: 'LIV',
            country: 'England',
            founded: 1892,
            logoUrl: 'x',
          },
          competition: {
            ref: '39-premier-league',
            apiId: 39,
            displayName: 'Premier League',
            shortDisplayName: 'EPL',
            originalName: 'Premier League',
            type: 'LEAGUE',
            format: 'ROUND_ROBIN',
          },
          season: { year: 2026, label: '2026-27' },
          round: { name: 'Regular Season - 12', ordinal: 12, matchCount: 10, isLateStage: false },
          venue: { name: 'Old Trafford', city: 'Manchester' },
          referee: 'M. Oliver',
          leg: null,
          detailEligible: true,
          hasEvents: null,
          hasLineups: null,
          hasTeamStats: null,
          hasPlayerStats: null,
          asOf: '2026-09-10T00:00:00.000Z',
        },
      ],
      season: null,
      asOf: '2026-09-10T00:00:00.000Z',
    };

    it('shape 잠금', () => {
      const rawCopy = JSON.parse(JSON.stringify(raw));
      const c = compressForModel('list_matches', raw) as AnyObj;
      expect(raw).toEqual(rawCopy);

      assertKeys(c, ['total', 'hasMore', 'items']);
      const item = (c.items as AnyObj[])[0]!;
      assertKeys(item, ['id', 'kickoffAt', 'statusShort', 'goals', 'home', 'away', 'competition', 'round']);
      assertKeys(item.goals as AnyObj, ['home', 'away']);
      assertKeys(item.home as AnyObj, ['ref', 'displayName']);
      assertKeys(item.away as AnyObj, ['ref', 'displayName']);
      assertKeys(item.competition as AnyObj, ['ref']);
      assertKeys(item.round as AnyObj, ['name']);
      // ht/ft/et/pen · statusLong · referee · venue · has_* · leg 등이 안 나가야 한다
      expect(item).not.toHaveProperty('ht');
      expect(item).not.toHaveProperty('ft');
      expect(item).not.toHaveProperty('et');
      expect(item).not.toHaveProperty('pen');
      expect(item).not.toHaveProperty('venue');
      expect(item).not.toHaveProperty('referee');
      expect(item).not.toHaveProperty('statusLong');
      expect(item).not.toHaveProperty('hasEvents');
      expect(item).not.toHaveProperty('leg');
      expect(item).not.toHaveProperty('detailEligible');
      expect(item).not.toHaveProperty('statsState');
      expect(item).not.toHaveProperty('season');
      expect(item).not.toHaveProperty('asOf');
    });

    it('goals null 유지 (NS 경기)', () => {
      const ns = JSON.parse(JSON.stringify(raw)) as unknown as AnyObj;
      const item0 = (ns.items as AnyObj[])[0]!;
      item0.goals = { home: null, away: null };
      const c = compressForModel('list_matches', ns) as AnyObj;
      const item = (c.items as AnyObj[])[0]!;
      expect(item.goals).toEqual({ home: null, away: null });
    });
  });

  // ─── get_match ─────────────────────────────────
  describe('get_match', () => {
    const baseRaw = {
      id: 1622630,
      kickoffAt: '2026-08-21T14:00:00.000Z',
      statusShort: 'AET',
      statusLong: 'Match Finished After Extra Time',
      elapsed: 120,
      extraElapsed: null,
      statsState: 'NONE',
      confirmedAt: null,
      goals: { home: 3, away: 3 },
      ht: { home: 1, away: 2 },
      ft: { home: 2, away: 2 },
      et: { home: 3, away: 3 },
      pen: { home: 5, away: 4 },
      winnerTeamRef: '33-manchester-united',
      home: {
        ref: '33-manchester-united',
        apiId: 33,
        displayName: 'Manchester United',
        shortDisplayName: 'Man Utd',
        originalName: 'Manchester United',
        code: 'MUN',
        country: 'England',
        founded: 1878,
        logoUrl: 'x',
      },
      away: {
        ref: '40-liverpool',
        apiId: 40,
        displayName: 'Liverpool',
        shortDisplayName: 'LIV',
        originalName: 'Liverpool',
        code: 'LIV',
        country: 'England',
        founded: 1892,
        logoUrl: 'x',
      },
      competition: {
        ref: '2-champions-league',
        apiId: 2,
        displayName: 'UEFA Champions League',
        shortDisplayName: 'UCL',
        originalName: 'UEFA Champions League',
        type: 'CUP',
        format: 'LEAGUE_PHASE_KNOCKOUT',
      },
      season: { year: 2026, label: '2026-27' },
      round: { name: 'Final', ordinal: 100, matchCount: 1, isLateStage: true },
      venue: { name: 'Wembley', city: 'London' },
      referee: 'M. Oliver',
      leg: 'ONLY',
      detailEligible: true,
      hasEvents: true,
      hasLineups: true,
      hasTeamStats: true,
      hasPlayerStats: true,
      asOf: '2026-09-10T00:00:00.000Z',
    };

    it('shape 잠금 (연장·승부차기 포함)', () => {
      const rawCopy = JSON.parse(JSON.stringify(baseRaw));
      const c = compressForModel('get_match', baseRaw) as AnyObj;
      expect(baseRaw).toEqual(rawCopy);

      assertKeys(c, [
        'id',
        'kickoffAt',
        'statusShort',
        'goals',
        'home',
        'away',
        'competition',
        'round',
        'statusLong',
        'referee',
        'winnerTeamRef',
        'venue',
        'ht',
        'ft',
        'et',
        'pen',
      ]);
      expect(c.ht).toEqual({ home: 1, away: 2 });
      expect(c.ft).toEqual({ home: 2, away: 2 });
      expect(c.et).toEqual({ home: 3, away: 3 });
      expect(c.pen).toEqual({ home: 5, away: 4 });
      expect(c.venue).toEqual({ name: 'Wembley', city: 'London' });
    });

    it('연장 없었으면 et = null · 승부차기 없었으면 pen = null', () => {
      const raw = JSON.parse(JSON.stringify(baseRaw)) as typeof baseRaw;
      raw.et = { home: null as unknown as number, away: null as unknown as number };
      raw.pen = { home: null as unknown as number, away: null as unknown as number };
      const c = compressForModel('get_match', raw) as AnyObj;
      expect(c.et).toBeNull();
      expect(c.pen).toBeNull();
      // ht·ft 는 여전히 있어야 한다
      expect(c.ht).toEqual({ home: 1, away: 2 });
      expect(c.ft).toEqual({ home: 2, away: 2 });
    });

    it('venue null 그대로', () => {
      const raw = JSON.parse(JSON.stringify(baseRaw)) as typeof baseRaw;
      (raw as unknown as AnyObj).venue = null;
      const c = compressForModel('get_match', raw) as AnyObj;
      expect(c.venue).toBeNull();
    });
  });

  // ─── list_competitions ─────────────────────────────
  it('list_competitions shape', () => {
    const raw = {
      items: [
        {
          ref: '39-premier-league',
          apiId: 39,
          displayName: 'Premier League',
          shortDisplayName: 'EPL',
          originalName: 'Premier League',
          country: 'England',
          countryCode: 'GB-ENG',
          type: 'LEAGUE',
          format: 'ROUND_ROBIN',
          logoUrl: 'x',
          displayOrder: 10,
          currentSeason: {
            year: 2026,
            label: '2026-27',
            status: 'IN_PROGRESS',
            isCurrent: true,
            dataState: 'PARTIAL',
            startDate: '2026-08-15',
            endDate: '2027-05-30',
          },
        },
      ],
      asOf: '2026-09-10T00:00:00.000Z',
    };
    const c = compressForModel('list_competitions', raw) as AnyObj;
    assertKeys(c, ['items']);
    const item = (c.items as AnyObj[])[0]!;
    assertKeys(item, ['ref', 'displayName', 'type', 'format', 'currentSeason']);
    assertKeys(item.currentSeason as AnyObj, ['year', 'dataState']);
  });

  // ─── get_competition ────────────────────────────────
  it('get_competition shape', () => {
    const raw = {
      ref: '39-premier-league',
      apiId: 39,
      displayName: 'Premier League',
      shortDisplayName: 'EPL',
      originalName: 'Premier League',
      country: 'England',
      countryCode: 'GB-ENG',
      type: 'LEAGUE',
      format: 'ROUND_ROBIN',
      logoUrl: 'x',
      displayOrder: 10,
      currentSeason: null,
      topFlightRef: null,
      seasons: [
        { year: 2026, label: '2026-27', status: 'IN_PROGRESS', dataState: 'PARTIAL', isCurrent: true, startDate: null, endDate: null },
        { year: 2025, label: '2025-26', status: 'FINISHED', dataState: 'COMPLETE', isCurrent: false, startDate: null, endDate: null },
      ],
      asOf: '2026-09-10T00:00:00.000Z',
    };
    const c = compressForModel('get_competition', raw) as AnyObj;
    assertKeys(c, ['ref', 'displayName', 'country', 'type', 'format', 'topFlightRef', 'seasons']);
    const s0 = (c.seasons as AnyObj[])[0]!;
    assertKeys(s0, ['year', 'dataState']);
  });

  // ─── list_teams ────────────────────────────────────
  it('list_teams shape', () => {
    const raw = {
      competitionRef: '39-premier-league',
      season: { year: 2026 } as AnyObj,
      items: [
        {
          ref: '33-manchester-united',
          apiId: 33,
          displayName: 'Manchester United',
          shortDisplayName: 'Man Utd',
          originalName: 'Manchester United',
          code: 'MUN',
          country: 'England',
          founded: 1878,
          logoUrl: 'x',
        },
      ],
      asOf: '2026-09-10T00:00:00.000Z',
    };
    const c = compressForModel('list_teams', raw) as AnyObj;
    assertKeys(c, ['items']);
    const item = (c.items as AnyObj[])[0]!;
    assertKeys(item, ['ref', 'displayName', 'country', 'founded']);
  });

  // ─── get_team ───────────────────────────────────────
  it('get_team shape (venue 있음)', () => {
    const raw = {
      ref: '33-manchester-united',
      apiId: 33,
      displayName: 'Manchester United',
      shortDisplayName: 'Man Utd',
      originalName: 'Manchester United',
      code: 'MUN',
      country: 'England',
      founded: 1878,
      logoUrl: 'x',
      venue: { name: 'Old Trafford', city: 'Manchester', capacity: 76212, surface: 'grass', imageUrl: 'x' },
      participations: [
        { competitionRef: '39-premier-league', competitionName: 'Premier League', seasons: [2026, 2025] },
      ],
      asOf: '2026-09-10T00:00:00.000Z',
    };
    const c = compressForModel('get_team', raw) as AnyObj;
    assertKeys(c, ['ref', 'displayName', 'country', 'founded', 'venue', 'participations']);
    assertKeys(c.venue as AnyObj, ['name', 'city', 'capacity']);
    const par = (c.participations as AnyObj[])[0]!;
    assertKeys(par, ['competitionRef', 'seasons']);
  });

  it('get_team — venue null 이면 venue 키 없음', () => {
    const raw = {
      ref: '33-x',
      apiId: 33,
      displayName: 'X',
      shortDisplayName: 'X',
      originalName: 'X',
      code: null,
      country: null,
      founded: null,
      logoUrl: null,
      venue: null,
      participations: [],
      asOf: '2026-09-10T00:00:00.000Z',
    };
    const c = compressForModel('get_team', raw) as AnyObj;
    expect(c).not.toHaveProperty('venue');
  });

  // ─── get_player ────────────────────────────────────
  describe('get_player', () => {
    const raw = {
      ref: '909-lionel-messi',
      apiId: 909,
      displayName: 'Lionel Messi',
      shortDisplayName: 'L. Messi',
      originalName: 'Lionel Messi',
      photoUrl: 'x',
      firstname: 'Lionel',
      lastname: 'Messi',
      nationality: 'Argentina',
      birthDate: '1987-06-24',
      birthPlace: 'Rosario',
      birthCountry: 'Argentina',
      heightCm: 170,
      weightKg: 72,
      jerseyNumber: 10,
      position: 'Attacker',
      primaryTeam: {
        ref: '85-psg',
        apiId: 85,
        displayName: 'Paris Saint Germain',
        shortDisplayName: 'PSG',
        originalName: 'Paris Saint Germain',
        code: 'PSG',
        country: 'France',
        founded: 1970,
        logoUrl: 'x',
      },
      seasonStats: [
        {
          competition: {
            ref: '39-premier-league',
            apiId: 39,
            displayName: 'Premier League',
            shortDisplayName: 'EPL',
            originalName: 'Premier League',
            type: 'LEAGUE',
            format: 'ROUND_ROBIN',
          },
          season: { year: 2026, label: '2026-27', dataState: 'PARTIAL', status: 'IN_PROGRESS', isCurrent: true, startDate: null, endDate: null },
          team: {
            ref: '85-psg',
            apiId: 85,
            displayName: 'Paris Saint Germain',
            shortDisplayName: 'PSG',
            originalName: 'Paris Saint Germain',
            code: 'PSG',
            country: 'France',
            founded: 1970,
            logoUrl: 'x',
          },
          appearances: 30,
          starts: 28,
          minutes: 2500,
          goals: 12,
          assists: null,
          yellowCards: 4,
          yellowredCards: 0,
          redCards: 0,
        },
      ],
      totals: { appearances: 300, minutes: 25000, goals: 250, assists: null, yellowCards: 40, redCards: 2 },
      asOf: '2026-09-10T00:00:00.000Z',
    };

    it('shape 잠금 + assists null 유지 + primaryTeam displayName·ref 만', () => {
      const rawCopy = JSON.parse(JSON.stringify(raw));
      const c = compressForModel('get_player', raw) as AnyObj;
      expect(raw).toEqual(rawCopy);

      assertKeys(c, [
        'ref',
        'displayName',
        'birthDate',
        'birthPlace',
        'birthCountry',
        'nationality',
        'position',
        'jerseyNumber',
        'heightCm',
        'weightKg',
        'primaryTeam',
        'seasonStats',
        'totals',
      ]);
      assertKeys(c.primaryTeam as AnyObj, ['ref', 'displayName']);

      const st = (c.seasonStats as AnyObj[])[0]!;
      assertKeys(st, [
        'competition',
        'season',
        'team',
        'appearances',
        'minutes',
        'goals',
        'assists',
        'yellowCards',
        'redCards',
      ]);
      // starts · yellowredCards 는 제거
      expect(st).not.toHaveProperty('starts');
      expect(st).not.toHaveProperty('yellowredCards');
      // assists null 유지
      expect(st.assists).toBeNull();

      assertKeys(st.competition as AnyObj, ['ref', 'displayName']);
      assertKeys(st.season as AnyObj, ['year', 'dataState']);
      assertKeys(st.team as AnyObj, ['displayName']);

      const tot = c.totals as AnyObj;
      assertKeys(tot, ['appearances', 'minutes', 'goals', 'assists', 'yellowCards', 'redCards']);
      expect(tot.assists).toBeNull();
    });

    it('primaryTeam null → primaryTeam: null', () => {
      const src = JSON.parse(JSON.stringify(raw)) as typeof raw;
      (src as unknown as AnyObj).primaryTeam = null;
      const c = compressForModel('get_player', src) as AnyObj;
      expect(c.primaryTeam).toBeNull();
    });
  });

  // ─── get_top_scorers / get_top_assisters ───────────
  describe('get_top_scorers (Mode A)', () => {
    const raw = {
      competition: {
        ref: '2-champions-league',
        apiId: 2,
        displayName: 'UEFA Champions League',
        shortDisplayName: 'UCL',
        originalName: 'UEFA Champions League',
        type: 'CUP',
        format: 'LEAGUE_PHASE_KNOCKOUT',
      },
      season: { year: 2026, label: '2026-27' },
      items: [
        {
          rank: 1,
          value: 8,
          player: {
            ref: '909-lionel-messi',
            apiId: 909,
            displayName: 'Lionel Messi',
            shortDisplayName: 'L. Messi',
            originalName: 'Lionel Messi',
            photoUrl: 'x',
          },
          team: {
            ref: '85-psg',
            apiId: 85,
            displayName: 'Paris Saint Germain',
            shortDisplayName: 'PSG',
            originalName: 'Paris Saint Germain',
            code: 'PSG',
            country: 'France',
            founded: 1970,
            logoUrl: 'x',
          },
        },
      ],
      asOf: '2026-09-10T00:00:00.000Z',
    };

    it('shape 잠금 (모드 A: breakdown 없음)', () => {
      const c = compressForModel('get_top_scorers', raw) as AnyObj;
      assertKeys(c, ['competition', 'season', 'asOf', 'items']);
      assertKeys(c.competition as AnyObj, ['ref', 'displayName']);
      assertKeys(c.season as AnyObj, ['year']);
      const it = (c.items as AnyObj[])[0]!;
      assertKeys(it, ['rank', 'value', 'player', 'team']);
      assertKeys(it.player as AnyObj, ['ref', 'displayName']);
      assertKeys(it.team as AnyObj, ['ref', 'displayName']);
    });
  });

  describe('get_top_assisters (Mode B)', () => {
    const raw = {
      competition: null,
      season: null,
      items: [
        {
          rank: 1,
          value: 15,
          player: {
            ref: '909-lionel-messi',
            apiId: 909,
            displayName: 'Lionel Messi',
            shortDisplayName: 'L. Messi',
            originalName: 'Lionel Messi',
            photoUrl: 'x',
          },
          team: {
            ref: '85-psg',
            apiId: 85,
            displayName: 'Paris Saint Germain',
            shortDisplayName: 'PSG',
            originalName: 'Paris Saint Germain',
            code: 'PSG',
            country: 'France',
            founded: 1970,
            logoUrl: 'x',
          },
          breakdown: [
            {
              competition: {
                ref: '39-premier-league',
                apiId: 39,
                displayName: 'Premier League',
                shortDisplayName: 'EPL',
                originalName: 'Premier League',
                type: 'LEAGUE',
                format: 'ROUND_ROBIN',
              },
              season: { year: 2026, label: '2026-27' },
              value: 8,
            },
          ],
        },
      ],
      asOf: '2026-09-10T00:00:00.000Z',
    };

    it('shape 잠금 (competition/season null · breakdown 존재)', () => {
      const c = compressForModel('get_top_assisters', raw) as AnyObj;
      expect(c.competition).toBeNull();
      expect(c.season).toBeNull();
      const it = (c.items as AnyObj[])[0]!;
      expect(it.breakdown).toBeDefined();
      const bd = (it.breakdown as AnyObj[])[0]!;
      assertKeys(bd, ['competition', 'season', 'value']);
      assertKeys(bd.competition as AnyObj, ['ref', 'displayName']);
      assertKeys(bd.season as AnyObj, ['year']);
    });
  });
});
