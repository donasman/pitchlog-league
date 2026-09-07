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
const LOGO_BASE = (import.meta.env.VITE_LOGO_BASE_URL ?? '/logos').replace(/\/+$/, '')

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
    slug: slugFromRef(dto.ref),
    ref:  dto.ref,
    apiId: dto.apiId,

    name:      dto.displayName,
    shortName: dto.shortDisplayName,
    /** 로고가 못 뜰 때만 쓰인다 — code(MUN) 가 없으면 이름에서 만든다 */
    initials:  dto.code ?? deriveInitials(dto.shortDisplayName),
    logoUrl:   localLogo('teams', dto.apiId, dto.logoUrl),

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
