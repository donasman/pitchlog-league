/**
 * 팀 즐겨찾기 전역 상태 — 서버 저장 (Supabase Auth + backend `/api/me/favorites`).
 *
 * 활성 조건: `isFavoritesEnabled = isAuthEnabled && VITE_USE_MOCK !== 'true'`.
 * 하나라도 꺼져 있으면 컨텍스트는 no-op — 별 버튼과 홈 섹션이 조용히 사라진다.
 *
 * 상태 규약 (value):
 *   - favoriteTeams: string[]   (ref, 순서 = position 0..N-1)
 *   - items: NormalizedTeam[]    (팀 요약 정규화 결과 + position — MyTeamsSection 이 소비)
 *   - isFavorite: (ref) => boolean
 *   - toggle: (ref) => {ok:true} | {ok:false, reason:'disabled'|'not_authenticated'|'not_ready'|'limit_reached'}
 *   - reload: () => void         (첫 로드를 다시 시도 — 세대가 하나 올라간다)
 *   - limit: 10                  (FAVORITE_TEAMS_LIMIT)
 *   - isFavoritesEnabled · isLoggedIn · isSyncing (PUT 진행 중 · 별 버튼이 회색 처리)
 *   - loadState: 'idle'|'loading'|'ready'|'error'
 *       idle    = 비활성 또는 비로그인
 *       loading = 첫 GET 진행 중 — 이때 빈 목록은 "즐겨찾기 0개" 가 아니다
 *       ready   = GET 성공 · 이때만 toggle 이 받아들여진다
 *       error   = GET 실패 · 빈 목록으로 숨기지 않고 loadError 로 드러낸다
 *   - loadError: null|'network'|'not_authenticated'
 *       GET 성공 · idle 분기에서만 지운다 (reload 시작 시에는 남겨 둔다)
 *   - actionError: null|{ code:'limit_exceeded'|'duplicate'|'unknown_team'|'network'|'not_authenticated', ref:string }
 *       toggle/PUT 실패 — 어느 팀 버튼에서 났는지 ref 로 구분한다
 *   - clearActionError: (ref?) => void  (ref 를 주면 그 ref 의 오류만 지운다)
 *
 * 낙관적 갱신:
 *   toggle 은 즉시 favoriteTeams 를 갱신하고 PUT 을 큐에 실어 보낸다. 큐가 있는 이유:
 *   연타(add A → remove A → add A) 시 백엔드에 3번 왕복하지 않도록 이전 PUT 이 끝난 뒤 최신 상태 하나로만 보낸다.
 *   실패하면 이전 배열로 원복하고 items 를 다시 받아 정합을 회복한다.
 *
 * 세대 가드:
 *   로드 effect 가 돌 때마다(user · locale · reload) genRef 가 하나 오른다. 큐에 실린 PUT 과
 *   진행 중인 GET 은 자기 세대를 들고 있다가, await 뒤 세대가 바뀌었으면 상태를 건드리지 않고 버린다.
 *   로그아웃 후 이전 계정의 응답이 새 상태를 덮는 것을 막는다.
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
import {
  decideToggle,
  isCurrentGeneration,
  refsOf,
  toActionErrorCode,
} from '@/contexts/favoritesState'

const FavoritesContext = createContext(null)

/**
 * true 면 서버 저장·별 버튼 활성. false 면 컨텍스트가 no-op.
 * Mock 모드에서는 백엔드 인증이 없어 서버 저장을 시도할 수 없다.
 */
