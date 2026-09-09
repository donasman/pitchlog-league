/**
 * 팀 즐겨찾기 전역 상태.
 *
 * 저장은 `services/favorites.js` 가 유일한 접근점이다. 이 컨텍스트는 그 위에
 * "구독 가능한 state" 만 얹는다 — 컴포넌트가 별을 눌렀을 때 홈의 "내 팀" 카드가
 * 즉시 다시 그려지도록.
 *
 * storage 이벤트 리스너는 안 넣는다 — 탭 간 동기화는 이번 판 밖이다.
 * (다른 탭에서 같은 브라우저의 별을 눌러도 이 탭은 자동으로 새로고침하지 않는다.)
 */

import { createContext, useCallback, useContext, useState } from 'react'
import {
  FAVORITE_TEAMS_LIMIT,
  addFavoriteTeam,
  getFavoriteTeams,
  isFavoriteTeam,
  removeFavoriteTeam,
  toggleFavoriteTeam,
} from '@/services/favorites'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const [favoriteTeams, setFavoriteTeams] = useState(() => getFavoriteTeams())

  const add = useCallback(slug => {
    const result = addFavoriteTeam(slug)
    if (result.ok) setFavoriteTeams(result.list)
    return result
  }, [])

  const remove = useCallback(slug => {
    const result = removeFavoriteTeam(slug)
    if (result.ok) setFavoriteTeams(result.list)
    return result
  }, [])

  const toggle = useCallback(slug => {
    const result = toggleFavoriteTeam(slug)
    if (result.ok) setFavoriteTeams(result.list)
    return result
  }, [])

  const isFavorite = useCallback(slug => favoriteTeams.includes(slug), [favoriteTeams])

  const value = {
    favoriteTeams,
    isFavorite,
    add,
    remove,
    toggle,
    limit: FAVORITE_TEAMS_LIMIT,
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider')
  return ctx
}

// isFavoriteTeam · addFavoriteTeam 등을 직접 import 하지 않기 위해 우회 경로도 제공한다
// (테스트 · CLI 도구에서 훅 없이 저장만 만지고 싶을 때만 사용)
export { isFavoriteTeam }
