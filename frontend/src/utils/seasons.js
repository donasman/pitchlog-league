/**
 * 시즌 선택기 판단 로직
 *
 * vitest 는 `environment: 'node'` 라 컴포넌트를 띄울 수 없다(vitest.config.js).
 * 그래서 헤더·페이지가 쓰는 "어느 시즌을 보여줄까 / URL 값이 어느 연도냐" 판단만
 * 순수 함수로 빼서 테스트로 고정한다. DOM 이 필요한 부분은 AppHeader 에 남는다.
 *
 * @typedef {{ id?: string, label?: string, year?: number, current?: boolean, dataState?: string }} Season
 *   `normalizeSeason`(services/normalize.js) 이 만드는 모양.
 */

/**
 * 선택기에 노출할 시즌 — 적재가 끝난 것만, 최신 연도부터.
 *
 * INGESTION_STRATEGY 5-4 가 `COMPLETE` 만 노출하라고 한다. PARTIAL·NONE 을 고를 수 있게 두면
 * 순위표·일정이 반쪽인 채로 그려져서 "데이터가 없는 것"과 "아직 안 받은 것"이 화면에서 같아진다.
 *
 * @param {Season[]} seasons
 * @returns {Season[]}
 */
export function selectableSeasons(seasons) {
  if (!Array.isArray(seasons)) return []
  return seasons
    .filter(s => s?.dataState === 'COMPLETE')
    .slice()
    .sort((a, b) => (Number(b?.year) || 0) - (Number(a?.year) || 0))
}

/** 시즌 하나가 주어진 URL 값과 같은 시즌인가 — 연도·라벨·id 어느 표기든 받는다 */
function matchesParam(season, key) {
  if (!season) return false
  if (season.year !== undefined && season.year !== null && String(season.year) === key) return true
  if (typeof season.label === 'string' && season.label === key) return true
  if (typeof season.id === 'string' && season.id === key) return true
  return false
}

/**
 * URL `?season=` 값 → 백엔드가 받는 연도 숫자.
 *
 * 백엔드는 `?season=2024`(int) 만 받는데, 예전 헤더가 라벨(`2025-26`)을 URL 에 썼다.
 * 이미 공유된 링크가 400 을 맞지 않도록 라벨도 연도로 푼다.
 * 목록에 없는 값이면 null 이라 — 대회를 바꿔 그 시즌이 사라진 경우 — 호출자가 파라미터를 떨어뜨릴 수 있다.
 *
 * @param {string|null|undefined} param
 * @param {Season[]} seasons
 * @returns {number|null}
 */
export function seasonYearFromParam(param, seasons) {
  if (param === null || param === undefined || param === '') return null
  if (!Array.isArray(seasons)) return null
  const key = String(param)
  const hit = seasons.find(s => matchesParam(s, key))
  const year = Number(hit?.year)
  return Number.isFinite(year) ? year : null
}

/**
 * 그 시즌이 현재 시즌이 아닌가.
 *
 * 목록에 없으면 판단 근거가 없으므로 false 다 — 모르는 값을 "과거" 로 단정하면
 * 호출자가 경기 조회 창을 잘못 걷어낸다(live.js `fetchCompetitionHub`).
 *
 * @param {number|string|null|undefined} year
 * @param {Season[]} seasons
 * @returns {boolean}
 */
export function isPastSeason(year, seasons) {
  if (!Array.isArray(seasons)) return false
  const n = Number(year)
  if (!Number.isFinite(n)) return false
  const hit = seasons.find(s => Number(s?.year) === n)
  return hit ? hit.current !== true : false
}

/**
 * URL `?season=` 값을 이번 렌더에서 어떻게 만질 것인가.
 *
 * `useSeasonParam` 훅이 매 렌더에서 이걸 물어 URL 을 정규화한다:
 *   - 라벨(`2025-26`) 이 남아 있으면 연도로 바꾼다 (`{ action: 'set', value: '2025' }`)
 *   - 현재 시즌이면 파라미터 자체를 뺀다 (`{ action: 'delete' }`) — 기본 뷰는 URL 이 비어 있는 상태
 *   - 이미 정규화된 상태거나, 시즌 목록이 아직 없어 판단 불가면 아무 것도 안 한다 (`null`)
 *
 * `useEffect` 안에서 setSearchParams 를 무조건 부르면 검색 파라미터의 참조가 매 렌더 바뀌어
 * 훅이 다시 실행되고 URL 이 계속 다시 쓰인다. 훅은 반환값이 null 일 때 setSearchParams 를
 * 건너뛰어 이 루프를 끊는다.
 *
 * @param {string|null} currentParam  URL 의 `?season=` 원본 값 (없으면 null)
 * @param {Season[]}    seasons       `selectableSeasons` 결과 (COMPLETE 만, 최신순)
 * @returns {null | { action: 'delete' } | { action: 'set', value: string }}
 */
export function nextSeasonParamAction(currentParam, seasons) {
  if (currentParam === null) return null
  if (!Array.isArray(seasons) || seasons.length === 0) return null
  const resolved = seasonYearFromParam(currentParam, seasons)
  if (resolved === null) return { action: 'delete' }
  if (!isPastSeason(resolved, seasons)) return { action: 'delete' }
  if (String(resolved) === currentParam) return null
  return { action: 'set', value: String(resolved) }
}

/**
 * 시즌 select 한 번의 선택을 URL 검색 파라미터 1회 쓰기로 계산한다 (순수 함수).
 *
 * 왜 한 번에 계산하나:
 *   react-router-dom 6.30 `useSearchParams` 의 setter 는 함수형 인자에도 최신 URL 이 아니라
 *   그 훅 인스턴스의 렌더 스냅샷 `searchParams` 를 넘긴다
 *   (node_modules/react-router-dom/dist/index.js:1024-1031 · remix-run/react-router#9304).
 *   그래서 한 이벤트에서 setter 를 두 번 부르면 두 번째 쓰기가 첫 번째를 덮는다.
 *   시즌을 바꾸며 함께 지울 키(`round` 등) 는 `dropKeys` 로 받아 같은 쓰기에서 지운다.
 *
 * @param {URLSearchParams|string} prev   현재 검색 파라미터
 * @param {number|null|undefined}  year   고른 시즌 연도. null/undefined 면 현재 시즌 → `season` 삭제
 * @param {{ dropKeys?: string[] }} [opts] 같은 쓰기에서 함께 지울 키
 * @returns {URLSearchParams} 새 인스턴스 (prev 는 건드리지 않는다)
 */
export function applySeasonParam(prev, year, { dropKeys = [] } = {}) {
  const next = new URLSearchParams(prev)
  if (year === null || year === undefined) next.delete('season')
  else                                     next.set('season', String(year))
  for (const key of dropKeys) next.delete(key)
  return next
}
