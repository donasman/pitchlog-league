/**
 * 인증 상태 — Supabase 세션·로그인·로그아웃·OAuth 콜백 오류 흡수.
 *
 * 흐름:
 *   1) 마운트 시 `?error=` 파라미터를 먼저 확인해 authError 를 세운 뒤 URL 을 정리.
 *   2) `supabase.auth.getSession()` 으로 첫 세션을 받는다.
 *   3) `onAuthStateChange` 로 이후 변화를 구독한다 (다른 탭에서 로그아웃 등).
 *
 * `isAuthEnabled=false` (env 부족) 이면 session=null · isLoading=false 로 즉시 안정 상태.
 * signIn/signOut 은 no-op — 로그인 자체가 꺼진 환경에서는 조용히 무시한다.
 *
 * 오류는 Notification 컨텍스트를 태우지 않고 `authError` 상태 하나로만 알린다 —
 * 헤더 컴포넌트가 인라인 힌트/배너로 렌더한다 (경기 토스트와 문맥이 다르다).
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, isAuthEnabled } from '@/lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(isAuthEnabled)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (!isAuthEnabled) {
      setSession(null)
      setIsLoading(false)
      return
    }

    let mounted = true

    // OAuth 콜백 오류를 URL 에서 걷어낸다.
    // 사용자가 취소하면 Google 이 `?error=access_denied&error_description=...` 를 붙여 돌려보낸다.
    // 그 외 error 값(server_error 등)은 실패로 취급한다.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      if (errorParam) {
        setAuthError(errorParam === 'access_denied' ? 'cancelled' : 'failed')
        // 파라미터를 지운다 — 새로고침해도 오류가 되살아나지 않게. hash 는 유지 (Supabase 가
        // 세션을 hash 로 넘기는 흐름에 영향 없게).
        try {
          window.history.replaceState(null, '', window.location.pathname + window.location.hash)
        } catch (e) {
          console.warn('[auth] history.replaceState failed', e)
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data?.session ?? null)
      setIsLoading(false)
    }).catch(err => {
      // getSession 은 로컬 저장소만 읽어 실패가 드물다. 실패해도 앱은 살려야 한다.
      console.warn('[auth] getSession failed', err)
      if (!mounted) return
      setSession(null)
      setIsLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return
      setSession(s ?? null)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!isAuthEnabled) return
    const redirectTo = typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : undefined
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
    } catch (err) {
      console.warn('[auth] signInWithOAuth failed', err)
      setAuthError('failed')
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!isAuthEnabled) return
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[auth] signOut failed', err)
    }
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  const value = {
    session,
    user: session?.user ?? null,
    isAuthEnabled,
    isLoading,
    authError,
    signInWithGoogle,
    signOut,
    clearAuthError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
