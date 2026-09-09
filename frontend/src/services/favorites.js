/**
 * 팀 즐겨찾기 저장 계층 — localStorage 만 접근한다.
 *
 * 이 파일이 팀 즐겨찾기 저장의 **유일한 접근점**이다.
 * 다른 파일은 `localStorage.getItem('pitchlog-favorites')` 를 직접 부르지 않는다 —
 * 파손된 JSON·배열이 아닌 값·문자열이 아닌 원소를 이 한 곳에서 흡수한다.
 *
 * 손실 규약:
 *   저장값이 없거나 파싱에 실패하거나 형태가 어긋나면 `[]` 를 돌려주고,
 *   파손된 JSON 은 키를 지운다(다음 판에 같은 예외가 반복되지 않게).
 *   무음 catch 는 이 규약에 한정된다 — "무언가 잘못됐다" 를 "빈 배열" 로 감추는 게 아니라
 *   저장이 정말 살아 있는 값이 없다는 뜻이다.
 *
 * 순서:
 *   `add` 는 배열의 뒤로 붙인다(추가 순 유지). 나중 UI 가 최신순으로 뒤집을 수 있게 데이터는
 *   시간순을 그대로 둔다. 중복 add 는 no-op 성공 — 별을 두 번 눌러도 순서가 재정렬되지 않는다.
 */

export const FAVORITE_TEAMS_KEY = 'pitchlog-favorites'
export const FAVORITE_TEAMS_LIMIT = 5

/** localStorage 접근 안전 가드 — SSR·비지원 환경 방어 */
function safeStorage() {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    // 접근 자체가 예외를 던지는 브라우저(private 모드 일부)에 대비 — 저장 불가로 취급한다
    return null
  }
}

/** @returns {string[]} 파손·부재·형태 어긋남 모두 `[]` */
export function getFavoriteTeams() {
  const storage = safeStorage()
  if (!storage) return []
  let raw
  try {
    raw = storage.getItem(FAVORITE_TEAMS_KEY)
  } catch {
    return []
  }
  if (raw === null || raw === undefined) return []
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // 파손 — 다음 판에 같은 예외를 던지지 않게 키를 지운다
    try { storage.removeItem(FAVORITE_TEAMS_KEY) } catch { /* 저장이 아예 죽었으면 어쩔 수 없다 */ }
    return []
  }
  if (!Array.isArray(parsed)) return []
  if (!parsed.every(item => typeof item === 'string')) return []
  return parsed
}

/** 저장 실패는 삼킨다 — 화면이 상태를 이미 갱신한 뒤라 강제로 롤백하지 않는다 */
function writeFavoriteTeams(list) {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(list))
  } catch { /* 쿼터 초과 등 — 다음 add 때 다시 시도된다 */ }
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isFavoriteTeam(slug) {
  if (typeof slug !== 'string' || slug.length === 0) return false
  return getFavoriteTeams().includes(slug)
}

/**
 * @param {string} slug
 * @returns {{ ok:true, list:string[] } | { ok:false, reason:'limit_reached'|'invalid_slug', list:string[] }}
 */
export function addFavoriteTeam(slug) {
  if (typeof slug !== 'string' || slug.length === 0) {
    return { ok: false, reason: 'invalid_slug', list: getFavoriteTeams() }
  }
  const current = getFavoriteTeams()
  if (current.includes(slug)) return { ok: true, list: current }
  if (current.length >= FAVORITE_TEAMS_LIMIT) {
    return { ok: false, reason: 'limit_reached', list: current }
  }
  const next = [...current, slug]
  writeFavoriteTeams(next)
  return { ok: true, list: next }
}

/**
 * @param {string} slug
 * @returns {{ ok:true, list:string[] }}
 */
export function removeFavoriteTeam(slug) {
  const current = getFavoriteTeams()
  if (typeof slug !== 'string' || slug.length === 0) return { ok: true, list: current }
  if (!current.includes(slug)) return { ok: true, list: current }
  const next = current.filter(s => s !== slug)
  writeFavoriteTeams(next)
  return { ok: true, list: next }
}

/**
 * 있으면 제거, 없으면 추가.
 * 상한을 넘긴 새 slug 는 `addFavoriteTeam` 의 실패 결과를 그대로 물려받는다.
 * @param {string} slug
 * @returns {{ ok:boolean, reason?:string, list:string[] }}
 */
export function toggleFavoriteTeam(slug) {
  if (isFavoriteTeam(slug)) return removeFavoriteTeam(slug)
  return addFavoriteTeam(slug)
}
