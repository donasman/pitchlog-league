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

/**
 * 역표: 화면 대회 id(`epl`) → 백엔드 apiId(39). 모르는 id 면 null.
 * Mock 이 DTO shape 을 조립할 때 alias.id 뿐이라 apiId 를 되찾는 데 쓴다.
 * @param {string} id
 * @returns {number|null}
 */
export function apiIdFromAlias(id) {
  const hit = Object.entries(COMPETITION_ALIAS).find(([, v]) => v.id === id)
  return hit ? Number(hit[0]) : null
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

/**
 * 팀 상세 (TeamDetailDto) → TeamPage 가 소비하는 형태.
 * normalizeTeam 이 목록·상세 공통이라 손대지 않고 상세 전용 필드(수용 인원·감독 등)를
 * 여기에 얇게 추가한다. TeamPage 는 initials·color 를 위해 파생값도 함께 소비한다.
 *
 * 없는 값 규약:
 *   - venue=null → stadium·stadiumCapacity·stadiumCity·stadiumSurface·stadiumImageUrl 모두 null
 *   - manager 는 백엔드가 아직 안 준다 → 항상 null (표시 안 함 · 채우면 "미정" 이라 위장하는 셈)
 *   - color: null — 백엔드에 팀 색이 없다. TeamBadge 는 apiId 로 파생값을 만들어 쓰지만
 *     그건 리스트용 정규화(normalizeTeam)에서만 하고 상세에서는 null 을 유지 (TeamBadge 가 자체 폴백)
 *   - capacity: 0 은 값 · null 은 미측정 (0 데이터는 실제로 안 오지만 방어)
 *
 * @param {object} dto  TeamDetailDto
 */
export function normalizeTeamDetail(dto) {
  const short = String(dto.shortDisplayName ?? '')
  const initialsSource = short.length > 0 ? short : String(dto.displayName ?? '')
  return {
    id:              dto.ref,
    slug:            dto.ref,
    ref:             dto.ref,
    apiId:           dto.apiId,
    name:            dto.displayName,
    shortName:       dto.shortDisplayName,
    initials:        initialsSource.slice(0, 2).toUpperCase() || '?',
    // 백엔드 미제공 — TeamBadge 는 null 이면 자체 폴백 색을 쓴다
    color:           null,
    logoUrl:         localLogo('teams', dto.apiId, dto.logoUrl),
    country:         dto.country,
    foundedYear:     dto.founded,
    stadium:         dto.venue?.name ?? null,
    stadiumCapacity: dto.venue?.capacity ?? null,
    stadiumCity:     dto.venue?.city ?? null,
    stadiumSurface:  dto.venue?.surface ?? null,
    stadiumImageUrl: dto.venue?.imageUrl ?? null,
    // 백엔드 미제공 — 화면은 이 값을 "-" 또는 미표시로 그린다
    manager:         null,
    // fetchTeamDetail 이 competitions 조립에 사용 (participations.competitionRef 로 조인)
    participations:  dto.participations ?? [],
    asOf:            dto.asOf,
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
 * 문자열을 결정론적 양의 정수로 접는다 (djb2). `teamColor` 입력 가드 전용 — export 하지 않는다.
 * Mock `player.teamId` 처럼 apiId 슬롯에 문자열('mancity')이 흘러들면 `Number()` 가 NaN → 0 으로
 * 폴백해 팀 배지 색이 한 종류로 몰린다. 문자열이면 해시로 떨어뜨려 색이 분산되게 둔다.
 * @param {string} s
 */
function hashString(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * 팀 apiId → `#rrggbb` (소문자 6자리 — `TeamBadge.getTextColor` 가 `hex.slice(1,3)` 로 읽는다).
 * 황금각(137.508°) 회전이라 이웃한 id 끼리도 색이 갈리고, 같은 id 는 항상 같은 색이다.
 *
 * 입력 가드: 유한한 숫자면 그대로. 비어 있지 않은 문자열이면 djb2 해시로 정수화(Mock `player.teamId`
 * 문자열 유입에서 NaN → 0 폴백을 막는다). 그 외는 0. 숫자 입력의 색은 가드 이전과 동일하다.
 * @param {number|string} apiTeamId
 */
export function teamColor(apiTeamId) {
  const n = typeof apiTeamId === 'number' && Number.isFinite(apiTeamId)
    ? apiTeamId
    : typeof apiTeamId === 'string' && apiTeamId.length > 0
      ? hashString(apiTeamId)
      : 0
  const hue = (n * 137.508) % 360
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
 * UCL description 이 가리키는 **결선 라운드**. API-Football 은 "그 라운드로 올라간다" 는
 * 뜻으로 이 표기를 쓴다 — 예선이 아니다. 어느 라운드인지가 곧 구역이다 (2026-09-08 실측).
 *
 *   `Play Offs: 1/8-finals`   → 16강 직행   — 2022·2023 조 1·2위, 2024·2025 리그페이즈 1~8위
 *   `Play Offs: 1/16-finals`  → 녹아웃 PO   — 2024·2025 리그페이즈 9~24위
 *
 * **둘을 같이 묶으면 안 된다.** 하나로 묶어 "직행" 으로 보내면 2024·2025 의 16개 팀이
 * 플레이오프를 치러야 하는데 직행으로 칠해진다.
 *
 * `-finals` 를 요구한다. 숫자만 보면 날짜(`1/2/2026`)·분수 표기에도 걸린다.
 */
const KNOCKOUT_ROUND_ZONE = [
  [/1\/8-finals/, 'ucl_direct'],
  [/1\/16-finals/, 'ucl_playoff'],
]

/**
 * API-Football 순위 행의 description → 화면 구역 (`utils/standingsZone.js` 의 StandingZone).
 * 대소문자 무시 부분 문자열, 위에서 아래로 첫 일치.
 * description 으로 못 정했고 단일 조 UCL 리그 페이즈면 순위로 정한다 (1~8 직행 · 9~24 PO · 25~ 탈락).
 *
 * @param {string|null|undefined} description
 * @param {string} format  normalizeCompetition 이 만드는 값 ('league'|'cup'|'groups_knockout')
 * @param {number} rank
 * @param {{ groupCount?: number }} [options]  같은 표에 든 조 수. 2 이상이면 순위 폴백을 쓰지 않는다
 * @returns {import('../utils/standingsZone.js').StandingZone}
 */
export function zoneOf(description, format, rank, options = {}) {
  const { groupCount = 1 } = options
  const d = String(description ?? '').toLowerCase()
  if (d) {
    const has = word => d.includes(word)
    // UCL 은 결선 라운드 표기가 곧 구역이다. 아래 `play` 규칙에 걸리면 "예선 플레이오프" 로
    // 오해되므로 먼저 걸러낸다 — 실제로는 예선이 아니라 본선 진출 경로다.
    if (has('champions league')) {
      for (const [re, zone] of KNOCKOUT_ROUND_ZONE) if (re.test(d)) return zone
    }
    if (has('champions league') && (has('qualif') || has('play'))) return 'champions_league_playoff'
    if (has('champions league')) return 'champions_league'
    if (has('conference')) return 'europa_conference'
    if (has('europa')) return 'europa_league'
    if (has('relegation') && has('play')) return 'relegation_playoff'
    if (has('relegation')) return 'relegation'
  }
  // 8/24/36 경계는 36팀 단일 리그 페이즈 전용이다. 여러 조로 쪼갠 표에 쓰면
  // 4팀 조의 4위(description 이 null)가 rank 4 ≤ 8 이라 16강 직행으로 칠해진다.
  // 조 크기로 탈락을 추론하지 않는다 — API 가 말하지 않았으면 칠하지 않는다.
  if (format === 'groups_knockout' && groupCount <= 1 && Number.isFinite(rank)) {
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
 * @param {{ format?: string, groupCount?: number }} ctx  format 은 normalizeCompetition 값,
 *   groupCount 는 같은 표의 조 수(zoneOf 의 순위 폴백 가드)
 */
export function normalizeStanding(row, { format, groupCount = 1 } = {}) {
  return {
    rank:   row.rank,
    // 조별리그 표를 조 단위로 나눠 그리려면 화면까지 조 이름이 살아 있어야 한다.
    // 단일 표 대회는 여기에 대회 이름이 들어온다 — 값의 가짓수로만 조별리그를 판정한다.
    groupName: row.groupName ?? null,
    teamId: row.team.ref,
    teamSlug: row.team.ref,
    teamApiId: row.team.apiId,
    teamName: row.team.displayName,
    teamInitials: teamInitials(row.team),
    teamColor: teamColor(row.team.apiId),
    // 로고는 파생 필드 — 화면·홈 카드가 손으로 localLogo 를 만들지 않도록 여기서 한 번에 만든다
    teamLogoUrl: localLogo('teams', row.team.apiId, row.team.logoUrl),
    played: row.played,
    won:    row.win,
    drawn:  row.draw,
    lost:   row.lose,
    goalsFor:       row.goalsFor,
    goalsAgainst:   row.goalsAgainst,
    goalDifference: row.goalDiff,
    points: row.points,
    // API 의 form 은 최신순 문자열(예: "WDWLL" = 최신 W → 오래된 L). slice(-5) 를 쓰면 뒤쪽=오래된 5개가 잘려 나오므로
    // slice(0,5) 로 최신 5개를 잡고 .reverse() 로 왼쪽=오래된 순서로 뒤집는다 (배지 표시 관습). StandingsTable·TeamPage 둘 다 같은 배열을 소비.
    form: String(row.form ?? '').split('').filter(c => 'WDL'.includes(c)).slice(0, 5).reverse(),
    zone: zoneOf(row.description, format, row.rank, { groupCount }),
  }
}

// ─── 선수 · 통계 순위 ─────────────────────────────────────────

/**
 * 선수 시즌 통계 한 행 → 화면(PlayerPage) 이 쓰는 형태.
 * `assists` 는 백엔드가 null 을 줄 수 있다 — 0 으로 채우지 않고 null 을 그대로 넘겨
 * `formatStat` 이 "-" 를 그리게 한다 (DATA_RULES §3).
 *
 * `key` 는 React 목록 key + 필터 옵션 값 겸용이다. 컴포넌트가 4자리(대회·시즌·팀) 를
 * 조합해서 만들지 않도록 여기서 한 번에 만들어 둔다 — 조합 규칙이 두 자리로 갈리는 것을 막는다.
 * private — 파일 밖으로 노출하지 않는다.
 * @param {object} s  PlayerSeasonStatDto
 */
function normalizePlayerSeasonStat(s) {
  const alias = COMPETITION_ALIAS[s.competition?.apiId] ?? null
  const competitionId = alias?.id ?? s.competition?.ref ?? null
  const seasonLabel   = s.season?.label ?? null
  const teamName      = s.team?.displayName ?? null
  return {
    key: `${competitionId}-${seasonLabel}-${teamName}`,
    competitionId,
    competitionName: s.competition?.displayName ?? null,
    seasonLabel,
    teamName,
    appearances:     s.appearances,
    starts:          s.starts,
    minutesPlayed:   s.minutes,
    goals:           s.goals,
    // ★ assists 는 null 유지 — 측정되지 않은 값을 0 으로 위장하지 않는다
    assists:         s.assists,
    yellowCards:     s.yellowCards,
    yellowredCards:  s.yellowredCards,
    redCards:        s.redCards,
  }
}

/**
 * 선수 시즌 통계 rows 의 합계 · 필드마다 독립.
 * 백엔드 `player.service.ts:102-112` 와 같은 규약을 프론트에도 잠근다:
 *   assists 만 특별 처리 — 하나라도 null 이면 합계 null · 아니면 SUM. 나머지는 그대로 SUM.
 *
 * 규약 등식 (`normalize.test.js` 가 잠금): `playerTotals(allStats) === dto.totals`.
 * 화면 상단 그리드가 필터 부분집합에 대해 부분 합계를 그릴 때만 이 함수를 쓴다 —
 * 전체 합계는 백엔드 dto.totals 를 그대로 신뢰한다.
 *
 * @param {Array<{appearances:number,minutesPlayed:number,goals:number,assists:number|null,yellowCards:number,redCards:number}>} rows
 */
export function playerTotals(rows) {
  const assistsHasNull = rows.some(r => r.assists === null)
  return {
    appearances: rows.reduce((a, r) => a + r.appearances, 0),
    minutes:     rows.reduce((a, r) => a + r.minutesPlayed, 0),
    goals:       rows.reduce((a, r) => a + r.goals, 0),
    assists:     assistsHasNull ? null : rows.reduce((a, r) => a + (r.assists ?? 0), 0),
    yellowCards: rows.reduce((a, r) => a + r.yellowCards, 0),
    redCards:    rows.reduce((a, r) => a + r.redCards, 0),
  }
}

/**
 * 통계 셀 표시 · null·undefined 는 '-' · 숫자·문자열은 그대로.
 * 컴포넌트가 판단 로직을 갖지 않도록 표시 결정을 여기 하나로 모은다 —
 * "값이 null 이면 어떻게 그릴 것인가" 는 정규화 계층의 책임이지 컴포넌트의 판단이 아니다.
 *
 * @param {number|null|undefined} value
 * @returns {string|number}
 */
export function formatStat(value) {
  return value === null || value === undefined ? '-' : value
}

/**
 * 랭킹 응답(RankingListDto) → 홈 ShortcutCard 가 소비하는 얇은 rows.
 *
 * 세 갈래로 갈린다 — 화면이 이 셋을 서로 다른 상태로 그린다:
 *   - dto === null           → 반환 null (호출 실패 · UI 는 NotImplementedState)
 *   - dto.items === []       → 반환 [] (백엔드는 살아 있음 · 카드 껍데기)
 *   - dto.items 가 채워짐    → { rank, playerName, teamName, value } 배열
 *
 * value=0 은 값으로 유지한다 (null 로 뭉개지 않음). displayName 이 없으면 빈 문자열로
 * 방어 — 실 API 는 항상 준다.
 * @param {object|null} dto  RankingListDto 또는 실패 시 null
 * @returns {Array<{rank:number,value:number,playerName:string,teamName:string}>|null}
 */
export function scorerRowsFromRanking(dto) {
  if (dto === null || dto === undefined) return null
  return (dto.items ?? []).map(r => ({
    rank:       r.rank,
    value:      r.value,
    playerName: r.player?.displayName ?? '',
    teamName:   r.team?.displayName ?? '',
  }))
}

/**
 * 선수 상세 (PlayerDetailDto) → PlayerPage 가 소비하는 { player, allStats, team, totals } 묶음.
 * player.slug 는 백엔드 ref 를 그대로 쓴다 — 라우팅과 상세 조회 경로가 같은 식별자를 공유한다.
 * @param {object} dto  PlayerDetailDto
 */
export function normalizePlayerDetail(dto) {
  const team = dto.primaryTeam ? normalizeTeam(dto.primaryTeam) : null
  return {
    player: {
      id:          String(dto.apiId),
      slug:        dto.ref,
      name:        dto.displayName,
      shortName:   dto.shortDisplayName,
      nationality: dto.nationality,
      dateOfBirth: dto.birthDate,
      position:    dto.position,
      number:      dto.jerseyNumber,
      teamId:      team?.id ?? null,
      teamSlug:    team?.slug ?? null,
      teamName:    team?.name ?? null,
      photoUrl:    dto.photoUrl,
    },
    allStats: (dto.seasonStats ?? []).map(normalizePlayerSeasonStat),
    team,
    totals: {
      appearances: dto.totals?.appearances ?? 0,
      minutes:     dto.totals?.minutes ?? 0,
      goals:       dto.totals?.goals ?? 0,
      // ★ 하나라도 assists=null 이면 총합도 null 이어야 한다 — 백엔드가 판정해 준 값을 그대로 신뢰
      assists:     dto.totals?.assists ?? null,
      yellowCards: dto.totals?.yellowCards ?? 0,
      redCards:    dto.totals?.redCards ?? 0,
    },
    asOf: dto.asOf,
  }
}

/**
 * 통계 순위 한 행(RankingItemDto) → StatsPage 가 소비하는 RankRow.
 * `breakdown` 은 전체 합산 모드(competition/season 이 null 일 때)에만 딸려 온다 —
 * 대회별 모드에서는 undefined → null 로 넘긴다(StatsPage 는 falsy 판정으로 안 그린다).
 * breakdown 항목의 필드명은 `goals` 로 통일한다 — StatsPage:90 이 `b.goals` 로 접근한다.
 * @param {object} dto  RankingItemDto
 */
export function normalizeStatsRow(dto) {
  const t = dto.team
  return {
    rank:         dto.rank,
    playerId:     String(dto.player?.apiId ?? ''),
    playerSlug:   dto.player?.ref ?? null,
    playerName:   dto.player?.displayName ?? '',
    teamName:     t?.shortDisplayName || t?.displayName || '',
    teamInitials: t?.code || deriveInitials(t?.shortDisplayName || t?.displayName || ''),
    teamColor:    teamColor(t?.apiId),
    // 로고 파생 — 순위 카드가 손으로 localLogo 를 만들지 않도록 (StandingsTable · StatsRanking 대칭)
    teamLogoUrl:  localLogo('teams', t?.apiId, t?.logoUrl),
    value:        dto.value,
    breakdown:    Array.isArray(dto.breakdown)
      ? dto.breakdown.map(b => ({
          competition: COMPETITION_ALIAS[b.competition?.apiId]?.initials
                        ?? b.competition?.shortDisplayName
                        ?? '?',
          // ★ 필드명 'goals' — 도움 순위도 같은 형태다(StatsPage 는 breakdown 을 득점에서만 그린다)
          goals:       b.value,
        }))
      : null,
  }
}

/**
 * 표에 실제로 든 조 수. 단일 표 대회는 수집 때 `group_name` 에 대회 이름이 채워지므로
 * (`backend l2.service.ts` 의 `r.group || label`) "값이 있으면 조별리그" 가 성립하지 않는다.
 * 서로 다른 값이 둘 이상일 때만 조별리그다.
 * @param {Array<{groupName?: string|null}>} rows
 * @returns {number}
 */
export function groupCountOf(rows) {
  const names = new Set()
  for (const r of rows ?? []) {
    const n = r?.groupName ?? null
    if (n) names.add(n)
  }
  return Math.max(1, names.size)
}

// ─── 내 팀 카드 ────────────────────────────────────────────────

/**
 * 종료로 치는 표시 상태 — 취소도 그 라운드에서는 더 진행될 것이 없다.
 * 홈 "내 팀" 카드에서 "최근 결과" 판정에 쓴다.
 */
const SETTLED_DISPLAY_STATES = new Set(['confirmed', 'recheck', 'final', 'cancelled'])

/**
 * 홈 "내 팀" 카드 — 즐겨찾기 한 팀의 다음 경기·최근 결과·리그 순위를 한 조각으로 묶는다.
 *
 * 왜 정규화 계층에 두는가:
 *   화면(MyTeamCard)이 다음 · 최근 · 순위를 각자 판정하기 시작하면 판정 규칙(어느 상태가
 *   "끝난 것" 인지, 홈·원정을 어떻게 가리는지)이 컴포넌트마다 다르게 굳는다. 여기서
 *   한 번 정해 두면 다른 화면(관심 팀 대시보드 등)이 같은 규칙을 물려받는다.
 *
 * @param {object} team  fetchTeamFixtures 가 준 정규화 팀 객체 (`team.slug` = `team.ref`)
 * @param {object} teamFixturesPayload  fetchTeamFixtures 반환. `matches` 는 이미 normalizeMatch 결과다
 * @param {{ competitionSlug:string, competitionName:string, rows:Array<object> }|null} standingsShape
 *   리그 순위표(정규화된 entries)와 대회 표시 정보. KNOCKOUT · EMPTY · 리그 아님 · 에러면 null
 * @returns {{
 *   teamRef:string, teamName:string, teamColor:string, teamInitials:string, teamLogoUrl:string|null,
 *   nextMatch: (null|object), lastResult: (null|object),
 *   ranking: (null|{competitionSlug:string, competitionName:string, rank:number, played:number, points:number})
 * }}
 */
export function myTeamCard(team, teamFixturesPayload, standingsShape) {
  const matches = teamFixturesPayload?.matches ?? []

  const scheduled = matches
    .filter(m => m.displayState === 'scheduled' && m.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const settled = matches
    .filter(m => SETTLED_DISPLAY_STATES.has(m.displayState) && m.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))

  const nextMatch = scheduled[0] ? matchSummary(team, scheduled[0]) : null
  const lastResult = settled[0]  ? matchSummary(team, settled[0])  : null

  let ranking = null
  if (standingsShape && Array.isArray(standingsShape.rows) && standingsShape.rows.length > 0) {
    const row = standingsShape.rows.find(r => r.teamSlug === team.slug) ?? null
    if (row) {
      ranking = {
        competitionSlug: standingsShape.competitionSlug,
        competitionName: standingsShape.competitionName,
        rank:   row.rank,
        played: row.played,
        points: row.points,
      }
    }
  }

  return {
    teamRef:      team.ref,
    teamName:     team.name,
    teamColor:    team.color,
    teamInitials: team.initials,
    teamLogoUrl:  team.logoUrl,
    nextMatch,
    lastResult,
    ranking,
  }
}

/** 카드에서 그리는 경기 한 조각. matches 원본의 필드를 얇게 옮긴다 */
function matchSummary(team, m) {
  const isHome = m.homeTeam?.slug === team.slug
  const opponent = isHome ? m.awayTeam : m.homeTeam
  return {
    id: m.id,
    competitionSlug: m.competitionSlug,
    competitionName: m.competitionName,
    date: m.date,
    opponent: {
      name:     opponent?.name ?? '',
      initials: opponent?.initials ?? '?',
      color:    opponent?.color ?? '#2d4060',
    },
    isHome,
    statusCode:   m.statusCode,
    score:        m.score,
    displayState: m.displayState,
  }
}

// ─── 경기 상세 (A-L3) ─────────────────────────────────────────

/**
 * 라인업 한 사람 (startXI · bench 공통) → LineupTab 이 소비하는 형태.
 * playerRef 는 백엔드가 준 값을 그대로 살린다 — 이벤트 매칭 · playerStats 조인 키.
 * playerStats 는 밖에서 넘긴다(주장 판정용) — 없으면 isCaptain=false.
 *
 * @param {object} entry  { playerRef, playerName, number, position, grid }
 * @param {Map<string, boolean>} captainByRef  playerRef → isCaptain (선발 명단에 한해 채워짐)
 */
function normalizeLineupEntry(entry, captainByRef) {
  return {
    playerRef: entry?.playerRef ?? null,
    number:    entry?.number ?? null,
    name:      entry?.playerName ?? '',
    position:  entry?.position ?? null,
    isCaptain: captainByRef.get(entry?.playerRef) === true,
  }
}

/**
 * 팀 통계 한 장 → StatsPanel 이 그리는 8항목. null 은 유지한다 — 0 으로 위장하지 않는다.
 * @param {object} row  { teamRef, ...18항목 }
 */
function normalizeTeamStatsRow(row) {
  return {
    ballPossession:  row?.ballPossession ?? null,
    totalShots:      row?.totalShots ?? null,
    shotsOnGoal:     row?.shotsOnGoal ?? null,
    cornerKicks:     row?.cornerKicks ?? null,
    fouls:           row?.fouls ?? null,
    passesPercentage: row?.passesPercentage ?? null,
    expectedGoals:   row?.expectedGoals ?? null,
    goalsPrevented:  row?.goalsPrevented ?? null,
  }
}

/**
 * 경기 상세 (A-L3, `GET /api/matches/:ref/detail`) → MatchPage 가 소비하는 { lineup, stats, topRated, events, playerStats, availability, asOf }.
 *
 * 규약:
 *   - lineup: startXI 없으면 팀 전체가 null(미공개). 두 팀 모두 없으면 lineup=null.
 *   - stats:  teamStats 배열이 0·1건이면 stats=null (home·away 두 축이 필요).
 *   - topRated: rating 이 있는 선수 상위 3명. rating desc.
 *   - events: team 을 home/away 로 판정. 홈/원정 팀 ref 를 lineups 나 teamStats 로 찾는다 —
 *     둘 다 없으면 이벤트에서 처음 등장한 두 teamRef 를 홈·원정 순으로 배정한다.
 *   - availability: dto.availability 를 그대로 통과.
 *
 * @param {object} dto  MatchFullDetailDto
 * @returns {{
 *   lineup: object|null,
 *   stats: {home:object, away:object}|null,
 *   topRated: Array<object>,
 *   events: Array<object>,
 *   playerStats: Array<object>,
 *   availability: {lineups:string, events:string, teamStats:string, playerStats:string},
 *   asOf: string|null
 * }}
 */
export function matchDetail(dto) {
  const lineups     = Array.isArray(dto?.lineups)     ? dto.lineups     : []
  const events      = Array.isArray(dto?.events)      ? dto.events      : []
  const teamStats   = Array.isArray(dto?.teamStats)   ? dto.teamStats   : []
  const playerStats = Array.isArray(dto?.playerStats) ? dto.playerStats : []

  // 홈·원정 팀 ref 판정 — 라인업이 있으면 첫 번째가 홈. 없으면 teamStats 첫 번째. 그것도 없으면 events 순서
  let homeRef = lineups[0]?.teamRef ?? teamStats[0]?.teamRef ?? null
  let awayRef = lineups[1]?.teamRef ?? teamStats[1]?.teamRef ?? null
  if (!homeRef || !awayRef) {
    const refs = []
    for (const e of events) {
      if (e?.teamRef && !refs.includes(e.teamRef)) refs.push(e.teamRef)
      if (refs.length >= 2) break
    }
    homeRef = homeRef ?? refs[0] ?? null
    awayRef = awayRef ?? refs[1] ?? null
  }

  // 주장 판정 — playerStats.isCaptain 이 true 인 playerRef 를 미리 훑는다
  const captainByRef = new Map()
  for (const ps of playerStats) {
    if (ps?.isCaptain === true && ps?.playerRef != null) {
      captainByRef.set(ps.playerRef, true)
    }
  }

  // lineup — 홈·원정 각각의 팀 라인업을 찾아 조립. 두 팀 다 없으면 lineup=null
  const homeSide = lineups.find(l => l?.teamRef === homeRef) ?? null
  const awaySide = lineups.find(l => l?.teamRef === awayRef) ?? null
  const lineup = (homeSide || awaySide)
    ? {
        home: homeSide ? {
          teamRef:     homeSide.teamRef,
          teamName:    homeSide.teamName ?? '',
          formation:   homeSide.formation ?? '',
          startingXI:  (homeSide.startXI ?? []).map(e => normalizeLineupEntry(e, captainByRef)),
          substitutes: (homeSide.bench   ?? []).map(e => normalizeLineupEntry(e, captainByRef)),
        } : null,
        away: awaySide ? {
          teamRef:     awaySide.teamRef,
          teamName:    awaySide.teamName ?? '',
          formation:   awaySide.formation ?? '',
          startingXI:  (awaySide.startXI ?? []).map(e => normalizeLineupEntry(e, captainByRef)),
          substitutes: (awaySide.bench   ?? []).map(e => normalizeLineupEntry(e, captainByRef)),
        } : null,
      }
    : null

  // stats — 홈·원정 둘 다 있어야 그린다. 하나만 있으면 축이 안 맞아 null
  const homeStatsRow = teamStats.find(r => r?.teamRef === homeRef) ?? null
  const awayStatsRow = teamStats.find(r => r?.teamRef === awayRef) ?? null
  const stats = (homeStatsRow && awayStatsRow)
    ? { home: normalizeTeamStatsRow(homeStatsRow), away: normalizeTeamStatsRow(awayStatsRow) }
    : null

  // topRated — rating 있는 선수 상위 3명. rating desc
  const topRated = playerStats
    .filter(p => typeof p?.rating === 'number' && Number.isFinite(p.rating))
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3)
    .map(p => ({
      playerRef: p.playerRef ?? null,
      name:      p.playerName ?? '',
      position:  p.position ?? null,
      statistics: {
        games: {
          number:  p.jerseyNumber ?? null,
          minutes: p.minutes ?? null,
          rating:  p.rating,
        },
        shots: {
          total: p.shotsTotal ?? null,
          on:    p.shotsOn ?? null,
        },
        passes: {
          total: p.passesTotal ?? null,
        },
      },
    }))

  // events — team 판정을 여기서 결정. playerRef 는 원본 그대로
  const normalizedEvents = events.map(e => ({
    minute:          e?.minute ?? null,
    minuteExtra:     e?.minuteExtra ?? null,
    type:            e?.type ?? null,
    team:            e?.teamRef === homeRef ? 'home' : e?.teamRef === awayRef ? 'away' : null,
    playerName:      e?.playerName ?? null,
    playerRef:       e?.playerRef ?? null,
    assistName:      e?.assistPlayerName ?? null,
    assistPlayerRef: e?.assistPlayerRef ?? null,
    seq:             e?.seq ?? null,
  }))

  return {
    lineup,
    stats,
    topRated,
    events: normalizedEvents,
    playerStats,
    availability: dto?.availability ?? {
      lineups: 'not_collected',
      events: 'not_collected',
      teamStats: 'not_collected',
      playerStats: 'not_collected',
    },
    asOf: dto?.asOf ?? null,
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
  const groupCount = groupCountOf(table.rows)
  return {
    competitionId: competitionIds(table.competition).competitionId,
    seasonId:  table.season?.label ?? null,
    stage:     deriveStage(matches, now()),
    updatedAt: table.asOf ?? null,
    entries:   unavailableReason ? [] : (table.rows ?? []).map(row => normalizeStanding(row, { format, groupCount })),
    unavailableReason,
  }
}
