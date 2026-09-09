/**
 * 홈 "내 팀" 카드 데이터 로더.
 *
 * useFavorites 로 slug 목록을 받아 각 팀별로 `fetchTeamFixtures` + (리그 대회면) `fetchStandings`
 * 를 병렬 호출한 뒤 `normalize.myTeamCard` 로 카드 조각을 만든다. 실패한 팀은 카드 목록에서
 * 조용히 빠지고 `console.warn` 만 남긴다 — 별 하나가 죽어서 홈이 전부 회색이 되면 안 된다.
 *
 * 즐겨찾기 목록이 바뀔 때마다 다시 부른다 — Provider 는 매번 새 배열 참조를 주므로
 * 배열 참조를 그대로 deps 에 넣으면 매 렌더마다 재조회다. JSON.stringify 를 키로 쓰면
 * "실제 값이 바뀔 때만 재조회" 가 된다 (배열 짧고 원소가 문자열이라 비용이 미미하다).
 */

import { useEffect, useMemo, useState } from 'react'
import { useFavorites } from '@/contexts/FavoritesContext'
import { fetchStandings, fetchTeamFixtures } from '@/services/api'
import { myTeamCard } from '@/services/normalize'

export function useMyTeams() {
  const { favoriteTeams } = useFavorites()
  const favoritesKey = useMemo(() => JSON.stringify(favoriteTeams), [favoriteTeams])

  const [state, setState] = useState({ loading: true, error: null, cards: [] })

  useEffect(() => {
    let mounted = true

    if (favoriteTeams.length === 0) {
      setState({ loading: false, error: null, cards: [] })
      return () => { mounted = false }
    }

    setState({ loading: true, error: null, cards: [] })

    ;(async () => {
      try {
        // 팀별 일정 조회 — 실패한 팀은 카드에서 뺀다
        const fixtureResults = await Promise.allSettled(
          favoriteTeams.map(slug => fetchTeamFixtures(slug)),
        )

        // 각 팀의 리그 대회 하나를 골라 순위표를 병렬로 조회.
        // 리그가 아니거나(컵·조별) 팀이 리그에 참가하지 않으면 순위 조회를 건너뛴다 — null 을 넘긴다
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
            console.warn(`[useMyTeams] fixtures fetch failed for ${favoriteTeams[i]}:`, r.reason)
            return
          }
          const payload = r.value
          cards.push(myTeamCard(payload.team, payload, standingsResults[i]))
        })

        if (mounted) setState({ loading: false, error: null, cards })
      } catch (err) {
        // Promise.allSettled 이후이므로 여기 오는 예외는 사실상 프로그램 오류다.
        // 카드는 비우고 오류를 그대로 노출한다.
        if (mounted) setState({ loading: false, error: err?.message ?? String(err), cards: [] })
      }
    })()

    return () => { mounted = false }
    // favoritesKey 로 값 비교 — 배열 참조 변경만으로는 재조회하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritesKey])

  return state
}
