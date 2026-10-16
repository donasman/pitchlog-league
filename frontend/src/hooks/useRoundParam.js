/**
 * URL `?round=` 값을 라운드 키(roundOrdinal 우선 · 컵은 round 이름) 로 유지 · 소비 (`feat/round-navigation` A 판).
 *
 * 왜 훅으로 뺐나:
 *   CompetitionPage 가 라운드 네비게이션(B 판) 을 붙일 때 이 훅을 소비한다. URL 반영은 훅 책임,
 *   기본값 결정은 `roundParamAction` (순수함수) 이 하고, 라운드 상태 계산은 `roundStatus` 가 한다.
 *   훅 자체는 vitest 대상 아님 (`environment: 'node'`) — 하는 일이 `roundParamAction` 이 시키는 것 그대로다.
 *
 * URL 규칙: `roundOrdinal` 있으면 `String(N)`, 컵은 `round` 이름 그대로. 빈 값이면 `?round=` 삭제.
 * URL 자동 동기화 없음 — 상위 CompetitionPage 가 RoundNavigator onChange 의 `setRoundKey` 로만 URL 을 바꾼다.
 *
 * react-router 6 setSearchParams(fn) 은 최신 URL 이 아닌 렌더 스냅샷을 넘긴다(#9304) — 한 이벤트에서 setter 를 두 번 부르지 말 것.
 *   시즌 변경 시 `?round=` 삭제는 이 훅이 아니라 `useSeasonParam.setSeasonYear(year, { dropKeys: ['round'] })` 가 같은 쓰기에서 한다.
 *
 * @param {Array} matches  normalized 경기 목록 (`normalizeMatch` 결과)
 * @returns {{ roundKey: string, setRoundKey: (next: string|number|null) => void }}
 */

import { useSearchParams } from 'react-router-dom'
import { roundParamAction } from '@/utils/roundParam'

export function useRoundParam(matches) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlKey = searchParams.get('round') ?? ''
  const { roundKey } = roundParamAction(urlKey, matches, new Date())

  const setRoundKey = (next) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === null || next === undefined || next === '') params.delete('round')
      else                                                    params.set('round', String(next))
      return params
    }, { replace: true })
  }

  return { roundKey, setRoundKey }
}
