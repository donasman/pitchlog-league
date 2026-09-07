/**
 * 정규화 계층 — 백엔드 응답을 화면이 쓰는 형태로 옮긴다 (NEXT_STEPS 11장)
 *
 * 왜 한 겹이 필요한가:
 *   백엔드는 `ref`(`<apiId>-<slug>`)·이름 3종·`currentSeason` 객체를 준다.
 *   화면은 `slug`·`name`/`shortName`·`currentSeason` 문자열을 쓴다.
 *   이 차이를 페이지마다 흡수하면 백엔드 스펙 변경이 화면 전체로 번진다.
 *
 * null 정규화도 여기서 한다. 백엔드는 없는 값을 null 로 준다(컵 하부팀의 code·venue 등).
 * 화면은 null 을 그리지 않는다 — 여기서 대체값을 정하고, 대체가 불가능하면 null 을 그대로 넘겨
 * 컴포넌트가 "없음" 상태로 렌더링하게 둔다. 빈 문자열로 위장하지 않는다.
 */

import { getDisplayState, isFinished, isLive } from '../utils/matchStatus.js'
import { now } from './clock.js'

/**
 * 화면에 노출하는 대회 — 백엔드는 17개(컵·슈퍼컵 포함)를 주지만 화면은 아직 6개 전제다.
 * 백엔드 `LogoService.SCREEN_DISPLAY_ORDER_MAX` 와 같은 범위다 — 한쪽만 바뀌면 로고가 빈다.
 */
export const VISIBLE_COMPETITION_API_IDS = [39, 140, 78, 135, 61, 2]

/**
 * 로고는 우리가 받아서 줄여 둔 정적 파일을 쓴다 (NEXT_STEPS 5장).
 * API-Football media URL 직링크는 09-07 실측에서 한 화면 96개가 11초 뒤에도
 * 전부 로딩 미완료였다 — 원본 90KB + 동시 연결 제한. 실패가 아니라 "영원히 로딩" 이라
 * `<img onError>` 폴백조차 걸리지 않았다. 우리 파일은 없으면 404 가 즉시 나서 폴백이 산다.
 *
 * 나중에 R2 로 옮기면 이 접두사만 바꾼다.
 */
const LOGO_BASE = ((import.meta.env ?? {}).VITE_LOGO_BASE_URL ?? '/logos').replace(/\/+$/, '')

/**
 * @param {'teams'|'competitions'} kind
 * @param {number} apiId
 * @param {string|null} sourceUrl  원본이 아예 없으면 우리 파일도 없다
 */
function localLogo(kind, apiId, sourceUrl) {
  return sourceUrl ? `${LOGO_BASE}/${kind}/${apiId}.webp` : null
}

/**
 * i18n(`entityNames.js`)·라우팅이 쓰는 기존 식별자.
 * 팀에는 이런 표가 없다 — 1,888개라 손으로 못 맞춘다. 팀 이름은 백엔드가 주는
 * 영어 이름을 쓰다가 11단계 `localized_names` 적재 후 한국어가 붙는다.
 */
const COMPETITION_ALIAS = {
  39:  { id: 'epl',        slug: 'premier-league',   initials: 'PL'  },
  140: { id: 'laliga',     slug: 'la-liga',          initials: 'LL'  },
  78:  { id: 'bundesliga', slug: 'bundesliga',       initials: 'BL'  },
  135: { id: 'seriea',     slug: 'serie-a',          initials: 'SA'  },
  61:  { id: 'ligue1',     slug: 'ligue-1',          initials: 'L1'  },
  2:   { id: 'ucl',        slug: 'champions-league', initials: 'UCL' },
}

/**
 * 역표: 화면 slug(`premier-league`) → 백엔드 ref(`39-premier-league`). 모르는 slug 면 null.
 * 백엔드 parseRef 는 숫자 접두만 읽으므로 뒤에 붙는 slug 는 화면 것을 그대로 써도 된다.
 * @param {string} slug
 * @returns {string|null}
 */
export function competitionRefFromSlug(slug) {
  const hit = Object.entries(COMPETITION_ALIAS).find(([, a]) => a.slug === slug)
  return hit ? `${hit[0]}-${hit[1].slug}` : null
}

/** 백엔드 CompetitionFormat → 화면이 쓰던 format 값 */
const FORMAT = {
  ROUND_ROBIN: 'league',
  KNOCKOUT: 'cup',
  LEAGUE_PHASE_KNOCKOUT: 'groups_knockout',
}