export const isFavoritesEnabled = isAuthEnabled && !USE_MOCK

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
  const [loadState, setLoadState] = useState('idle')
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  /**
   * 최신 상태 스냅샷 — 큐가 순차 실행될 때 "가장 최근 사용자 의도" 를 PUT 한다.
   * useState 값을 클로저로 잡으면 add→remove 연타 사이의 값이 낡는다.
   */
  const latestListRef = useRef([])
  /** 직전 성공 상태 — 실패 원복에 쓴다 */
  const previousListRef = useRef([])
  /** PUT 직렬화 큐 — 이전 요청이 끝난 뒤에만 다음 요청이 나간다 */
  const queueRef = useRef(Promise.resolve())
  /** 세대 — 로드 effect 가 돌 때마다 하나 오른다. 낡은 비동기 응답을 버리는 기준 */
  const genRef = useRef(0)
  /** 마지막으로 토글한 ref — PUT 실패 시 actionError.ref 로 쓴다 */
  const lastToggledRef = useRef(null)

  const locale = typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'ko'

  // ── 최초 로드 (user · locale 변경 또는 reload 시 재로드) ─────────
  useEffect(() => {
    genRef.current += 1
    const gen = genRef.current
    queueRef.current = Promise.resolve()
    lastToggledRef.current = null
    setFavoriteTeams([])
    setItems([])
    setIsSyncing(false)
    setActionError(null)
    latestListRef.current = []
    previousListRef.current = []

    if (!isFavoritesEnabled || !user) {
      setLoadState('idle')
      setLoadError(null)
      return
    }

    setLoadState('loading')
    let cancelled = false
    ;(async () => {
      const token = await getAccessToken()
      if (cancelled || !isCurrentGeneration(gen, genRef.current)) return
      if (!token) {
        setLoadError('not_authenticated')
        setLoadState('error')
        return
      }
      try {
        const res = await favoritesApi.list({ token, locale })
        if (cancelled || !isCurrentGeneration(gen, genRef.current)) return
        const refs = refsOf(res.items)
        setFavoriteTeams(refs)
        setItems(res.items ?? [])
        latestListRef.current = refs
        previousListRef.current = refs
        setLoadError(null)
        setLoadState('ready')
      } catch (err) {
        if (cancelled || !isCurrentGeneration(gen, genRef.current)) return
        console.warn('[favorites] initial load failed', err)
        setLoadError('network')
        setLoadState('error')
      }
    })()

    return () => { cancelled = true }
    // user?.id 로 재실행을 걸고 싶은 것이라, user 객체 전체를 넣으면 매 렌더마다 재조회다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, locale, reloadNonce])

  // ── PUT 한 번 (큐에서 호출) ──────────────────────────────────
  const runSync = useCallback(async (teamRefs, gen) => {
    if (!isCurrentGeneration(gen, genRef.current)) return
    if (!isFavoritesEnabled) return
    const token = await getAccessToken()
    if (!isCurrentGeneration(gen, genRef.current)) return
    if (!token) {
      setActionError({ code: 'not_authenticated', ref: lastToggledRef.current })
      // 원복: 이전 성공 상태로 되돌린다
      setFavoriteTeams(previousListRef.current)
      latestListRef.current = previousListRef.current
      return
    }
    setIsSyncing(true)
    try {
      const res = await favoritesApi.replace({ token, teamRefs, locale })
      if (!isCurrentGeneration(gen, genRef.current)) return
      const nextRefs = refsOf(res.items)
      setFavoriteTeams(nextRefs)
      setItems(res.items ?? [])
      setActionError(null)
      latestListRef.current = nextRefs
      previousListRef.current = nextRefs
    } catch (err) {
      if (!isCurrentGeneration(gen, genRef.current)) return
      console.warn('[favorites] sync failed', err)
      setActionError({ code: toActionErrorCode(err), ref: lastToggledRef.current })
      // 원복 + items 재조회 (정합 회복)
      const rollback = previousListRef.current
      setFavoriteTeams(rollback)
      latestListRef.current = rollback
      try {
        const token2 = await getAccessToken()
        if (!isCurrentGeneration(gen, genRef.current)) return
        if (token2) {
          const res2 = await favoritesApi.list({ token: token2, locale })
          if (!isCurrentGeneration(gen, genRef.current)) return
          setItems(res2.items ?? [])
        }
      } catch (e) {
        console.warn('[favorites] rollback refetch failed', e)
      }
    } finally {
      if (isCurrentGeneration(gen, genRef.current)) setIsSyncing(false)
    }
  }, [locale])

  /** 큐에 PUT 하나를 얹는다 — 이전 요청이 끝난 뒤 latestListRef 스냅샷을 실어 보낸다 */
  const enqueueSync = useCallback(() => {
    const gen = genRef.current
    queueRef.current = queueRef.current.then(() => runSync(latestListRef.current, gen))
  }, [runSync])

  // ── mutator ─────────────────────────────────────────────────
  const toggle = useCallback((ref) => {
    if (!isFavoritesEnabled) {
      return { ok: false, reason: 'disabled' }
    }
    if (!user) {
      setActionError({ code: 'not_authenticated', ref })
      return { ok: false, reason: 'not_authenticated' }
    }
    const d = decideToggle({
      list: latestListRef.current,
      ref,
      limit: FAVORITE_TEAMS_LIMIT,
      loadState,
    })
    if (!d.ok) {
      // not_ready 는 상태를 바꾸지 않는다 — 첫 로드 상태(loadState/loadError)가 이미 화면에 드러나 있다
      if (d.reason === 'limit_reached') setActionError({ code: 'limit_exceeded', ref })
      return d
    }
    setActionError(null)
    lastToggledRef.current = ref
    latestListRef.current = d.next
    setFavoriteTeams(d.next)
    enqueueSync()
    return { ok: true }
  }, [user, loadState, enqueueSync])

  const reload = useCallback(() => setReloadNonce(n => n + 1), [])

  const isFavorite = useCallback((ref) => favoriteTeams.includes(ref), [favoriteTeams])
  const clearActionError = useCallback((ref) => {
    setActionError(prev => (ref === undefined || prev?.ref === ref) ? null : prev)
  }, [])

  const value = {
    favoriteTeams,
    items,
    isFavorite,
    toggle,
    reload,
    limit: FAVORITE_TEAMS_LIMIT,
    isFavoritesEnabled,
    isLoggedIn: !!user,
    isSyncing,
    loadState,
    loadError,
    actionError,
    clearActionError,
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
