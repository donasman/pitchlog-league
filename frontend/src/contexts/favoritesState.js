/**
 * favoritesState — FavoritesContext 의 판정 로직을 뺀 순수 모듈 (React import 없음).
 *
 * - CODE_TO_ERROR / toActionErrorCode: 백엔드 400 응답 code → actionError.code
 * - decideToggle: 별 버튼 한 번의 결과 (첫 로드가 끝나기 전에는 상한보다 먼저 not_ready)
 * - isCurrentGeneration: 로그아웃·계정 전환·reload 뒤 낡은 비동기 응답을 버리는 세대 가드
 * - refsOf: 응답 items → ref 배열
 */

/** 백엔드 400 응답의 code → actionError.code 매핑 */
export const CODE_TO_ERROR = Object.freeze({
  favorites_limit_exceeded: 'limit_exceeded',
  favorites_duplicate:      'duplicate',
  favorites_unknown_team:   'unknown_team',
})

/**
 * 오류 객체 → 'limit_exceeded'|'duplicate'|'unknown_team'|'network'.
 * 프로토타입 키('constructor' 등)가 매핑되지 않도록 own property 만 본다.
 */
export function toActionErrorCode(err) {
  const code = err?.code
  if (typeof code === 'string' && Object.prototype.hasOwnProperty.call(CODE_TO_ERROR, code)) {
    return CODE_TO_ERROR[code]
  }
  return 'network'
}

/**
 * 토글 한 번의 판정. 입력 배열은 바꾸지 않는다.
 * @returns {{ok:true, next:string[]} | {ok:false, reason:'not_ready'|'limit_reached'}}
 */
export function decideToggle({ list, ref, limit, loadState }) {
  if (loadState !== 'ready') return { ok: false, reason: 'not_ready' }
  if (list.includes(ref)) return { ok: true, next: list.filter(r => r !== ref) }
  if (list.length >= limit) return { ok: false, reason: 'limit_reached' }
  return { ok: true, next: [...list, ref] }
}

/** 큐에 실릴 때의 세대와 지금 세대가 같은지 */
export function isCurrentGeneration(enqueuedGen, currentGen) {
  return enqueuedGen === currentGen
}

/** 응답 items → ref 배열 (items 가 없으면 빈 배열) */
export function refsOf(items) {
  return (items ?? []).map(it => it.ref)
}
