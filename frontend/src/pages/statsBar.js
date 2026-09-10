/**
 * StatsPanel 막대(bar) 폭 계산 — MatchPage StatRow 가 소비.
 *
 * DATA_RULES 3장 규약: 값이 없는 자리를 "완벽한 동점(50:50)" 으로 위장하지 않는다.
 * 예전 코드가 `let pct = 50` 을 기본값으로 두어 hv·av 가 둘 다 null 인 xG · 선방 기여도
 * 행에서도 트랙이 반반 채워져 "동점" 처럼 보였다 (2026-09-10 실측: 채움 폭 362/362).
 *
 * 반환 규약:
 *   - number (0~100) → 그 폭으로 홈 쪽 채움. clamp(5, 95) 는 시각적 최소·최대 (0/100 도 트랙에서 보이도록)
 *   - null           → 막대 트랙 자체를 그리지 않는다 (값 자리는 그대로 "—" 만 표시)
 *
 * null 케이스:
 *   - barHome 없음 + hv·av 중 하나라도 null           → null (기준값 없음)
 *   - barHome 없음 + hv·av 모두 값 · 합계 0          → null (0:0 은 대칭이 없음)
 *   - barHome 이 NaN · Infinity · number 아님         → null
 *
 * 왜 "한쪽만 null 이면 있는 쪽 100%" 로 안 하나:
 *   비교의 기준이 사라진다. "있는 쪽이 크다" 는 크기 오해를 주지만 실제로는 상대값이 없다.
 *   같은 이유로 합계 0(예: 코너킥 0:0) 도 어느 쪽이 더 큰지 정보가 없다.
 *
 * @param {{ barHome?: number|null, homeVal?: number|null, awayVal?: number|null }} args
 * @returns {number|null}
 */
export function computeBarPct({ barHome, homeVal, awayVal }) {
  if (barHome != null) {
    if (typeof barHome !== 'number' || !Number.isFinite(barHome)) return null
    return Math.max(5, Math.min(95, barHome))
  }
  if (homeVal == null || awayVal == null) return null
  if (typeof homeVal !== 'number' || typeof awayVal !== 'number') return null
  if (!Number.isFinite(homeVal) || !Number.isFinite(awayVal)) return null
  const sum = homeVal + awayVal
  if (sum <= 0) return null
  return Math.round((homeVal / sum) * 100)
}
