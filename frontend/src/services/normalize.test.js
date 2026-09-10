import { describe, it, expect } from 'vitest'
import {
  zoneOf,
  teamColor,
  myTeamCard,
  normalizeMatch,
  normalizeSearchResults,
  normalizeStanding,
  normalizeStandings,
  normalizeStatsRow,
  normalizeTeam,
  normalizeTeamDetail,
  deriveStage,
  competitionRefFromSlug,
  normalizePlayerDetail,
  playerTotals,
  formatStat,
  matchDetail,
  scorerRowsFromRanking,
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
  // API 의 form 은 최신순 문자열 — 예: "WDWLL" = 최신 W → 오래된 L.
  // 표시 배열은 왼쪽=오래된 관습(StandingsTable · TeamPage 둘 다) 이라 뒤집는다.
  // 2026-09-10 실측 (레알 소시에다드): 실 경기 L L W D W · API form "WDWLL" — 뒤집으면 일치.
  it('splits the API form string (newest-first) and reverses to oldest-first for display', () => {
    const row = normalizeStanding(standingRowDto({ form: 'WDWLL' }), { format: 'league' })
    expect(row.form).toEqual(['L', 'L', 'W', 'D', 'W'])
  })

  // 회귀 방지: 5글자짜리로만 검사하면 잘림 방향(앞·뒤) 을 못 잡는다 — 6+ 로 검사.
  // 이전 코드는 slice(-5) 라 6글자 "WDWLLL" 에서 최신 W 를 잘라 냈다. 이제 앞 5글자(=최신) 를 유지.
  it('trims to the FIVE most recent results — drops the oldest tail when longer than 5', () => {
    const row = normalizeStanding(standingRowDto({ form: 'WDWLLL' }), { format: 'league' })
    // 최신 5개 = WDWLL · 뒤집어 오래된→최신
    expect(row.form).toEqual(['L', 'L', 'W', 'D', 'W'])
  })

  it('drops unknown letters and still yields the FIVE most recent in oldest-first order', () => {
    // 'LWWDLWX' — X 제거 후 'LWWDLW' (6글자) · 최신 5개 = 'LWWDL' · reverse = ['L','D','W','W','L']
    const row = normalizeStanding(standingRowDto({ form: 'LWWDLWX' }), { format: 'league' })
    expect(row.form).toEqual(['L', 'D', 'W', 'W', 'L'])
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

// ─── matchDetail ───────────────────────────────────────────────
//
// A-L3: `GET /api/matches/:ref/detail` — lineups·events·teamStats·playerStats + availability.
// availability 는 세 값(ok · not_provided · not_collected)이며 화면이 두 갈래로 다른 문구를 그린다.

describe('matchDetail', () => {
  const HOME_REF = '50-manchester-city'
  const AWAY_REF = '42-arsenal'

  function detailDto(overrides = {}) {
    return {
      lineups: [
        {
          teamRef: HOME_REF, teamName: 'Manchester City', formation: '4-3-3', coach: { name: 'Guardiola' },
          startXI: [
            { playerRef: '1-ederson',  playerName: 'Ederson',  number: 31, position: 'GK',  grid: '1:1' },
            { playerRef: '2-haaland',  playerName: 'Haaland',  number: 9,  position: 'FWD', grid: '4:2' },
          ],
          bench: [
            { playerRef: '3-ortega',   playerName: 'Ortega',   number: 18, position: 'GK',  grid: null },
          ],
        },
        {
          teamRef: AWAY_REF, teamName: 'Arsenal', formation: '4-4-2', coach: { name: 'Arteta' },
          startXI: [
            { playerRef: '4-raya',     playerName: 'Raya',     number: 22, position: 'GK',  grid: '1:1' },
          ],
          bench: [],
        },
      ],
      events: [
        { seq: 1, minute: 12, minuteExtra: null, teamRef: HOME_REF, playerRef: '2-haaland', playerName: 'Haaland',
          assistPlayerRef: null, assistPlayerName: null, type: 'goal', detail: 'Normal Goal', comments: null },
        { seq: 2, minute: 45, minuteExtra: 2,   teamRef: AWAY_REF, playerRef: '4-raya',    playerName: 'Raya',
          assistPlayerRef: null, assistPlayerName: null, type: 'yellow_card', detail: 'Yellow Card', comments: null },
      ],
      teamStats: [
        { teamRef: HOME_REF, teamName: 'Manchester City',
          ballPossession: 56, totalShots: 12, shotsOnGoal: 5, cornerKicks: 7, fouls: 8,
          passesPercentage: 88, expectedGoals: 1.8, goalsPrevented: 0.4 },
        { teamRef: AWAY_REF, teamName: 'Arsenal',
          ballPossession: 44, totalShots: 9,  shotsOnGoal: 3, cornerKicks: 4, fouls: 12,
          passesPercentage: 79, expectedGoals: 0.9, goalsPrevented: -0.2 },
      ],
      playerStats: [
        { playerRef: '2-haaland', playerName: 'Haaland', teamRef: HOME_REF, position: 'FWD',
          jerseyNumber: 9,  minutes: 90, rating: 8.7, shotsTotal: 5, shotsOn: 3, passesTotal: 32, isCaptain: true },
        { playerRef: '4-raya',    playerName: 'Raya',    teamRef: AWAY_REF, position: 'GK',
          jerseyNumber: 22, minutes: 90, rating: 7.2, shotsTotal: 0, shotsOn: 0, passesTotal: 40, isCaptain: false },
        { playerRef: '1-ederson', playerName: 'Ederson', teamRef: HOME_REF, position: 'GK',
          jerseyNumber: 31, minutes: 90, rating: 7.8, shotsTotal: 0, shotsOn: 0, passesTotal: 25, isCaptain: false },
        // rating null — topRated 에서 제외되어야 한다
        { playerRef: '3-ortega',  playerName: 'Ortega',  teamRef: HOME_REF, position: 'GK',
          jerseyNumber: 18, minutes: 0,  rating: null, shotsTotal: 0, shotsOn: 0, passesTotal: 0, isCaptain: false },
      ],
      asOf: '2026-11-23T15:00:00.000Z',
      availability: { lineups: 'ok', events: 'ok', teamStats: 'ok', playerStats: 'ok' },
      ...overrides,
    }
  }

  // 세 availability 값이 그대로 통과하는지 — 화면이 두 갈래(not_provided · not_collected) 문구로 갈리므로 값이 살아야 한다
  it('passes availability values through unchanged (ok · not_provided · not_collected)', () => {
    const okDto      = detailDto({ availability: { lineups: 'ok',            events: 'ok',            teamStats: 'ok',            playerStats: 'ok' } })
    const notProvDto = detailDto({ availability: { lineups: 'not_provided',  events: 'not_provided',  teamStats: 'not_provided',  playerStats: 'not_provided' } })
    const notCollDto = detailDto({ availability: { lineups: 'not_collected', events: 'not_collected', teamStats: 'not_collected', playerStats: 'not_collected' } })
    expect(matchDetail(okDto).availability.lineups).toBe('ok')
    expect(matchDetail(notProvDto).availability.lineups).toBe('not_provided')
    expect(matchDetail(notCollDto).availability.lineups).toBe('not_collected')
    // events · teamStats · playerStats 도 대칭
    expect(matchDetail(notProvDto).availability.events).toBe('not_provided')
    expect(matchDetail(notCollDto).availability.teamStats).toBe('not_collected')
    expect(matchDetail(okDto).availability.playerStats).toBe('ok')
  })

  // 이벤트가 팀별로 home/away 로 옳게 갈리고 playerRef 가 살아 있는지 (MatchPage 가 playerRef 로 마커 찾음)
  it('splits events by home/away teamRef and preserves playerRef for matching', () => {
    const out = matchDetail(detailDto())
    expect(out.events).toHaveLength(2)
    expect(out.events[0]).toMatchObject({
      minute: 12, type: 'goal', team: 'home', playerName: 'Haaland', playerRef: '2-haaland',
    })
    expect(out.events[1]).toMatchObject({
      minute: 45, minuteExtra: 2, type: 'yellow_card', team: 'away', playerRef: '4-raya',
    })
  })

  // rating null 이 topRated 에서 빠지고 rating desc 로 정렬되는지
  it('excludes players without a rating from topRated and sorts by rating desc', () => {
    const out = matchDetail(detailDto())
    expect(out.topRated).toHaveLength(3)  // 4명 중 rating null 하나 제외
    expect(out.topRated.map(p => p.name)).toEqual(['Haaland', 'Ederson', 'Raya'])
    expect(out.topRated[0].statistics.games.rating).toBe(8.7)
    // 주장 판정은 startingXI 라인업 항목에서 확인한다 (topRated 자체는 isCaptain 을 안 담는다)
    const homeStart = out.lineup.home.startingXI.find(p => p.playerRef === '2-haaland')
    expect(homeStart.isCaptain).toBe(true)
  })

  // lineups 가 아예 없으면 lineup=null. stats·events 는 다른 경로로 여전히 나올 수 있다
  it('returns lineup:null when the detail dto carries no lineups', () => {
    const out = matchDetail(detailDto({ lineups: [] }))
    expect(out.lineup).toBeNull()
    // 라인업이 없어도 events 는 살아 있다 — home/away 판정은 teamStats 로 폴백
    expect(out.events).toHaveLength(2)
    expect(out.events[0].team).toBe('home')
    expect(out.events[1].team).toBe('away')
  })

  // expectedGoals · goalsPrevented 는 null 을 유지한다 — 0 으로 위장하지 않는다 (DATA_RULES §3)
  it('keeps expectedGoals null (not coerced to 0)', () => {
    const out = matchDetail(detailDto({
      teamStats: [
        { teamRef: HOME_REF, teamName: 'Manchester City',
          ballPossession: 56, totalShots: 12, shotsOnGoal: 5, cornerKicks: 7, fouls: 8,
          passesPercentage: 88, expectedGoals: null, goalsPrevented: null },
        { teamRef: AWAY_REF, teamName: 'Arsenal',
          ballPossession: 44, totalShots: 9,  shotsOnGoal: 3, cornerKicks: 4, fouls: 12,
          passesPercentage: 79, expectedGoals: null, goalsPrevented: null },
      ],
    }))
    expect(out.stats.home.expectedGoals).toBeNull()
    expect(out.stats.away.expectedGoals).toBeNull()
    expect(out.stats.home.goalsPrevented).toBeNull()
    expect(out.stats.away.goalsPrevented).toBeNull()
  })

  // 회귀: TeamStatDto 를 그대로 넣었을 때 화면이 읽는 필드가 null 로 안 떨어지는지 (0 과 null 구분).
  // 09-10 실측 — normalize 가 API 계약과 다른 이름(passesPercent)을 읽어 항상 null 이 됐다.
  it('maps every teamStats field the screen reads directly from the API contract (0 !== null)', () => {
    const dto = detailDto({
      teamStats: [
        { teamRef: HOME_REF, teamName: 'Manchester City',
          // 0 과 null 구분 — passesPercentage=0 은 값이고 goalsPrevented=null 은 미측정
          ballPossession: 0, totalShots: 0, shotsOnGoal: 0, cornerKicks: 0, fouls: 0,
          passesPercentage: 0, expectedGoals: 0, goalsPrevented: null },
        { teamRef: AWAY_REF, teamName: 'Arsenal',
          ballPossession: 100, totalShots: 20, shotsOnGoal: 10, cornerKicks: 8, fouls: 5,
          passesPercentage: 90, expectedGoals: 2.5, goalsPrevented: 0.3 },
      ],
    })
    const out = matchDetail(dto)
    // 홈 — 값이 0 인 필드는 0 이어야 한다 (null 로 뭉개면 안 됨)
    expect(out.stats.home.ballPossession).toBe(0)
    expect(out.stats.home.totalShots).toBe(0)
    expect(out.stats.home.shotsOnGoal).toBe(0)
    expect(out.stats.home.cornerKicks).toBe(0)
    expect(out.stats.home.fouls).toBe(0)
    expect(out.stats.home.passesPercentage).toBe(0)
    expect(out.stats.home.expectedGoals).toBe(0)
    expect(out.stats.home.goalsPrevented).toBeNull()  // null 유지
    // 원정 — 값 살아 있어야 함
    expect(out.stats.away.ballPossession).toBe(100)
    expect(out.stats.away.totalShots).toBe(20)
    expect(out.stats.away.shotsOnGoal).toBe(10)
    expect(out.stats.away.cornerKicks).toBe(8)
    expect(out.stats.away.fouls).toBe(5)
    expect(out.stats.away.passesPercentage).toBe(90)  // 이 자리가 09-10 버그
    expect(out.stats.away.expectedGoals).toBe(2.5)
    expect(out.stats.away.goalsPrevented).toBe(0.3)
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

// ─── normalizeTeamDetail — TeamDetailDto → TeamPage shape ────────────────
// 3상태 규약(DATA_RULES 3장): 값(스칼라·0 포함) · null(미측정) · 빈 배열(실제 0건) 을 구분한다.
// 배열이 참조 무결성 대신 null 로 오면 fetchTeamDetail 이 상위에서 판정(예: players=null 스쿼드 API 미배선).
describe('normalizeTeamDetail', () => {
  function teamDetailDto(overrides = {}) {
    return {
      ref: '33-manchester-united',
      apiId: 33,
      displayName: 'Manchester United',
      shortDisplayName: 'Man Utd',
      originalName: 'Manchester United',
      code: 'MUN',
      country: 'England',
      founded: 1878,
      logoUrl: 'https://media.api-sports.io/football/teams/33.png',
      venue: {
        name: 'Old Trafford',
        city: 'Manchester',
        capacity: 76212,
        surface: 'grass',
        imageUrl: 'https://media.api-sports.io/football/venues/556.png',
      },
      participations: [
        { competitionRef: '39-premier-league', competitionName: 'Premier League', seasons: [2026, 2025] },
      ],
      asOf: '2026-11-23T15:00:00.000Z',
      ...overrides,
    }
  }

  it('maps every scalar the screen reads and passes participations through', () => {
    const out = normalizeTeamDetail(teamDetailDto())
    expect(out.ref).toBe('33-manchester-united')
    expect(out.slug).toBe('33-manchester-united')
    expect(out.apiId).toBe(33)
    expect(out.name).toBe('Manchester United')
    expect(out.shortName).toBe('Man Utd')
    expect(out.initials).toBe('MA') // shortDisplayName 첫 2글자 대문자
    expect(out.color).toBeNull() // 백엔드 미제공 — 표시 없음
    expect(out.manager).toBeNull() // 백엔드 미제공 — 표시 없음
    expect(out.country).toBe('England')
    expect(out.foundedYear).toBe(1878)
    expect(out.stadium).toBe('Old Trafford')
    expect(out.stadiumCapacity).toBe(76212)
    expect(out.stadiumCity).toBe('Manchester')
    expect(out.stadiumSurface).toBe('grass')
    expect(out.stadiumImageUrl).toBe('https://media.api-sports.io/football/venues/556.png')
    expect(out.participations).toHaveLength(1)
    expect(out.participations[0].competitionRef).toBe('39-premier-league')
    expect(out.asOf).toBe('2026-11-23T15:00:00.000Z')
  })

  // 0 은 값 · null 은 미측정 — 0/null 을 구분해서 뭉개지 않는지 (DATA_RULES 3장)
  it('keeps capacity=0 as a value (does not coerce to null)', () => {
    const out = normalizeTeamDetail(teamDetailDto({
      venue: { name: 'Empty Stadium', city: null, capacity: 0, surface: null, imageUrl: null },
    }))
    expect(out.stadiumCapacity).toBe(0)
    expect(out.stadium).toBe('Empty Stadium')
    expect(out.stadiumCity).toBeNull()
    expect(out.stadiumSurface).toBeNull()
    expect(out.stadiumImageUrl).toBeNull()
  })

  // venue 자체가 없으면(컵 하위 팀 등) 다섯 필드 전부 null. 빈 문자열이나 0 으로 뭉개면 안 된다
  it('nulls all venue-derived fields when venue is null', () => {
    const out = normalizeTeamDetail(teamDetailDto({ venue: null, founded: null, country: null }))
    expect(out.stadium).toBeNull()
    expect(out.stadiumCapacity).toBeNull()
    expect(out.stadiumCity).toBeNull()
    expect(out.stadiumSurface).toBeNull()
    expect(out.stadiumImageUrl).toBeNull()
    expect(out.foundedYear).toBeNull()
    expect(out.country).toBeNull()
  })

  // 빈 배열은 "리그 참가 이력 0건" 이라는 값 · fetchTeamDetail 상위에서 leagueRank=null 판정 근거
  it('passes an empty participations array through (not null)', () => {
    const out = normalizeTeamDetail(teamDetailDto({ participations: [] }))
    expect(Array.isArray(out.participations)).toBe(true)
    expect(out.participations).toHaveLength(0)
  })
})

// ─── scorerRowsFromRanking — RankingListDto → HomePage scorerRows shape ──
// HomePage:471 이 topScorers === null 과 빈 배열을 다른 UI 로 그린다 —
// null=NotImplementedState · []=ShortcutCard 껍데기. 둘을 뭉개면 안 된다.
describe('scorerRowsFromRanking', () => {
  it('returns null when the upstream request failed (null dto)', () => {
    expect(scorerRowsFromRanking(null)).toBeNull()
    expect(scorerRowsFromRanking(undefined)).toBeNull()
  })

  // 6대회 합산이 0건이라 items:[] 로 200 응답이 올 수 있다 — 이건 실패가 아니다 (dto 주석)
  it('returns an empty array when items=[] (0-hit is not a failure)', () => {
    const out = scorerRowsFromRanking({ competition: null, season: null, items: [], asOf: '2026-11-23T15:00:00.000Z' })
    expect(Array.isArray(out)).toBe(true)
    expect(out).toHaveLength(0)
  })

  it('maps rank·value·player.displayName·team.displayName to HomePage row shape', () => {
    const dto = {
      competition: null,
      season: null,
      items: [
        { rank: 1, value: 22, player: { displayName: 'Erling Haaland' }, team: { displayName: 'Manchester City' } },
        { rank: 2, value: 18, player: { displayName: 'Mohamed Salah' }, team: { displayName: 'Liverpool' } },
      ],
      asOf: '2026-11-23T15:00:00.000Z',
    }
    const out = scorerRowsFromRanking(dto)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ rank: 1, value: 22, playerName: 'Erling Haaland', teamName: 'Manchester City' })
    expect(out[1]).toEqual({ rank: 2, value: 18, playerName: 'Mohamed Salah', teamName: 'Liverpool' })
  })

  // value=0 은 실제 값 · null 로 뭉개면 안 됨 (DATA_RULES 3장)
  it('keeps value=0 as a value (does not coerce to null)', () => {
    const out = scorerRowsFromRanking({
      items: [{ rank: 1, value: 0, player: { displayName: 'Zero Goal' }, team: { displayName: 'Team A' } }],
    })
    expect(out[0].value).toBe(0)
  })

  // 실 API 는 항상 player·team 을 주지만 방어 — displayName 없으면 빈 문자열
  it('defends against missing player/team displayName (empty string, not null)', () => {
    const out = scorerRowsFromRanking({
      items: [{ rank: 1, value: 5, player: {}, team: {} }],
    })
    expect(out[0].playerName).toBe('')
    expect(out[0].teamName).toBe('')
  })
})

// ─── normalizeSearchResults — SearchResultsDto → SearchPanel item shape ──
//
// 백엔드가 이미 이름 매칭을 마쳤다 — 프론트는 표시용 shape 로 변환만 한다.
// SearchPanel 이 소비하는 필드: {type,id,slug,label,sublabel,initials?,color?,logoUrl?,shortName?,names}.
// UI 는 손대지 않는 대신 shape 을 정확히 맞춰 SearchPanel 이 조건분기 없이 렌더링하게 한다.

describe('normalizeSearchResults', () => {
  const dto = {
    q: 'man',
    asOf: '2026-11-23T15:00:00.000Z',
    teams: [
      {
        ref: '33-manchester-united', apiId: 33,
        displayName: 'Manchester United', shortDisplayName: 'Man Utd', originalName: 'Manchester United',
        logoUrl: 'https://media.api-sports.io/football/teams/33.png',
        country: 'England',
      },
      {
        ref: '50-manchester-city', apiId: 50,
        displayName: 'Manchester City', shortDisplayName: 'Man City', originalName: 'Manchester City',
        logoUrl: null, // 원본 없음 → 로컬 파일도 없음
        country: 'England',
      },
    ],
    players: [
      {
        ref: '154-manuel-neuer', apiId: 154,
        displayName: 'Manuel Neuer', shortDisplayName: 'M. Neuer', originalName: 'Manuel Neuer',
        photoUrl: null,
        teamName: 'Bayern Munich',
      },
    ],
    competitions: [
      {
        ref: '39-premier-league', apiId: 39,
        displayName: 'Premier League', shortDisplayName: 'EPL', originalName: 'Premier League',
        country: 'England',
      },
    ],
  }

  it('maps three arrays into SearchPanel item shape', () => {
    const out = normalizeSearchResults(dto)
    expect(out.teams).toHaveLength(2)
    expect(out.players).toHaveLength(1)
    expect(out.competitions).toHaveLength(1)
  })

  it('team items carry apiId-derived initials·color·logoUrl (backend does not provide these)', () => {
    const [mun, mci] = normalizeSearchResults(dto).teams
    expect(mun).toMatchObject({
      type: 'team',
      id:   '33-manchester-united',
      slug: '33-manchester-united',
      label: 'Manchester United',
      sublabel: 'England',
      logoUrl: '/logos/teams/33.webp',
    })
    expect(mun.color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(mun.initials).toBeTruthy()
    // logoUrl 은 원본이 null 이면 로컬 파일도 없다 (정직 규약)
    expect(mci.logoUrl).toBeNull()
  })

  it('player items map ref·displayName·teamName', () => {
    const [player] = normalizeSearchResults(dto).players
    expect(player).toEqual({
      type: 'player',
      id:   '154-manuel-neuer',
      slug: '154-manuel-neuer',
      label: 'Manuel Neuer',
      sublabel: 'Bayern Munich',
      names: [],
    })
  })

  it('competition items map ref·displayName·country·shortDisplayName as shortName', () => {
    const [comp] = normalizeSearchResults(dto).competitions
    expect(comp).toEqual({
      type: 'competition',
      id:   '39-premier-league',
      slug: '39-premier-league',
      label: 'Premier League',
      sublabel: 'England',
      shortName: 'EPL',
      logoUrl: null,   // 검색 DTO 에 logoUrl 없음 — shortName 3자 배지로 폴백
      names: [],
    })
  })

  // names 는 빈 배열 — 매칭은 백엔드가 이미 했다. SearchPanel 은 매칭 필드를 안 쓴다
  it('leaves names empty (backend already matched — no client-side re-filtering)', () => {
    const out = normalizeSearchResults(dto)
    for (const group of [out.teams, out.players, out.competitions]) {
      for (const item of group) expect(item.names).toEqual([])
    }
  })

  // q.length <= 1 은 200 with 빈 배열들 — 400 아님 (백엔드 계약)
  it('handles empty-arrays response (short query · 0-hit both are shaped the same)', () => {
    const out = normalizeSearchResults({ q: 'a', teams: [], players: [], competitions: [], asOf: null })
    expect(out).toEqual({ teams: [], players: [], competitions: [] })
  })

  // teams·players·competitions 셋 중 하나가 undefined 로 오는 상황 방어 (실 API 는 항상 배열)
  it('defends against missing arrays (falls back to empty)', () => {
    const out = normalizeSearchResults({ q: 'x' })
    expect(out).toEqual({ teams: [], players: [], competitions: [] })
  })

  // 백엔드가 localized displayName 을 주는 미래에도 label 은 그대로 displayName 을 쓴다 —
  // 프론트가 originalName 을 다시 선택하지 않는다. 여기서는 displayName 이 다른 값으로 오는 상황만 잠근다.
  it('uses displayName as label even when it differs from originalName (backend locale responsibility)', () => {
    const out = normalizeSearchResults({
      q: 'x',
      teams: [{
        ref: '33-manchester-united', apiId: 33,
        displayName: 'LocalizedName', shortDisplayName: 'Short', originalName: 'Manchester United',
        country: 'England', logoUrl: null,
      }],
      players: [], competitions: [],
    })
    expect(out.teams[0].label).toBe('LocalizedName')
  })
})
