/**
 * 어시스턴트 도구 응답 → 재사용 카드 payload 정규화 (순수 함수)
 *
 * 이 파일은 순수 계산만 한다:
 *   - React·DOM 을 안 쓴다 (테스트가 jsdom 없이 node 환경에서 돈다).
 *   - 백엔드 응답의 도구별 shape 을 화면 컴포넌트가 그리는 shape 으로 옮긴다.
 *   - `services/normalize.js` 의 정규화 함수를 그대로 재사용 —
 *     여기서 손으로 파생 필드를 만들지 않는다.
 *
 * 왜 필요한가:
 *   백엔드 `POST /api/assistant` 응답은 `{answer, evidence[], data[]}` 이고
 *   `evidence[i]` · `data[i]` 는 인덱스 매칭이다. `evidence[i].tool` 이 그 데이터의 도구 이름이다.
 *   컨텍스트가 두 배열을 짝지어 `{tool, data, asOf}` wrapper 를 만들면
 *   여기서 그 wrapper 를 kind 별로 renderable payload 로 옮긴다.
 *
 * 도구별 `wrapper.data` 안쪽 shape (backend DTO 그대로):
 *   get_standings      → StandingsListDto  = { items: [StandingsTableDto] } — items[0] 이 표 한 장
 *   list_matches       → MatchListDto      = { items: [MatchDto] }
 *   get_match          → MatchDto          (단일)
 *   get_top_scorers    → RankingListDto    = { competition, season, items: [RankRowDto] }
 *   get_top_assisters  → 같은 shape
 *   그 외              → JSON 그대로 (DataTable 이 raw 로 그린다)
 */

import {
  normalizeMatch,
  normalizeStandings,
  normalizeStatsRow,
  slugFromRef,
  apiIdFromAlias,
} from '@/services/normalize'

/**
 * 도구 이름 → 카드 종류
 * 알 수 없는 도구는 'json' — 화면은 DataTable 이 원본을 접힘으로 그린다.
 * @param {string} tool
 * @returns {'standings'|'matches'|'match'|'stats'|'json'}
 */
export function cardKindForTool(tool) {
  switch (tool) {
    case 'get_standings':      return 'standings'
    case 'list_matches':       return 'matches'
    case 'get_match':          return 'match'
    case 'get_top_scorers':
    case 'get_top_assisters':  return 'stats'
    default:                   return 'json'
  }
}

/**
 * wrapper.data (도구 원 데이터) → 카드가 소비하는 payload
 *   - standings: normalizeStandings 결과 (entries·stage·updatedAt 등)
 *   - matches:   normalizeMatch 결과 배열
 *   - match:     normalizeMatch 결과 (단일)
 *   - stats:     normalizeStatsRow 결과 배열
 *   - json:      원본 그대로
 *
 * 어시스턴트는 stage 계산용 경기 목록을 따로 안 받으므로 normalizeStandings 에는
 * matches = [] 를 넘긴다 — stage 는 null 로 뜬다 (그 표에 stage 는 렌더하지 않으므로 무해).
 * @param {'standings'|'matches'|'match'|'stats'|'json'} kind
 * @param {unknown} wrapperData
 * @returns {unknown}
 */
export function normalizeCardPayload(kind, wrapperData) {
  if (wrapperData == null) return kind === 'matches' || kind === 'stats' ? [] : null
  switch (kind) {
    case 'standings': {
      const table = wrapperData.items?.[0]
      return table ? normalizeStandings(table, []) : { entries: [], unavailableReason: 'EMPTY' }
    }
    case 'matches': {
      return (wrapperData.items ?? []).map(normalizeMatch)
    }
    case 'match': {
      return normalizeMatch(wrapperData)
    }
    case 'stats': {
      return (wrapperData.items ?? []).map(normalizeStatsRow)
    }
    default:
      return wrapperData
  }
}

/**
 * evidence 배열의 asOf 최소값 (사전순 = 시간순 · ISO 8601).
 * 빈 배열이면 null. 다중 도구 호출 답변에서 "가장 오래된 근거 시각" 을 뽑아
 * 화면 상단에 "이 답변 기준" 으로 노출한다 — 여러 시각을 섞어 보여주면 무엇을 믿을지 갈린다.
 * @param {Array<{asOf?: string|null}>} evidence
 * @returns {string|null}
 */
export function pickAsOf(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) return null
  let min = null
  for (const e of evidence) {
    const v = e?.asOf
    if (!v) continue
    if (min === null || String(v) < min) min = String(v)
  }
  return min
}

/**
 * wrapper 안 대회 참조 → 화면 slug (`premier-league` 등). 알 수 없는 대회면 null.
 * kind 마다 competition 이 실려 있는 위치가 다르다 — 여기서 한 번에 흡수한다:
 *   standings: wrapper.data.items[0].competition
 *   matches:   wrapper.data.items[0].competition   (경기 하나라도 있으면 그 대회)
 *   match:     wrapper.data.competition
 *   stats:     wrapper.data.competition            (모드 B 면 null)
 *   그 외:     null
 *
 * apiId → COMPETITION_ALIAS(normalize.js) 를 거쳐 화면 slug 로 바꾼다. 화면에 없는 대회면
 * ref 뒤쪽 slug 를 폴백 (예: `1-world-cup` → `world-cup`) — 그래도 라우팅은 화면에 없어 링크는 안 그린다.
 * @param {{tool?: string, data?: unknown}} wrapper
 * @returns {string|null}
 */
export function competitionSlugFromWrapper(wrapper) {
  const kind = cardKindForTool(wrapper?.tool)
  const data = wrapper?.data
  if (data == null) return null
  let compRef = null
  if (kind === 'standings') compRef = data.items?.[0]?.competition
  else if (kind === 'matches') compRef = data.items?.[0]?.competition
  else if (kind === 'match')   compRef = data.competition
  else if (kind === 'stats')   compRef = data.competition
  if (!compRef) return null

  // apiId 로 화면 대회면 alias 의 slug 를 쓴다. 아니면 ref 뒤 slug 폴백.
  // apiIdFromAlias 는 화면 대회 id → apiId 매핑이라 방향이 반대다.
  // 여기서는 apiId 로 slug 를 직접 찾도록 slugFromRef(compRef.ref) 를 우선 쓰되,
  // ref 가 없고 apiId 만 있는 경로도 대비해 두 값을 다 본다.
  const ref = compRef.ref
  if (ref) {
    const slug = slugFromRef(ref)
    return slug || null
  }
  const apiId = compRef.apiId
  if (typeof apiId === 'number') {
    // apiIdFromAlias 의 역은 없지만, 알려진 화면 대회면 apiId 로 slug 를 알 수 있다 —
    // normalize.js 의 COMPETITION_ALIAS 는 export 되지 않아 apiIdFromAlias 를 역참조로 대신 쓴다.
    // 간단히 6대회 apiId 만 확인 — 그 외면 null.
    const knownIds = ['epl', 'laliga', 'bundesliga', 'seriea', 'ligue1', 'ucl']
    for (const id of knownIds) {
      if (apiIdFromAlias(id) === apiId) {
        // id → slug 는 화면이 안다. 여기서는 apiId 로 ref 를 만들 수 없어 null 로 폴백
        // (실제 shape 에는 ref 가 늘 실려 온다 — CompetitionRefDto).
        return null
      }
    }
  }
  return null
}
