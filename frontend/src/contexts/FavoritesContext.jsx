/**
 * 팀 즐겨찾기 전역 상태 — 서버 저장 (Supabase Auth + backend `/api/me/favorites`).
 *
 * 활성 조건: `isFavoritesEnabled = isAuthEnabled && VITE_USE_MOCK !== 'true'`.
 * 하나라도 꺼져 있으면 컨텍스트는 no-op — 별 버튼과 홈 섹션이 조용히 사라진다.
 *
 * 상태 규약:
 *   - favoriteTeams: string[]  (ref, 순서 = position 0..N-1)
 *   - items: NormalizedTeam[]   (팀 요약 정규화 결과 + position — MyTeamsSection 이 소비)
 *   - isSyncing: boolean        (PUT 진행 중 · 별 버튼이 회색 처리)
 *   - serverError: 'limit_exceeded'|'duplicate'|'unknown_team'|'network'|'not_authenticated'|null
 *
 * 낙관적 갱신:
 *   add/remove/toggle 은 즉시 favoriteTeams 를 갱신하고 PUT 을 큐에 실어 보낸다. 큐가 있는 이유:
 *   연타(add A → remove A → add A) 시 백엔드에 3번 왕복하지 않도록 이전 PUT 이 끝난 뒤 최신 상태 하나로만 보낸다.
 *   실패하면 이전 배열로 원복하고 items 를 다시 받아 정합을 회복한다.
 *
 * 토큰:
 *   매 PUT/GET 마다 `supabase.auth.getSession()` 을 다시 부른다. 상태에 캐시하지 않는 이유는
 *   Supabase 가 자동 갱신 시 새 액세스 토큰을 발급하기 때문 — 캐시하면 만료된 것을 계속 쓴다.
 *
 * 로그아웃/env off:
 *   상태를 즉시 비운다. localStorage 저장은 남기지 않는다 — 다른 계정이 이 브라우저에 로그인했을 때
 *   목록이 새는 것을 막기 위해서.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isAuthEnabled } from '@/lib/supabaseClient'
import { FAVORITE_TEAMS_LIMIT } from '@/services/favorites'
import { favorites as favoritesApi } from '@/services/api'
import { USE_MOCK } from '@/services/env'

const FavoritesContext = createContext(null)

/**
 * true 면 서버 저장·별 버튼 활성. false 면 컨텍스트가 no-op.
 * Mock 모드에서는 백엔드 인증이 없어 서버 저장을 시도할 수 없다.
 */
export const isFavoritesEnabled = isAuthEnabled && !USE_MOCK

/** 백엔드 400 응답의 code → serverError 매핑 */
const CODE_TO_ERROR = {
  favorites_limit_exceeded: 'limit_exceeded',
  favorites_duplicate:      'duplicate',
  favorites_unknown_team:   'unknown_team',
}

