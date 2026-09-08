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
