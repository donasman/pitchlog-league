/**
 * URL `?round=` 파라미터 처리 — 훅에서 소비하는 얇은 계층 (`feat/round-navigation` A 판).
 *
 * URL 규칙: `roundOrdinal` 우선 (`String(N)`) · 없으면 컵 `round` 이름 폴백.
 * 판정 순서:
 *   1) urlKey 가 유효 (matches 안에 그 key 를 가진 경기가 있음) → 그대로 사용
 *   2) urlKey 무효 or 빈 문자열 → `pickDefaultRound` 로 기본값 결정
 *   3) matches 가 빈 배열이면 { roundKey: '', shouldSync: false }
 *
 * `shouldSync` 는 이 판에서 항상 false (URL 자동 수정 안 함 — 상위 페이지가 명시적 setRoundKey 로 제어).
 * 미래 시나리오(예: 시즌 변경 시 강제 초기화) 확장 자리로 필드만 확보.
 */

import { pickDefaultRound } from './schedule'

/**
 * @param {string} urlKey       현재 URL `?round=` 값 (없으면 빈 문자열)
 * @param {Array}  matches      normalized 경기 목록
 * @param {Date}   nowDate      현재 시각 (테스트 재현성)
 * @returns {{ roundKey: string, shouldSync: boolean }}
 */
export function roundParamAction(urlKey, matches, nowDate) {
  const list = Array.isArray(matches) ? matches : []
  if (list.length === 0) return { roundKey: '', shouldSync: false }

  // urlKey 유효성 — 그 key 를 가진 경기가 목록에 있는가. URL 은 1 기반.
  const key = String(urlKey ?? '')
  if (key) {
    const hit = list.some(m => {
      if (m?.roundOrdinal != null) return String(m.roundOrdinal + 1) === key  // URL 1 기반
      return m?.round === key
    })
    if (hit) return { roundKey: key, shouldSync: false }
  }

  // 무효 or 빈 값 → pickDefaultRound
  const { roundKey } = pickDefaultRound(list, nowDate)
  return { roundKey, shouldSync: false }
}
