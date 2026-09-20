/**
 * URL `?season=` 값을 표준 형태(연도 문자열, 현재 시즌은 아예 뺌)로 유지하며
 * 페이지에 `seasonYear`(백엔드 콜에 그대로 넘길 수 있는 숫자) 를 넘긴다.
 *
 * 왜 훅으로 뺐나:
 *   CompetitionPage · StandingsPage 가 같은 정규화 로직을 각자 인라인으로 갖고 있었다.
 *   백엔드 `?season=` 은 연도(int) 만 받는데, 예전 헤더가 라벨(`2025-26`)을 남길 수 있고,
 *   현재 시즌이면 URL 을 비워 두고 싶다. 이 판단은 `utils/seasons.js` 의 순수 함수로 뽑아
 *   시나리오를 vitest 로 잠근 뒤(seasons.test.js), 훅은 그 결과를 URL 로 반영만 한다.
 *
 * vitest 는 `environment: 'node'` 라 훅 자체는 테스트하지 않는다 — 훅이 하는 일이 곧
 * `nextSeasonParamAction` 이 시키는 것 그대로다.
 *
 * @param {Array} seasons  `selectableSeasons` 결과 (COMPLETE 만, 최신순). 참조가 안정적이도록
 *                         호출자는 `useMemo` 로 감싸 넘긴다.
 */

import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isPastSeason, nextSeasonParamAction } from '@/utils/seasons'

export function useSeasonParam(seasons) {
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonParam  = searchParams.get('season')
  // 백엔드 `?season=` 은 연도(int) 만 받는다. 라벨이 남은 첫 렌더에는 undefined 로 넘겨
  // 백엔드가 현재 시즌으로 폴백하게 두고, 그 사이 아래 useEffect 가 URL 을 연도로 정규화한다.
  const seasonYear   = /^\d{4}$/.test(seasonParam ?? '') ? Number(seasonParam) : undefined
  const isCurrentYear = seasonYear === undefined
    ? true
    : !isPastSeason(seasonYear, seasons ?? [])

  useEffect(() => {
    const action = nextSeasonParamAction(seasonParam, seasons ?? [])
    if (action === null) return
    const next = new URLSearchParams(searchParams)
    if (action.action === 'delete') next.delete('season')
    else                            next.set('season', action.value)
    setSearchParams(next, { replace: true })
    // seasons 는 useMemo 로 참조 고정된 것이 넘어온다 — 매 렌더 새 배열이 오는 걸 막는 건
    // 호출자 책임. searchParams / setSearchParams 는 react-router 가 안정 참조로 준다.
  }, [seasonParam, seasons, searchParams, setSearchParams])

  const setSeasonYear = (year) => {
    const next = new URLSearchParams(searchParams)
    if (year === null || year === undefined) next.delete('season')
    else                                     next.set('season', String(year))
    setSearchParams(next, { replace: true })
  }

  return { seasonParam, seasonYear, isCurrentYear, setSeasonYear }
}
