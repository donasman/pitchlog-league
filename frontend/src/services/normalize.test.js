import { describe, it, expect } from 'vitest'
import {
  zoneOf,
  teamColor,
  myTeamCard,
  normalizeMatch,
  normalizeStanding,
  normalizeStandings,
  normalizeStatsRow,
  normalizeTeam,
  deriveStage,
  competitionRefFromSlug,
  normalizePlayerDetail,
  playerTotals,
  formatStat,
} from './normalize.js'
import { MATCHES } from '../mocks/matches.js'

// ─── fixtures shaped like backend/src/match/match.dto.ts · standing/standing.dto.ts ───

function teamDto(apiId, name, code = null) {
  return {
    ref: `${apiId}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    apiId,
    name,
    displayName: name,
    shortDisplayName: name,
    code,
    country: 'England',
    founded: 1880,
    logoUrl: 'https://media.example/teams/' + apiId + '.png',
  }
}

const COMPETITION_REF = {
  ref: '39-premier-league',
  apiId: 39,
  name: 'Premier League',
  displayName: 'Premier League',
  shortDisplayName: 'EPL',
  type: 'LEAGUE',
  format: 'ROUND_ROBIN',
}

function matchDto(overrides = {}) {
  return {
    id: 1234567,
    kickoffAt: '2026-11-23T14:00:00.000Z',
    statusShort: 'NS',
    statusLong: 'Not Started',
    elapsed: null,
    extraElapsed: null,
    statsState: 'NONE',
    confirmedAt: null,
    goals: { home: null, away: null },
    ht: { home: null, away: null },
    ft: { home: null, away: null },
    et: { home: null, away: null },
    pen: { home: null, away: null },
    winnerTeamRef: null,
    home: teamDto(50, 'Manchester City', 'MCI'),
    away: teamDto(42, 'Arsenal', 'ARS'),
    competition: COMPETITION_REF,
    season: { year: 2026, label: '2026-27' },
    round: { name: 'Regular Season - 13', ordinal: 13, matchCount: 10, isLateStage: false },
    venue: { name: 'Etihad Stadium', city: 'Manchester' },
    referee: null,
    leg: null,
    detailEligible: true,
    hasEvents: null,
    hasLineups: null,
    hasTeamStats: null,
    hasPlayerStats: null,
    asOf: '2026-11-23T12:00:00.000Z',
    ...overrides,
  }
}

function standingRowDto(overrides = {}) {
  return {
    team: teamDto(50, 'Manchester City', 'MCI'),
    groupName: 'Premier League',
    rank: 1,
    points: 29,
    played: 12,
    win: 9,
    draw: 2,
    lose: 1,
    goalsFor: 32,
    goalsAgainst: 14,
    goalDiff: 18,
    home: { played: 6, win: 5, draw: 1, lose: 0, gf: 18, ga: 6 },
    away: { played: 6, win: 4, draw: 1, lose: 1, gf: 14, ga: 8 },
    form: 'WWDWW',
    description: 'Promotion - Champions League (League phase)',
    status: 'same',
    asOf: '2026-11-23T12:00:00.000Z',
    ...overrides,
  }
}

// ─── zoneOf ────────────────────────────────────────────────────

describe('zoneOf', () => {
  it.each([
    ['Promotion - Champions League (League phase)',        'league', 1,  'champions_league'],
    ['Promotion - Champions League (Qualification)',       'league', 4,  'champions_league_playoff'],
    ['Promotion - Europa League (Group Stage)',            'league', 5,  'europa_league'],
    ['Promotion - Europa Conference League (Qualification)', 'league', 6, 'europa_conference'],
    ['Relegation - Championship',                          'league', 18, 'relegation'],
    ['Relegation Play-off',                                'league', 16, 'relegation_playoff'],
    ['Something unknown',                                  'league', 10, 'none'],
  ])('%s -> %s', (description, format, rank, expected) => {
    expect(zoneOf(description, format, rank)).toBe(expected)
  })

  it('returns none when the description is null on a league', () => {
    expect(zoneOf(null, 'league', 10)).toBe('none')
    expect(zoneOf(undefined, 'league', 10)).toBe('none')
  })

  it('falls back to the rank on the UCL league phase', () => {
    expect(zoneOf(null, 'groups_knockout', 8)).toBe('ucl_direct')
    expect(zoneOf(null, 'groups_knockout', 9)).toBe('ucl_playoff')
    expect(zoneOf(null, 'groups_knockout', 25)).toBe('ucl_eliminated')
  })

  // 2022·2023 UCL 조별리그 실측 description — 1·2위는 예선 PO 가 아니라 16강 직행이다
  it('reads the 1/8-finals promotion of a group winner as a direct knockout berth', () => {
    const d = 'Promotion - Champions League (Play Offs: 1/8-finals)'
    expect(zoneOf(d, 'groups_knockout', 1, { groupCount: 8 })).toBe('ucl_direct')
    expect(zoneOf(d, 'groups_knockout', 2, { groupCount: 8 })).toBe('ucl_direct')
  })

  // ★ 회귀 — 2024·2025 리그페이즈 실측. 9~24위는 `1/16-finals` 로 오고 녹아웃 PO 를 치러야 한다.
  // `1/8-finals` 와 한 규칙으로 묶으면 16팀이 "직행" 으로 칠해진다.
  it('reads the 1/16-finals promotion of the league phase as a knockout playoff berth', () => {
    const d = 'Promotion - Champions League (Play Offs: 1/16-finals)'
    expect(zoneOf(d, 'groups_knockout', 9,  { groupCount: 1 })).toBe('ucl_playoff')
    expect(zoneOf(d, 'groups_knockout', 24, { groupCount: 1 })).toBe('ucl_playoff')
  })

  it('reads the 1/8-finals promotion of the league phase as a direct knockout berth', () => {
    const d = 'Promotion - Champions League (Play Offs: 1/8-finals)'
    expect(zoneOf(d, 'groups_knockout', 1, { groupCount: 1 })).toBe('ucl_direct')
    expect(zoneOf(d, 'groups_knockout', 8, { groupCount: 1 })).toBe('ucl_direct')
  })

  // 2026 은 description 이 'Play Offs' 뿐이라 champions league 규칙에 안 걸리고 순위 폴백으로 간다
  it('falls back to the rank when the league phase only says Play Offs', () => {
    expect(zoneOf('Play Offs', 'groups_knockout', 9,  { groupCount: 1 })).toBe('ucl_playoff')
    expect(zoneOf(null,        'groups_knockout', 1,  { groupCount: 1 })).toBe('ucl_direct')
    expect(zoneOf(null,        'groups_knockout', 30, { groupCount: 1 })).toBe('ucl_eliminated')
  })

  it('still reads a domestic Champions League qualification as a playoff berth', () => {
    expect(zoneOf('Promotion - Champions League (Qualification)', 'league', 4))
      .toBe('champions_league_playoff')
  })

  it('keeps the third placed group side in the Europa League', () => {
    expect(zoneOf('Promotion - Europa League (Play Offs: 1/16-finals)', 'groups_knockout', 3, { groupCount: 8 }))
      .toBe('europa_league')
  })

  // 4팀 조의 4위는 description 이 null 이다 — 순위 폴백(8/24/36)은 36팀 단일 표 전용이므로
  // 여기서 쓰면 4위가 16강 직행으로 칠해진다. 조가 여럿이면 칠하지 않는다.
  it('paints no zone for a group side the API said nothing about', () => {
    expect(zoneOf(null, 'groups_knockout', 4, { groupCount: 8 })).toBe('none')
    expect(zoneOf(null, 'groups_knockout', 1, { groupCount: 8 })).toBe('none')
  })

  it('keeps the rank fallback for a single table league phase', () => {
    expect(zoneOf(null, 'groups_knockout', 4, { groupCount: 1 })).toBe('ucl_direct')
    expect(zoneOf(null, 'groups_knockout', 30, { groupCount: 1 })).toBe('ucl_eliminated')
  })
})

// ─── teamColor ─────────────────────────────────────────────────

describe('teamColor', () => {
  it('is deterministic for the same id', () => {
    expect(teamColor(33)).toBe(teamColor(33))
  })

  it('produces a lowercase six-digit hex color', () => {
    for (const id of [1, 33, 50, 42, 1888]) {
      expect(teamColor(id)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('gives neighbouring ids different colors', () => {
    expect(teamColor(33)).not.toBe(teamColor(34))
    expect(teamColor(50)).not.toBe(teamColor(42))
  })

  // Mock `player.teamId` 는 문자열('mancity')이라 `Number()` 를 태우면 NaN → 0 으로 몰려
  // 배지 색이 한 종류로 폴백됐다. 입력 가드가 문자열을 해시로 떨어뜨려 색이 분산되는지 잠근다.
  it('hashes a string apiTeamId deterministically instead of the NaN → 0 fallback', () => {
    const a = teamColor('mancity')
    const b = teamColor('liverpool')
    const c = teamColor('mancity')
    expect(a).toMatch(/^#[0-9a-f]{6}$/i)
    expect(b).toMatch(/^#[0-9a-f]{6}$/i)
    expect(a).toBe(c)                 // same input → same color (deterministic)
    expect(a).not.toBe(b)             // different strings → different colors
    expect(a).not.toBe(teamColor(0))  // must not collide with the NaN fallback color (=0)
  })

  // 숫자 회귀 — 가드 삽입으로 기존 숫자 규약이 흔들리면 안 된다 (형식만 잠근다)
  it('keeps the existing shape for numeric apiTeamId (format only)', () => {
    expect(teamColor(39)).toMatch(/^#[0-9a-f]{6}$/i)
    expect(teamColor(9100024)).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

// ─── competitionRefFromSlug ────────────────────────────────────

describe('competitionRefFromSlug', () => {
  it('maps a screen slug to a backend ref', () => {
    expect(competitionRefFromSlug('premier-league')).toBe('39-premier-league')
    expect(competitionRefFromSlug('champions-league')).toBe('2-champions-league')
  })

  it('returns null for an unknown slug', () => {
    expect(competitionRefFromSlug('no-such-league')).toBeNull()
  })
})

// ─── normalizeMatch ────────────────────────────────────────────

/** Keys the mock carries that the backend cannot provide yet — detail data, not the match row */
const MOCK_ONLY_KEYS = new Set(['prediction', 'homeLineup', 'awayLineup', 'headToHead'])

describe('normalizeMatch', () => {
  it('covers every key of mock match m001 (except detail-only keys)', () => {
    const mock = MATCHES.find(m => m.id === 'm001')
    expect(mock).toBeDefined()
    const expected = Object.keys(mock).filter(k => !MOCK_ONLY_KEYS.has(k))
    const actual = new Set(Object.keys(normalizeMatch(matchDto())))
    for (const key of expected) {
      expect(actual.has(key), `missing key: ${key}`).toBe(true)
    }
  })

  it('keeps a null score as {home: null, away: null} on NS (not 0)', () => {
    const m = normalizeMatch(matchDto())
    expect(m.score).toEqual({ home: null, away: null })
    expect(m.displayState).toBe('scheduled')
    expect(m.statusCode).toBe('NS')
  })

  it('maps competition alias, season label, round name and venue', () => {
    const m = normalizeMatch(matchDto())
    expect(m.id).toBe('1234567')
    expect(m.competitionId).toBe('epl')
    expect(m.competitionSlug).toBe('premier-league')
    expect(m.competitionName).toBe('Premier League')
    expect(m.seasonId).toBe('2026-27')
    expect(m.round).toBe('Regular Season - 13')
    expect(m.venue).toBe('Etihad Stadium, Manchester')
    expect(m.date).toBe('2026-11-23T14:00:00.000Z')
  })

  it('derives recheck/confirmed from statsState on a finished match', () => {
    const base = { statusShort: 'FT', goals: { home: 2, away: 1 }, elapsed: 90 }
    expect(normalizeMatch(matchDto({ ...base, statsState: 'NONE' })).displayState).toBe('final')
    expect(normalizeMatch(matchDto({ ...base, statsState: 'RECHECK' })).displayState).toBe('recheck')
    expect(normalizeMatch(matchDto({ ...base, statsState: 'CONFIRMED' })).displayState).toBe('confirmed')
    expect(normalizeMatch(matchDto(base)).score).toEqual({ home: 2, away: 1 })
  })

  it('uses the team ref as routing slug and derives a badge color', () => {
    const m = normalizeMatch(matchDto())
    expect(m.homeTeam.slug).toBe(m.homeTeam.ref)
    expect(m.homeTeam.initials).toBe('MCI')
    expect(m.homeTeam.color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('renders a null venue as null (not an empty string)', () => {
    expect(normalizeMatch(matchDto({ venue: null })).venue).toBeNull()
  })
})

// ─── normalizeStanding ─────────────────────────────────────────

describe('normalizeStanding', () => {
  it('splits the form string into an array of W/D/L', () => {
    const row = normalizeStanding(standingRowDto({ form: 'WWDLW' }), { format: 'league' })
    expect(row.form).toEqual(['W', 'W', 'D', 'L', 'W'])
  })

  it('keeps only the last five results and drops unknown letters', () => {
    const row = normalizeStanding(standingRowDto({ form: 'LWWDLWX' }), { format: 'league' })
    expect(row.form).toEqual(['W', 'W', 'D', 'L', 'W'])
  })

  it('returns an empty form when the backend gives null', () => {
    expect(normalizeStanding(standingRowDto({ form: null }), { format: 'league' }).form).toEqual([])
  })

  it('passes the group name through to the screen', () => {
    expect(normalizeStanding(standingRowDto({ groupName: 'Group A' }), { format: 'groups_knockout' }).groupName)
      .toBe('Group A')
    expect(normalizeStanding(standingRowDto({ groupName: null }), { format: 'league' }).groupName)
      .toBeNull()
  })

  it('maps the row to the mock entries shape', () => {
    const row = normalizeStanding(standingRowDto(), { format: 'league' })
    expect(row).toMatchObject({
      rank: 1, teamName: 'Manchester City', teamInitials: 'MCI',
      played: 12, won: 9, drawn: 2, lost: 1,
      goalsFor: 32, goalsAgainst: 14, goalDifference: 18, points: 29,
      zone: 'champions_league',
    })
    expect(row.teamSlug).toBe(row.teamId)
  })

  // ★ 로고 파생 — 원본 있으면 로컬 URL, 원본 null 이면 null 그대로.
  // 화면·홈 카드가 손으로 localLogo 를 조립하지 않도록 정규화 계층이 책임진다.
  it('derives teamLogoUrl from the row team logoUrl (local /logos path)', () => {
    const row = normalizeStanding(standingRowDto(), { format: 'league' })
    expect(row.teamApiId).toBe(50)
    expect(row.teamLogoUrl).toBe('/logos/teams/50.webp')
  })

  it('leaves teamLogoUrl null when row.team.logoUrl is null (no source, no local file)', () => {
    const row = normalizeStanding(
      standingRowDto({ team: { ...teamDto(50, 'Manchester City', 'MCI'), logoUrl: null } }),
      { format: 'league' },
    )
    expect(row.teamLogoUrl).toBeNull()
  })
})

// ─── normalizeStatsRow ─────────────────────────────────────────

describe('normalizeStatsRow', () => {
  const statsRowDto = (overrides = {}) => ({
    rank: 1,
    player: { apiId: 306, ref: '306-erling-haaland', displayName: 'E. Haaland' },
    team: {
      apiId: 50, ref: '50-manchester-city',
      displayName: 'Manchester City', shortDisplayName: 'Man City', code: 'MCI',
      logoUrl: 'https://media.example/teams/50.png',
    },
    value: 14,
    breakdown: null,
    ...overrides,
  })

  it('derives teamLogoUrl from the row team logoUrl (local /logos path)', () => {
    const row = normalizeStatsRow(statsRowDto())
    expect(row.teamLogoUrl).toBe('/logos/teams/50.webp')
  })

  it('leaves teamLogoUrl null when team.logoUrl is null', () => {
    const row = normalizeStatsRow(statsRowDto({
      team: { apiId: 50, displayName: 'Manchester City', shortDisplayName: 'Man City', code: 'MCI', logoUrl: null },
    }))
    expect(row.teamLogoUrl).toBeNull()
  })

  it('leaves teamLogoUrl null when team itself is missing (defensive)', () => {
    // dto.team 이 null 로 오는 실 응답은 없지만 방어적으로 확인 — apiId 도 undefined 라 localLogo 도 null
    const row = normalizeStatsRow({ rank: 1, player: null, team: null, value: 0, breakdown: null })
    expect(row.teamLogoUrl).toBeNull()
  })
})

// ─── normalizeStandings ────────────────────────────────────────

function tableDto(rows) {
  return {
    competition: { ...COMPETITION_REF, ref: '2-champions-league', apiId: 2, format: 'LEAGUE_PHASE_KNOCKOUT' },
    season: { year: 2022, label: '2022-23' },
    rows,
    asOf: '2026-11-23T12:00:00.000Z',
    unavailableReason: null,
  }
}

/** 2022·2023 UCL 조별리그 실측 형태 — 8조 × 4팀, 1·2위 16강, 3위 유로파, 4위 description null */
function groupRows(groupName, apiIdBase) {
  const DESCRIPTIONS = [
    'Promotion - Champions League (Play Offs: 1/8-finals)',
    'Promotion - Champions League (Play Offs: 1/8-finals)',
    'Promotion - Europa League (Play Offs: 1/16-finals)',
    null,
  ]
  return DESCRIPTIONS.map((description, i) => standingRowDto({
    team: teamDto(apiIdBase + i, `${groupName} Team ${i + 1}`),
    groupName,
    rank: i + 1,
    description,
  }))
}

describe('normalizeStandings', () => {
  it('zones a group stage table from its descriptions and paints nothing where the API was silent', () => {
    const table = tableDto([...groupRows('Group A', 100), ...groupRows('Group B', 200)])
    const { entries } = normalizeStandings(table, [])
    expect(entries.map(e => e.zone)).toEqual([
      'ucl_direct', 'ucl_direct', 'europa_league', 'none',
      'ucl_direct', 'ucl_direct', 'europa_league', 'none',
    ])
    expect(entries.map(e => e.groupName)).toEqual([
      'Group A', 'Group A', 'Group A', 'Group A',
      'Group B', 'Group B', 'Group B', 'Group B',
    ])
  })

  // 36팀 리그 페이즈는 조가 하나라 순위 폴백이 그대로 살아 있어야 한다
  it('keeps the rank fallback on the single table league phase', () => {
    const rows = [1, 9, 25].map((rank, i) => standingRowDto({
      team: teamDto(300 + i, `Team ${rank}`),
      groupName: 'UEFA Champions League',
      rank,
      description: null,
    }))
    const { entries } = normalizeStandings(tableDto(rows), [])
    expect(entries.map(e => e.zone)).toEqual(['ucl_direct', 'ucl_playoff', 'ucl_eliminated'])
  })

  it('reports the reason and no rows when the table is unavailable', () => {
    const table = { ...tableDto(groupRows('Group A', 100)), unavailableReason: 'KNOCKOUT' }
    const out = normalizeStandings(table, [])
    expect(out.entries).toEqual([])
    expect(out.unavailableReason).toBe('KNOCKOUT')
  })
})

// ─── deriveStage ───────────────────────────────────────────────

describe('deriveStage', () => {
  const NOW = new Date('2026-11-23T20:00:00Z')

  function finished(id, kickoffAt, round) {
    return normalizeMatch(matchDto({
      id, kickoffAt, statusShort: 'FT', goals: { home: 1, away: 0 },
      round: { name: `Regular Season - ${round}`, ordinal: round, matchCount: 2, isLateStage: false },
    }))
  }

  function scheduled(id, kickoffAt, round) {
    return normalizeMatch(matchDto({
      id, kickoffAt,
      round: { name: `Regular Season - ${round}`, ordinal: round, matchCount: 2, isLateStage: false },
    }))
  }

  it('reports the latest started round as completed when all its matches are settled', () => {
    const matches = [
      finished(1, '2026-11-21T15:00:00Z', 12),
      finished(2, '2026-11-22T15:00:00Z', 12),
      scheduled(3, '2026-11-28T15:00:00Z', 13),
    ]
    expect(deriveStage(matches, NOW)).toEqual({ label: 'Regular Season - 12', status: 'completed' })
  })

  it('reports the round as ongoing while a match of it is still to come', () => {
    const matches = [
      finished(1, '2026-11-22T15:00:00Z', 13),
      scheduled(2, '2026-11-24T15:00:00Z', 13),
    ]
    expect(deriveStage(matches, NOW)).toEqual({ label: 'Regular Season - 13', status: 'ongoing' })
  })

  it('returns null when nothing has started', () => {
    expect(deriveStage([scheduled(1, '2026-11-28T15:00:00Z', 14)], NOW)).toBeNull()
    expect(deriveStage([], NOW)).toBeNull()
  })
})

// ─── normalizePlayerSeasonStat / playerTotals / formatStat ─────
//
// 컨텍스트: 09-08 세 라운드 버그 7건. 표시 판단이 컴포넌트 곳곳에 흩어져 있었다.
// 이 판이 판단을 순수 함수 3개(key·playerTotals·formatStat)로 옮긴다.
// 아래 대조 assert 가 규약 등식 `playerTotals(allStats) === dto.totals` 를 잠근다 —
// 백엔드 `player.service.ts:102-112` 와 같은 규약을 프론트에도 재현한다.

describe('normalizePlayerSeasonStat / playerTotals / formatStat', () => {
  // ★ `??` 를 assists 에 쓰지 않는다 — `null ?? 2 = 2` 가 되어 "assists=null" 시나리오를
  //   테스트할 수 없다. assists 만 명시 존재 여부로 판단한다.
  const csDto = (opts) => ({
    competition: { apiId: 39, ref: '39-premier-league', displayName: 'Premier League' },
    season: { year: 2023, label: '2022-23' },
    team: { apiId: opts.teamId, displayName: opts.teamName, shortDisplayName: opts.teamName },
    appearances: opts.appearances ?? 10,
    starts:      opts.starts ?? 8,
    minutes:     opts.minutes ?? 800,
    goals:       opts.goals ?? 3,
    assists:     'assists' in opts ? opts.assists : 2,
    yellowCards: opts.yellowCards ?? 1,
    yellowredCards: null,
    redCards:    opts.redCards ?? 0,
  })

  it('builds a composite key (competition-season-team) on each season stat row', () => {
    const dto = {
      apiId: 1, ref: '1-x', displayName: 'X', shortDisplayName: 'X', originalName: 'X',
      seasonStats: [csDto({ teamId: 100, teamName: 'Everton' })],
      totals: { appearances: 10, minutes: 800, goals: 3, assists: 2, yellowCards: 1, redCards: 0 },
      asOf: '2026-09-08T00:00:00Z',
      primaryTeam: null, jerseyNumber: null, position: null,
    }
    const n = normalizePlayerDetail(dto)
    expect(n.allStats[0].key).toBe('epl-2022-23-Everton')
  })

  it('gives a unique key to two mid-season transfer rows in the same competition', () => {
    const dto = {
      apiId: 1, ref: '1-x', displayName: 'X', shortDisplayName: 'X', originalName: 'X',
      seasonStats: [
        csDto({ teamId: 100, teamName: 'Everton',   appearances: 16, goals: 3, assists: null }),
        csDto({ teamId: 101, teamName: 'Newcastle', appearances: 16, goals: 1, assists: 2 }),
      ],
      totals: { appearances: 32, minutes: 1600, goals: 4, assists: null, yellowCards: 2, redCards: 0 },
      asOf: '2026-09-08T00:00:00Z',
      primaryTeam: null, jerseyNumber: null, position: null,
    }
    const n = normalizePlayerDetail(dto)
    const keys = n.allStats.map(r => r.key)
    expect(new Set(keys).size).toBe(2)
    expect(keys).toContain('epl-2022-23-Everton')
    expect(keys).toContain('epl-2022-23-Newcastle')
  })

  it('playerTotals — returns null assists if any row is null, sums the rest as usual', () => {
    const rows = [
      { appearances: 16, minutesPlayed: 1440, goals: 3, assists: null, yellowCards: 2, redCards: 0 },
      { appearances: 16, minutesPlayed:  360, goals: 1, assists: 2,    yellowCards: 1, redCards: 0 },
    ]
    const t = playerTotals(rows)
    expect(t.appearances).toBe(32)
    expect(t.minutes).toBe(1800)
    expect(t.goals).toBe(4)
    expect(t.assists).toBeNull()
    expect(t.yellowCards).toBe(3)
    expect(t.redCards).toBe(0)
  })

  it('playerTotals — sums assists when every row has a number', () => {
    const rows = [
      { appearances: 10, minutesPlayed:  900, goals: 5, assists: 3, yellowCards: 1, redCards: 0 },
      { appearances: 12, minutesPlayed: 1080, goals: 2, assists: 1, yellowCards: 2, redCards: 1 },
    ]
    expect(playerTotals(rows).assists).toBe(4)
  })

  // ★ 대조 assert — 규약 등식 `playerTotals(allStats) === dto.totals`.
  // 이적 + null 섞임 시나리오를 백엔드가 계산했을 때 나올 totals 를 dto 로 두고,
  // 프론트 정규화 + playerTotals 결과가 정확히 같은지 잠근다.
  it('locks the invariant playerTotals(allStats) equals dto.totals (same rule as the backend)', () => {
    const dto = {
      apiId: 1, ref: '1-x', displayName: 'X', shortDisplayName: 'X', originalName: 'X',
      seasonStats: [
        csDto({ teamId: 100, teamName: 'Everton',   appearances: 16, starts: 12, minutes: 1440, goals: 3, assists: null, yellowCards: 2 }),
        csDto({ teamId: 101, teamName: 'Newcastle', appearances: 16, starts:  4, minutes:  360, goals: 1, assists: 2,    yellowCards: 1 }),
        csDto({ teamId: 101, teamName: 'Newcastle', appearances: 34, starts: 31, minutes: 3000, goals: 6, assists: 5,    yellowCards: 3 }),
      ],
      // 백엔드 `player.service.ts:102-112` 가 계산했다면 나올 값
      totals: {
        appearances: 66,
        minutes:     4800,
        goals:       10,
        assists:     null,   // 하나라도 null → null
        yellowCards: 6,
        redCards:    0,
      },
      asOf: '2026-09-08T00:00:00Z',
      primaryTeam: null, jerseyNumber: null, position: null,
    }
    const n = normalizePlayerDetail(dto)
    expect(playerTotals(n.allStats)).toEqual(dto.totals)
  })

  it('formatStat — null → "-", undefined → "-"', () => {
    expect(formatStat(null)).toBe('-')
    expect(formatStat(undefined)).toBe('-')
  })

  it('formatStat — passes numbers through as is (0 stays 0, not -)', () => {
    expect(formatStat(0)).toBe(0)
    expect(formatStat(5)).toBe(5)
    expect(formatStat(149)).toBe(149)
  })
})

// ─── myTeamCard ────────────────────────────────────────────────

describe('myTeamCard', () => {
  const OWN = normalizeTeam(teamDto(50, 'Manchester City', 'MCI'))
  const RIVAL_ARS = teamDto(42, 'Arsenal', 'ARS')
  const RIVAL_LIV = teamDto(40, 'Liverpool', 'LIV')

  function homeMatch({ id, date, statusShort, goals = { home: null, away: null }, statsState = 'NONE', competition = COMPETITION_REF }) {
    return normalizeMatch(matchDto({
      id, kickoffAt: date, statusShort, statsState, goals,
      home: teamDto(50, 'Manchester City', 'MCI'),
      away: RIVAL_ARS,
      competition,
    }))
  }

  function awayMatch({ id, date, statusShort, goals = { home: null, away: null }, statsState = 'NONE', competition = COMPETITION_REF }) {
    return normalizeMatch(matchDto({
      id, kickoffAt: date, statusShort, statsState, goals,
      home: RIVAL_LIV,
      away: teamDto(50, 'Manchester City', 'MCI'),
      competition,
    }))
  }

  const eplStandings = {
    competitionSlug: 'premier-league',
    competitionName: 'Premier League',
    rows: [
      normalizeStanding(standingRowDto({
        team: teamDto(50, 'Manchester City', 'MCI'),
        rank: 3, played: 30, points: 62,
      }), { format: 'league' }),
      normalizeStanding(standingRowDto({
        team: teamDto(42, 'Arsenal', 'ARS'),
        rank: 1, played: 30, points: 71,
      }), { format: 'league' }),
    ],
  }

  // C1 — season over, no upcoming match, last result and ranking present
  it('C1: season over — no next match, latest settled as last result, ranking present', () => {
    const matches = [
      homeMatch({ id: 1, date: '2026-05-01T14:00:00Z', statusShort: 'FT', goals: { home: 2, away: 1 } }),
      awayMatch({ id: 2, date: '2026-05-08T14:00:00Z', statusShort: 'FT', goals: { home: 0, away: 3 } }),
      homeMatch({ id: 3, date: '2026-05-15T14:00:00Z', statusShort: 'FT', statsState: 'CONFIRMED', goals: { home: 1, away: 1 } }),
    ]
    const card = myTeamCard(OWN, { matches, competitions: [] }, eplStandings)
    expect(card.nextMatch).toBeNull()
    expect(card.lastResult).not.toBeNull()
    expect(card.lastResult.id).toBe('3')
    expect(card.lastResult.displayState).toBe('confirmed')
    expect(card.lastResult.isHome).toBe(true)
    expect(card.lastResult.opponent.name).toBe('Arsenal')
    expect(card.ranking).toEqual({
      competitionSlug: 'premier-league',
      competitionName: 'Premier League',
      rank: 3, played: 30, points: 62,
    })
  })

  // C2 — cup only, no standings, next match present, no last result
  it('C2: cup only — next match present, no last result, no ranking when standings are null', () => {
    const matches = [
      awayMatch({ id: 10, date: '2027-08-01T18:00:00Z', statusShort: 'NS',
        competition: { ...COMPETITION_REF, apiId: 45, ref: '45-fa-cup', format: 'KNOCKOUT', displayName: 'FA Cup' } }),
    ]
    const card = myTeamCard(OWN, { matches, competitions: [] }, null)
    expect(card.nextMatch).not.toBeNull()
    expect(card.nextMatch.id).toBe('10')
    expect(card.nextMatch.isHome).toBe(false)
    expect(card.nextMatch.opponent.name).toBe('Liverpool')
    expect(card.nextMatch.displayState).toBe('scheduled')
    expect(card.lastResult).toBeNull()
    expect(card.ranking).toBeNull()
  })

  // C3 — EPL + UCL: closer UCL upcoming becomes nextMatch, past EPL becomes lastResult,
  // ranking only from EPL rows (UCL is groups_knockout — passed as null shape).
  it('C3: two competitions — closest UCL upcoming as nextMatch, EPL past as lastResult, ranking from EPL rows only', () => {
    const uclComp = { ...COMPETITION_REF, apiId: 2, ref: '2-champions-league', format: 'LEAGUE_PHASE_KNOCKOUT', displayName: 'UEFA Champions League' }
    const eplPast = homeMatch({ id: 100, date: '2026-11-20T15:00:00Z', statusShort: 'FT', goals: { home: 2, away: 0 } })
    const eplFuture = awayMatch({ id: 101, date: '2026-12-05T15:00:00Z', statusShort: 'NS' })
    const uclFuture = homeMatch({ id: 200, date: '2026-11-28T20:00:00Z', statusShort: 'NS', competition: uclComp })
    const card = myTeamCard(OWN, { matches: [eplPast, eplFuture, uclFuture], competitions: [] }, eplStandings)
    expect(card.nextMatch).not.toBeNull()
    expect(card.nextMatch.id).toBe('200')
    expect(card.nextMatch.competitionSlug).toBe('champions-league')
    expect(card.lastResult).not.toBeNull()
    expect(card.lastResult.id).toBe('100')
    expect(card.lastResult.competitionSlug).toBe('premier-league')
    // ranking comes from the EPL rows even though the team also plays UCL
    expect(card.ranking?.competitionSlug).toBe('premier-league')
    expect(card.ranking?.rank).toBe(3)
  })
})
