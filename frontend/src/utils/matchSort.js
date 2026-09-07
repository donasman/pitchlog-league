/**
 * 경기 정렬·병합 유틸리티
 * 컴포넌트 안에서 정렬 로직을 섞지 않고 이 파일에 집중.
 * 단위 테스트 대상: 시각 오름차순, LIVE 우선 정렬.
 */

import { kstDateKey } from './dateFormat.js'
import { todayKstKey } from '../services/clock.js'

/**
 * 경기 목록을 킥오프 시각 오름차순으로 정렬
 * LIVE 경기는 항상 앞으로, 같은 상태끼리는 시각 순.
 *
 * @param {Array<Object>} matches
 * @returns {Array<Object>}
 */
export function sortMatchesByKickoff(matches) {
  const stateOrder = { live:0, halftime:0, scheduled:1, final:2, recheck:2, confirmed:2, postponed:3, cancelled:4 }
  return [...matches].sort((a, b) => {
    const ao = stateOrder[a.displayState] ?? 5
    const bo = stateOrder[b.displayState] ?? 5
    if (ao !== bo) return ao - bo
    return new Date(a.date) - new Date(b.date)
  })
}

/**
 * 여러 대회 경기 배열을 병합하여 오름차순 정렬
 * @param {Array<Array<Object>>} matchArrays
 * @returns {Array<Object>}
 */
export function mergeAndSort(matchArrays) {
  return sortMatchesByKickoff(matchArrays.flat())
}

/**
 * 오늘의 경기만 필터 — KST 날짜 키로 비교한다 (UTC 접두 비교는 KST 자정 전후 경기를 놓친다)
 * 기준일은 `services/clock.js` 가 정한다: Mock 은 고정 기준일, 실 API 는 실제 오늘
 * @param {Array<Object>} matches
 * @param {string} [todayKey=todayKstKey()]  YYYY-MM-DD (KST)
 * @returns {Array<Object>}
 */
export function filterTodayMatches(matches, todayKey = todayKstKey()) {
  return matches.filter(m => m.date != null && kstDateKey(m.date) === todayKey)
}
