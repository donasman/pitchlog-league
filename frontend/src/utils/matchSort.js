/**
 * 경기 정렬·병합 유틸리티
 * 컴포넌트 안에서 정렬 로직을 섞지 않고 이 파일에 집중.
 * 단위 테스트 대상: 시각 오름차순, LIVE 우선 정렬.
 */

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
 * 오늘의 경기만 필터 (고정 기준일 기준 — 발표 데이터가 날짜에 따라 달라지지 않도록 고정)
 * 실제 서비스에서는 기준일을 제거하고 new Date()를 사용
 * @param {Array<Object>} matches
 * @param {string} [referenceDate='2026-11-23']  YYYY-MM-DD
 * @returns {Array<Object>}
 */
export function filterTodayMatches(matches, referenceDate = '2026-11-23') {
  return matches.filter(m => m.date?.startsWith(referenceDate))
}
