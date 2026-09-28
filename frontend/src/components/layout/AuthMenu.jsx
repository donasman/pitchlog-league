/**
 * 로그인·프로필 메뉴.
 *
 * 헤더 우측(데스크톱 · 아바타) + 모바일 드로어(큰 버튼) 두 자리에서 쓴다.
 *   isAuthEnabled=false → null (SupabaseClient 가 없어 로그인이 꺼진 환경)
 *   isLoading=true      → 32px 원형 스켈레톤 (레이아웃이 튀지 않게 자리 유지)
 *   session 없음        → 로그인 버튼. authError 는 인라인 힌트로 HINT_MS 후 스스로 지운다
 *   session 있음        → 아바타 → 클릭 시 이름·이메일·로그아웃 팝오버
 *
 * shadcn DropdownMenu 는 프로젝트에 아직 설치돼 있지 않다. 새 의존성을 얹지 않으려고
 * 이 파일 안에서 useEffect 로 클릭 아웃사이드 · Esc 를 처리하는 얇은 팝오버를 만든다 —
 * 접근성 기본은 지킨다(aria-haspopup · aria-expanded · role=menu).
 *
 * @param {{ size?: 'sm'|'lg' }} props
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogIn, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const HINT_MS = 2800
const AVATAR_PX = 32

export default function AuthMenu({ size = 'sm' }) {
  const { t } = useTranslation()
  const {
    isAuthEnabled,
    isLoading,
    user,
    authError,
    signInWithGoogle,
    signOut,
    clearAuthError,
  } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [hintVisible, setHintVisible] = useState(false)
  const rootRef = useRef(null)
  const hintTimerRef = useRef(null)

  // authError 등장 → HINT_MS 뒤 자동 clear. 사용자가 별도로 지우면 타이머도 정리.
  useEffect(() => {
    if (!authError) {
      setHintVisible(false)
      return
    }
    setHintVisible(true)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => {
      setHintVisible(false)
      clearAuthError()
      hintTimerRef.current = null
    }, HINT_MS)
    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current)
        hintTimerRef.current = null
      }
    }
  }, [authError, clearAuthError])

  // 클릭 아웃사이드 · Esc 로 팝오버 닫기
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const onSignIn = useCallback(() => {
    signInWithGoogle()
  }, [signInWithGoogle])

  const onSignOut = useCallback(async () => {
    setMenuOpen(false)
    await signOut()
  }, [signOut])

  if (!isAuthEnabled) return null

  if (isLoading) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: AVATAR_PX,
          height: AVATAR_PX,
          borderRadius: '50%',
          background: 'var(--pl-line)',
          opacity: 0.6,
        }}
      />
    )
  }

  // ─ 비로그인 ─
  if (!user) {
    const label = size === 'lg' ? t('auth.signInWithGoogle') : t('auth.signIn')

    // 큰 버튼(모바일) — 드로어 카드 폭에 채워지는 primary 스타일
    if (size === 'lg') {
      return (
        <div style={{ display: 'grid', gap: 8 }}>
          <button
            type="button"
            onClick={onSignIn}
            className="pl-btn-primary"
            style={{
              width: '100%',
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--pl-primary)',
              color: 'var(--pl-on-primary)',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 600,
            }}
          >
            <LogIn size={16} aria-hidden="true" />
            {label}
          </button>
          {/* 데스크톱은 헤더 우측에서 인라인 힌트, 모바일은 헤더 아래 배너(AppHeader) 가 담당.
              이 자리에는 인라인 힌트를 두지 않는다 — 배너와 중복되어 두 번 뜬다 */}
        </div>
      )
    }

    // 데스크톱 짧은 버튼 + 별 밑 인라인 힌트
    return (
      <span
        ref={rootRef}
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      >
        <button
          type="button"
          onClick={onSignIn}
          aria-label={label}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            border: '1px solid var(--pl-line)',
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--pl-text)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <LogIn size={14} aria-hidden="true" />
          {label}
        </button>
        <span
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 30,
            pointerEvents: 'none',
            padding: '6px 10px',
            background: 'var(--pl-card)',
            color: 'var(--pl-text)',
            border: '1px solid var(--pl-line)',
            borderRadius: 'var(--r-sm)',
            boxShadow: 'var(--sh-over)',
            fontSize: 12,
            lineHeight: 1.35,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            opacity: hintVisible ? 1 : 0,
            transform: hintVisible ? 'translateY(0)' : 'translateY(-2px)',
            transition: 'opacity .18s ease, transform .18s ease',
          }}
        >
          {hintVisible && authError === 'cancelled' && t('auth.error.signInCancelled')}
          {hintVisible && authError === 'failed' && t('auth.error.signInFailed')}
        </span>
      </span>
    )
  }

  // ─ 로그인 상태 ─
  const meta = user.user_metadata ?? {}
  const displayName = meta.full_name || meta.name || user.email || ''
  const avatarUrl = meta.avatar_url || null
  const email = user.email ?? ''

  // 아바타 fallback — 이름의 첫 글자 (다국어 대응 위해 codePoint 기준 첫 문자)
  const initial = (displayName || email || '?').trim().slice(0, 1).toUpperCase()

  // size='lg' → 모바일 큰 버튼(드로어). 아바타는 왼쪽, 오른쪽에 이름·로그아웃 액션
  if (size === 'lg') {
    return (
      <div className="pl-card" style={{ padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              width={AVATAR_PX}
              height={AVATAR_PX}
              style={{ width: AVATAR_PX, height: AVATAR_PX, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                display: 'inline-grid',
                placeItems: 'center',
                width: AVATAR_PX,
                height: AVATAR_PX,
                borderRadius: '50%',
                background: 'var(--pl-primary)',
                color: 'var(--pl-on-primary)',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {initial}
            </span>
          )}
          <div style={{ display: 'grid', minWidth: 0, flex: 1 }}>
            <span className="t-body" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </span>
            {email && (
              <span className="t-cap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {email}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          style={{
            width: '100%',
            minHeight: 40,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--pl-line)',
            background: 'transparent',
            color: 'var(--pl-text)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontWeight: 600,
          }}
        >
          <LogOut size={14} aria-hidden="true" />
          {t('auth.signOut')}
        </button>
      </div>
    )
  }

  // size='sm' → 데스크톱 아바타 + 팝오버
  return (
    <span
      ref={rootRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        onClick={() => setMenuOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={displayName || t('auth.signIn')}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          width: AVATAR_PX + 4,
          height: AVATAR_PX + 4,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            width={AVATAR_PX}
            height={AVATAR_PX}
            style={{ width: AVATAR_PX, height: AVATAR_PX, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-grid',
              placeItems: 'center',
              width: AVATAR_PX,
              height: AVATAR_PX,
              borderRadius: '50%',
              background: 'var(--pl-primary)',
              color: 'var(--pl-on-primary)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {initial}
          </span>
        )}
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label={displayName}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 40,
            minWidth: 220,
            padding: 8,
            background: 'var(--pl-card)',
            color: 'var(--pl-text)',
            border: '1px solid var(--pl-line)',
            borderRadius: 'var(--r-md, 10px)',
            boxShadow: 'var(--sh-over)',
            display: 'grid',
            gap: 6,
          }}
        >
          <div style={{ padding: '6px 8px', display: 'grid', gap: 2 }}>
            <span className="t-body" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </span>
            {email && (
              <span className="t-cap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {email}
              </span>
            )}
          </div>
          <div style={{ height: 1, background: 'var(--pl-line)' }} aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--pl-text)',
              cursor: 'pointer',
              borderRadius: 6,
              textAlign: 'left',
              fontWeight: 500,
            }}
          >
            <LogOut size={14} aria-hidden="true" />
            {t('auth.signOut')}
          </button>
        </div>
      )}
    </span>
  )
}
