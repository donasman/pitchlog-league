/**
 * 홈 "내 팀" 카드 데이터 로더.
 *
 * 서버 저장 이관 이후: FavoritesContext 가 로그인 사용자 목록을 `items` (정규화된 팀 요약 + position) 로 준다.
 * 이 훅은 items 를 받아 각 팀별로 `fetchTeamFixtures(ref)` + (리그면) `fetchStandings` 를 병렬 호출하고
 * `normalize.myTeamCard` 로 카드 조각을 만든다. slug 로 팀 상세를 다시 부르지 않는다 —
 * items 가 이미 팀 요약 shape 을 다 담고 있고, fetchTeamFixtures 가 시즌 경기·참가 대회를 함께 준다.
 *
 * 실패한 팀은 카드 목록에서 조용히 빠지고 `console.warn` 만 남긴다 — 별 하나가 죽어서
 * 홈이 전부 회색이 되면 안 된다.
 *
 * 순서 = position 순 (items 순서를 그대로 유지 · 백엔드 응답이 이미 position asc).
 *
 * @param {Array<{ ref: string, position?: number } & Record<string, unknown>>} [items]
 */

import { useEffect, useMemo, useState } from 'react'
import { fetchStandings, fetchTeamFixtures } from '@/services/api'
import { myTeamCard } from '@/services/normalize'

export function useMyTeams(items = []) {
  const refs = useMemo(() => items.map(it => it.ref), [items])
  const refsKey = useMemo(() => JSON.stringify(refs), [refs])

  const [state, setState] = useState({ loading: items.length > 0, error: null, cards: [] })

  useEffect(() => {
    let mounted = true

    if (refs.length === 0) {
      setState({ loading: false, error: null, cards: [] })
      return () => { mounted = false }
    }

    setState({ loading: true, error: null, cards: [] })

    ;(async () => {
      try {
        // 팀별 일정 조회 — 실패한 팀은 카드에서 뺀다. items 순서 = 결과 순서
        const fixtureResults = await Promise.allSettled(
          refs.map(ref => fetchTeamFixtures(ref)),
        )

        // 각 팀의 리그 대회 하나를 골라 순위표를 병렬 조회 — 리그가 아니면(컵/조별) null
        const standingsResults = await Promise.all(fixtureResults.map(async r => {
          if (r.status !== 'fulfilled') return null
          const leagueComp = (r.value.competitions ?? []).find(c => c.format === 'league')
          if (!leagueComp) return null
          try {
            const table = await fetchStandings(leagueComp.slug)
            if (!table || table.unavailableReason || !Array.isArray(table.entries) || table.entries.length === 0) {
              return null
            }
            return {
              competitionSlug: leagueComp.slug,
              competitionName: leagueComp.name,
              /* en pickLocalized 소비용 원문 · leagueComp 는 normalizeCompetition 통과본 */
              competitionOriginalName: leagueComp.originalName ?? leagueComp.name,
              rows: table.entries,
            }
          } catch (err) {
            // 순위 실패는 카드 자체를 죽이지 않는다 — 순위 자리만 "없음" 으로 그린다
            console.warn(`[useMyTeams] standings fetch failed for ${leagueComp.slug}:`, err)
            return null
          }
        }))

        const cards = []
        fixtureResults.forEach((r, i) => {
          if (r.status !== 'fulfilled') {
            console.warn(`[useMyTeams] fixtures fetch failed for ${refs[i]}:`, r.reason)
            return
          }
          const payload = r.value
          cards.push(myTeamCard(payload.team, payload, standingsResults[i]))
        })

        if (mounted) setState({ loading: false, error: null, cards })
      } catch (err) {
        // Promise.allSettled 이후이므로 여기 오는 예외는 사실상 프로그램 오류.
        if (mounted) setState({ loading: false, error: err?.message ?? String(err), cards: [] })
      }
    })()

    return () => { mounted = false }
    // refsKey 로 값 비교 — 배열 참조 변경만으로는 재조회하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsKey])

  return state
}
