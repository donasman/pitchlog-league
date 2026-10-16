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

/**
 * 팀 상세 "다음 경기" — 킥오프 오름차순(가까운 것부터) 앞에서 n 개.
 *
 * 라운드 번호로 정렬하지 않는다 — 연기 경기가 뒤 라운드에 얹혀 킥오프 순서와 어긋난다
 * (예: 라리가 R1 8/27 이 R2 8/23 보다 뒤). 항상 `m.date` (=백엔드 kickoffAt) 기준.
 * @param {Array<Object>} matches
 * @param {number} n
 */
export function pickUpcoming(matches, n) {
  return (matches ?? [])
    .filter(m => m?.displayState === 'scheduled')
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, n)
}

/**
 * 팀 상세 "최근 결과" — 킥오프 내림차순(최신부터) 앞에서 n 개.
 *
 * 백엔드가 라운드 번호로 준 배열을 그대로 slice(0, n) 하면 오래된 경기부터 나온다
 * (2026-09-10 실측: 바르셀로나 R4 9/6 이 잘려나감). 최신순 정렬 필수.
 * @param {Array<Object>} matches
 * @param {number} n
 */
export function pickRecent(matches, n) {
  return (matches ?? [])
    .filter(m => ['confirmed', 'recheck', 'final'].includes(m?.displayState))
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, n)
}