/** `39-premier-league` → `premier-league`. 숫자만 오면 빈 문자열 */
export function slugFromRef(ref) {
  const dash = String(ref ?? '').indexOf('-')
  return dash === -1 ? '' : String(ref).slice(dash + 1)
}

/**
 * 로고가 없을 때 쓸 이니셜. 여러 단어면 단어 첫 글자, 한 단어면 앞 세 글자.
 * @param {string} name
 */
export function deriveInitials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
}

/** 시즌 객체 → 화면이 쓰는 라벨 문자열. 등록 전 컵이면 null */
function seasonLabel(season) {
  return season?.label ?? null
}

/**
 * 대회 — 목록·상세 공통
 * @param {object} dto  CompetitionSummaryDto | CompetitionDetailDto
 */
export function normalizeCompetition(dto) {
  const alias = COMPETITION_ALIAS[dto.apiId] ?? null
  return {
    // 기존 화면·i18n·라우팅이 기대하는 식별자
    id:   alias?.id ?? dto.ref,
    slug: alias?.slug ?? slugFromRef(dto.ref),
    initials: alias?.initials ?? deriveInitials(dto.shortDisplayName),

    // 백엔드 식별자 — 상세 조회는 이걸로 한다
    ref:   dto.ref,
    apiId: dto.apiId,

    name:      dto.displayName,
    shortName: dto.shortDisplayName,
    country:   dto.country,
    countryCode: dto.countryCode,
    type:      dto.type,
    format:    FORMAT[dto.format] ?? 'league',
    logoUrl:   localLogo('competitions', dto.apiId, dto.logoUrl),
    displayOrder: dto.displayOrder,

    currentSeason:     seasonLabel(dto.currentSeason),
    currentSeasonYear: dto.currentSeason?.year ?? null,
    /** NONE/PARTIAL/COMPLETE — 시즌 선택기 노출 기준 (NEXT_STEPS 6장) */
    dataState: dto.currentSeason?.dataState ?? 'NONE',

    /** 라운드 표기는 L2(일정 적재) 이후에 생긴다. 그전엔 화면이 "없음"으로 그린다 */
    currentStageLabel: null,
  }
}

/**
 * 팀
 * @param {object} dto  TeamSummaryDto | TeamDetailDto
 */
export function normalizeTeam(dto) {
  return {
    id:   dto.ref,
    /**
     * 라우팅 식별자 = 백엔드 ref(`33-manchester-united`). 팀 상세·일정이 `/api/teams/:ref` 를
     * 부르는데 백엔드 parseRef 는 숫자 접두를 요구한다 — 접두를 뗀 slug 로는 400 이 난다.
     */
    slug: dto.ref,
    ref:  dto.ref,
    apiId: dto.apiId,

    name:      dto.displayName,
    // 백엔드 shortDisplayName 은 shortName 이 없으면 code(ARS) 로 떨어진다 — 카드에 "ARS ARS" 가 찍힌다.
    // code 와 같으면 이름을 쓴다. 진짜 짧은 이름은 localized_names 적재(NEXT_STEPS 11장) 때 온다
    shortName: dto.shortDisplayName && dto.shortDisplayName !== dto.code ? dto.shortDisplayName : dto.displayName,
    /** 로고가 못 뜰 때만 쓰인다 — code(MUN) 가 없으면 이름에서 만든다 */
    initials:  teamInitials(dto),
    logoUrl:   localLogo('teams', dto.apiId, dto.logoUrl),
    /** 배지 배경색. 백엔드에 팀 색이 없어 apiId 에서 결정적으로 만든다 */
    color:     teamColor(dto.apiId),

    country:     dto.country,
    foundedYear: dto.founded,

    // 상세에만 있는 것들. 목록에서는 undefined 가 아니라 null 로 맞춰 형태를 하나로 둔다
    stadium:         dto.venue?.name ?? null,
    city:            dto.venue?.city ?? null,
    stadiumCapacity: dto.venue?.capacity ?? null,
    competitions:    dto.participations?.map(p => p.competitionRef) ?? [],
  }
}

/** 시즌 요약 — 시즌 선택기용 */
export function normalizeSeason(dto) {
  return {
    id:    dto.label,
    label: dto.label,
    year:  dto.year,
    current: dto.isCurrent,
    status:  dto.status,
    dataState: dto.dataState,
  }
}