/** Supabase 세션에서 액세스 토큰 하나만 뽑아 돌려준다 — 없으면 null */
async function getAccessToken() {
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token ?? null
  } catch (err) {
    console.warn('[favorites] getSession failed', err)
    return null
  }
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth()

  const [favoriteTeams, setFavoriteTeams] = useState([])
  const [items, setItems] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [serverError, setServerError] = useState(null)

  /**
   * 최신 상태 스냅샷 — 큐가 순차 실행될 때 "가장 최근 사용자 의도" 를 PUT 한다.
   * useState 값을 클로저로 잡으면 add→remove 연타 사이의 값이 낡는다.
   */
  const latestListRef = useRef([])
  /** 직전 성공 상태 — 실패 원복에 쓴다 */
  const previousListRef = useRef([])
  /** PUT 직렬화 큐 — 이전 요청이 끝난 뒤에만 다음 요청이 나간다 */
  const queueRef = useRef(Promise.resolve())

  const locale = typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'ko'

  // ── 최초 로드 (또는 user 변경 시 재로드) ─────────────────────
  useEffect(() => {
    if (!isFavoritesEnabled || !user) {
      setFavoriteTeams([])
      setItems([])
      setServerError(null)
      latestListRef.current = []
      previousListRef.current = []
      return
    }

    let cancelled = false
    ;(async () => {
      const token = await getAccessToken()
      if (!token) {
        if (!cancelled) {
          setFavoriteTeams([])
          setItems([])
          setServerError('not_authenticated')
        }
        return
      }
      try {
        const res = await favoritesApi.list({ token, locale })
        if (cancelled) return
        const refs = (res.items ?? []).map(it => it.ref)
        setFavoriteTeams(refs)
        setItems(res.items ?? [])
        setServerError(null)
        latestListRef.current = refs
        previousListRef.current = refs
      } catch (err) {
        if (cancelled) return
        console.warn('[favorites] initial load failed', err)
        setFavoriteTeams([])
        setItems([])
        setServerError('network')
      }
    })()

    return () => { cancelled = true }
    // user?.id 로 재실행을 걸고 싶은 것이라, user 객체 전체를 넣으면 매 렌더마다 재조회다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, locale])

  // ── PUT 한 번 (큐에서 호출) ──────────────────────────────────
  const runSync = useCallback(async (teamRefs) => {
    if (!isFavoritesEnabled) return
    const token = await getAccessToken()
    if (!token) {
      setServerError('not_authenticated')
      // 원복: 이전 성공 상태로 되돌린다
      setFavoriteTeams(previousListRef.current)
      latestListRef.current = previousListRef.current
      return
    }
    setIsSyncing(true)
    try {
      const res = await favoritesApi.replace({ token, teamRefs, locale })
      const nextRefs = (res.items ?? []).map(it => it.ref)
      setFavoriteTeams(nextRefs)
      setItems(res.items ?? [])
      setServerError(null)
      latestListRef.current = nextRefs
      previousListRef.current = nextRefs
    } catch (err) {
      console.warn('[favorites] sync failed', err)
      const code = err?.code ? CODE_TO_ERROR[err.code] : null
      setServerError(code ?? 'network')
      // 원복 + items 재조회 (정합 회복)
      const rollback = previousListRef.current
      setFavoriteTeams(rollback)
      latestListRef.current = rollback
      try {
        const token2 = await getAccessToken()
        if (token2) {
          const res2 = await favoritesApi.list({ token: token2, locale })
          setItems(res2.items ?? [])
        }
      } catch (e) {
        console.warn('[favorites] rollback refetch failed', e)
      }
    } finally {
      setIsSyncing(false)
    }
  }, [locale])

  /** 큐에 PUT 하나를 얹는다 — 이전 요청이 끝난 뒤 latestListRef 스냅샷을 실어 보낸다 */
  const enqueueSync = useCallback(() => {
    queueRef.current = queueRef.current.then(() => runSync(latestListRef.current))
  }, [runSync])

  // ── mutator ─────────────────────────────────────────────────
  const add = useCallback((ref) => {
    if (!isFavoritesEnabled) return
    if (!user) {
      setServerError('not_authenticated')
      return
    }
    setServerError(null)
    setFavoriteTeams(prev => {
      if (prev.includes(ref)) return prev
      const next = [...prev, ref]
      latestListRef.current = next
      return next
    })
    enqueueSync()
  }, [user, enqueueSync])

  const remove = useCallback((ref) => {
    if (!isFavoritesEnabled) return
    if (!user) {
      setServerError('not_authenticated')
      return
    }
    setServerError(null)
    setFavoriteTeams(prev => {
      if (!prev.includes(ref)) return prev
      const next = prev.filter(r => r !== ref)
      latestListRef.current = next
      return next
    })
    enqueueSync()
  }, [user, enqueueSync])

  const toggle = useCallback((ref) => {
    if (!isFavoritesEnabled) {
      // 컴포넌트가 result.ok 를 소비하지 않는다 (F4 는 useAuth 를 함께 본다) — 그대로 no-op.
      return { ok: false, reason: 'disabled' }
    }
    if (!user) {
      setServerError('not_authenticated')
      return { ok: false, reason: 'not_authenticated' }
    }
    // 낙관적 처리 안에서 상한 검사 — 넘어가면 상태를 안 바꾸고 힌트만 세운다
    const current = latestListRef.current
    const has = current.includes(ref)
    if (!has && current.length >= FAVORITE_TEAMS_LIMIT) {
      setServerError('limit_exceeded')
      return { ok: false, reason: 'limit_reached' }
    }
    setServerError(null)
    const next = has ? current.filter(r => r !== ref) : [...current, ref]
    latestListRef.current = next
    setFavoriteTeams(next)
    enqueueSync()
    return { ok: true }
  }, [user, enqueueSync])

  const isFavorite = useCallback((ref) => favoriteTeams.includes(ref), [favoriteTeams])
  const clearServerError = useCallback(() => setServerError(null), [])

  const value = {
    favoriteTeams,
    items,
    isFavorite,
    add,
    remove,
    toggle,
    limit: FAVORITE_TEAMS_LIMIT,
    isFavoritesEnabled,
    isLoggedIn: !!user,
    isSyncing,
    serverError,
    clearServerError,
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