// ─── 팀 색·이니셜 ──────────────────────────────────────────────

/** normalizeTeam · normalizeStanding 이 같은 규칙으로 이니셜을 만든다 */
function teamInitials(dto) {
  return dto.code ?? deriveInitials(dto.shortDisplayName)
}

/** 0~1 채널 값 → 두 자리 소문자 hex */
function hex2(v) {
  return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
}

/**
 * 팀 apiId → `#rrggbb` (소문자 6자리 — `TeamBadge.getTextColor` 가 `hex.slice(1,3)` 로 읽는다).
 * 황금각(137.508°) 회전이라 이웃한 id 끼리도 색이 갈리고, 같은 id 는 항상 같은 색이다.
 * @param {number} apiTeamId
 */
export function teamColor(apiTeamId) {
  const hue = ((Number(apiTeamId) || 0) * 137.508) % 360
  const s = 0.55
  const l = 0.40
  // HSL → RGB
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = hue / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0, g = 0, b = 0
  if      (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else             [r, g, b] = [c, 0, x]
  const m = l - c / 2
  return `#${hex2(r + m)}${hex2(g + m)}${hex2(b + m)}`
}

// ─── 순위 구역 ──────────────────────────────────────────────────

/**
 * API-Football 순위 행의 description → 화면 구역 (`utils/standingsZone.js` 의 StandingZone).
 * 대소문자 무시 부분 문자열, 위에서 아래로 첫 일치.
 * description 으로 못 정했고 UCL 리그 페이즈면 순위로 정한다 (1~8 직행 · 9~24 PO · 25~ 탈락).
 *
 * @param {string|null|undefined} description
 * @param {string} format  normalizeCompetition 이 만드는 값 ('league'|'cup'|'groups_knockout')
 * @param {number} rank
 * @returns {import('../utils/standingsZone.js').StandingZone}
 */
export function zoneOf(description, format, rank) {
  const d = String(description ?? '').toLowerCase()
  if (d) {
    const has = word => d.includes(word)
    if (has('champions league') && (has('qualif') || has('play'))) return 'champions_league_playoff'
    if (has('champions league')) return 'champions_league'
    if (has('conference')) return 'europa_conference'
    if (has('europa')) return 'europa_league'
    if (has('relegation') && has('play')) return 'relegation_playoff'
    if (has('relegation')) return 'relegation'
  }
  if (format === 'groups_knockout' && Number.isFinite(rank)) {
    if (rank <= 8) return 'ucl_direct'
    if (rank <= 24) return 'ucl_playoff'
    return 'ucl_eliminated'
  }
  return 'none'
}

// ─── 경기 ──────────────────────────────────────────────────────

const LEG = { FIRST: 1, SECOND: 2 }

/** 대회 참조 조각 → 화면 식별자 3종. 경기·순위표가 같이 쓴다 */
function competitionIds(comp) {
  const alias = COMPETITION_ALIAS[comp?.apiId] ?? null
  return {
    competitionId:   alias?.id   ?? comp?.ref ?? null,
    competitionSlug: alias?.slug ?? slugFromRef(comp?.ref),
    competitionName: comp?.displayName ?? null,
  }
}

/**
 * 경기 — Mock `mocks/matches.js` 의 키와 1:1. `competition` 객체는 넣지 않는다
 * (Mock 에 없어 MatchCard 머리글이 갈린다). 스코어는 항상 `{home, away}` 객체 — 없으면 둘 다 null.
 * @param {object} dto  MatchDto
 */
export function normalizeMatch(dto) {
  const statsState = dto.statsState ?? 'NONE'
  const venue = dto.venue ? [dto.venue.name, dto.venue.city].filter(Boolean).join(', ') : null
  return {
    id: String(dto.id),
    ...competitionIds(dto.competition),
    seasonId: dto.season?.label ?? null,
    round:    dto.round?.name ?? null,
    stage:    null,
    date:     dto.kickoffAt,
    venue:    venue || null,
    homeTeam: normalizeTeam(dto.home),
    awayTeam: normalizeTeam(dto.away),
    score: { home: dto.goals?.home ?? null, away: dto.goals?.away ?? null },
    statusCode:   dto.statusShort,
    statsState,
    displayState: getDisplayState(dto.statusShort, statsState),
    // 경과 분은 진행 중일 때만 뜻이 있다 — 끝난 경기에 "90'" 을 찍지 않는다 (실 API 화면 실측 09-07)
    minute:   isLive(getDisplayState(dto.statusShort, statsState)) ? (dto.elapsed ?? null) : null,
    events:   [],
    headToHead:     null,
    aggregateScore: null,
    qualifier:      null,
    leg: LEG[dto.leg] ?? null,
    tieId: null,

    // 백엔드 통과 키 — 상세 탭 결손 판정과 스테이지 계산에 쓴다
    winnerTeamRef:  dto.winnerTeamRef ?? null,
    roundOrdinal:   dto.round?.ordinal ?? null,
    roundMatchCount: dto.round?.matchCount ?? null,
    detailEligible: dto.detailEligible ?? null,
    hasEvents:      dto.hasEvents ?? null,
    hasLineups:     dto.hasLineups ?? null,
    hasTeamStats:   dto.hasTeamStats ?? null,
    hasPlayerStats: dto.hasPlayerStats ?? null,
    asOf:           dto.asOf ?? null,
  }
}

/** 종료로 치는 표시 상태 — 취소도 그 라운드에서는 더 진행될 것이 없다 */
function isSettled(state) {
  return isFinished(state) || state === 'cancelled'
}

/**
 * 경기 목록으로 현재 라운드를 정한다 — 시작한 경기 중 가장 늦은 라운드.
 * 그 라운드 경기가 전부 끝났고(취소 포함) 라운드 경기 수를 채웠으면 completed, 아니면 ongoing.
 * @param {Array<ReturnType<typeof normalizeMatch>>} matches
 * @param {Date} nowDate
 * @returns {{ label: string, status: 'ongoing'|'completed' } | null}
 */
export function deriveStage(matches, nowDate) {
  const nowMs = new Date(nowDate).getTime()
  const started = (matches ?? []).filter(m => m.date && new Date(m.date).getTime() <= nowMs && m.roundOrdinal != null)
  if (started.length === 0) return null

  const cur = Math.max(...started.map(m => m.roundOrdinal))
  const roundMatches = (matches ?? []).filter(m => m.roundOrdinal === cur)
  const label = roundMatches.find(m => m.round)?.round ?? String(cur)

  const settled = roundMatches.filter(m => isSettled(m.displayState)).length
  const expected = roundMatches.find(m => m.roundMatchCount != null)?.roundMatchCount ?? null
  const allSettled = settled === roundMatches.length && (expected == null || settled >= expected)

  return { label, status: allSettled ? 'completed' : 'ongoing' }
}

// ─── 순위 ──────────────────────────────────────────────────────

/**
 * 순위 행 → Mock `mocks/standings.js` 의 entries 행
 * @param {object} row  StandingRowDto
 * @param {{ format: string }} ctx  normalizeCompetition 의 format 값
 */
export function normalizeStanding(row, { format } = {}) {
  return {
    rank:   row.rank,
    teamId: row.team.ref,
    teamSlug: row.team.ref,
    teamName: row.team.displayName,
    teamInitials: teamInitials(row.team),
    teamColor: teamColor(row.team.apiId),
    played: row.played,
    won:    row.win,
    drawn:  row.draw,
    lost:   row.lose,
    goalsFor:       row.goalsFor,
    goalsAgainst:   row.goalsAgainst,
    goalDifference: row.goalDiff,
    points: row.points,
    form: String(row.form ?? '').split('').filter(c => 'WDL'.includes(c)).slice(-5),
    zone: zoneOf(row.description, format, row.rank),
  }
}

/**
 * 순위표 한 장 → Mock `STANDINGS[slug]` 형태. `unavailableReason`(KNOCKOUT·EMPTY) 이면 entries 는 비운다 —
 * 화면이 "없음" 과 "실패" 를 구분하도록 이유를 같이 넘긴다.
 * @param {object} table  StandingsTableDto
 * @param {Array<ReturnType<typeof normalizeMatch>>} matches  같은 대회 경기 — 스테이지 계산용
 */
export function normalizeStandings(table, matches = []) {
  const format = FORMAT[table.competition?.format] ?? 'league'
  const unavailableReason = table.unavailableReason ?? null
  return {
    competitionId: competitionIds(table.competition).competitionId,
    seasonId:  table.season?.label ?? null,
    stage:     deriveStage(matches, now()),
    updatedAt: table.asOf ?? null,
    entries:   unavailableReason ? [] : (table.rows ?? []).map(row => normalizeStanding(row, { format })),
    unavailableReason,
  }
}
