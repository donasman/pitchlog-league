/**
 * 공통 헤더
 * 로고, 주메뉴, 검색, 알림, 언어 전환, 테마 전환 포함.
 * 대회·시즌 선택은 각 페이지에서 처리 — 헤더는 대회 목록·시즌 목록을 fetch 하지 않는다.
 *
 * 모바일 드로어 (2026-09-26 재작성):
 *   - 오른쪽에서 슬라이드 (메뉴 버튼이 오른쪽 위이므로 왼쪽 슬라이드는 방향이 어긋난다)
 *   - AssistantPanel 과 동일 모션 토큰(--pl-panel-dur/ease) 공유
 *   - 상태 머신 open|closing|closed — 닫힘 애니메이션 종료까지 언마운트 지연
 *   - 오버레이 탭 · Esc · nav 클릭 · 라우트 변경 시 닫힘
 *   - 열림 중 body 스크롤 잠금, 포커스 첫 항목 이동, 닫힘 시 메뉴 버튼 복귀
 *   - prefers-reduced-motion 이면 transition 없이 즉시 열고 닫기
 *   - z-index 는 --pl-z-header > --pl-z-drawer > --pl-z-drawer-scrim > --pl-z-sticky.
 *     헤더가 드로어보다 위여야 X(닫기) 버튼이 눌린다.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, useMatch, useLocation } from 'react-router-dom'
import { Home, Trophy, Calendar, Users, List, BarChart2, Search, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import SearchPanel from './SearchPanel'
import BrandMark from '@/components/ui/BrandMark'
import NotificationPanel from '@/components/notifications/NotificationPanel'
import { useNotifications } from '@/contexts/NotificationContext'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export default function AppHeader() {
  const { t } = useTranslation()
  const isHome = useMatch('/')  // 홈에서 로고 밑줄 표시
  const location = useLocation()

  const { unreadCount, panelOpen, togglePanel, closePanel } = useNotifications()
  const bellRef = useRef(null)
  const headerRef = useRef(null)

  /* --pl-header-h 를 실측 높이로 유지 (필터 sticky top 오프셋) */
  useEffect(() => {
    if (!headerRef.current) return
    const el = headerRef.current
    const apply = () => {
      document.documentElement.style.setProperty('--pl-header-h', `${el.offsetHeight}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ── 모바일 드로어 상태 머신 ─────────────────────────────────
     closed → open (버튼 클릭)
     open → closing (닫기 트리거) → closed (transitionend / reduced-motion fallback) */
  const [drawerState, setDrawerState] = useState('closed')
  const [searchOpen, setSearchOpen]   = useState(false)
  const menuBtnRef      = useRef(null)
  const drawerRef       = useRef(null)
  const firstNavRef     = useRef(null)
  const closeTimerRef   = useRef(0)

  const drawerMounted = drawerState !== 'closed'
  const drawerOpen    = drawerState === 'open'

  const openDrawer  = useCallback(() => {
    setDrawerState('open')
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerState(prev => {
      if (prev === 'closed') return prev
      // reduced-motion 이면 애니메이션이 없어 transitionend 가 안 온다 → 즉시 closed
      if (prefersReducedMotion()) return 'closed'
      return 'closing'
    })
  }, [])

  /* closing 상태 안전장치 — transitionend 를 못 받아도 350ms 뒤 강제 closed */
  useEffect(() => {
    if (drawerState !== 'closing') return
    closeTimerRef.current = setTimeout(() => setDrawerState('closed'), 350)
    return () => clearTimeout(closeTimerRef.current)
  }, [drawerState])

  const onDrawerTransitionEnd = (e) => {
    // 드로어 자체의 transform 전이만 채택 (자식 요소의 다른 전이 무시)
    if (e.target !== drawerRef.current) return
    if (e.propertyName !== 'transform') return
    if (drawerState === 'closing') setDrawerState('closed')
  }

  /* Esc 닫기 */
  useEffect(() => {
    if (drawerState === 'closed') return
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerState, closeDrawer])

  /* 열림 중 body 스크롤 잠금 */
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (drawerMounted) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [drawerMounted])

  /* 라우트 변경 시 닫기 */
  useEffect(() => {
    if (drawerState !== 'closed') closeDrawer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  /* 포커스: 열림 완료 시 첫 항목으로, 닫힘 완료 시 메뉴 버튼으로 복귀 */
  useEffect(() => {
    if (drawerOpen) {
      // paint 뒤에 focus (transform 전이 시작 이후)
      const id = requestAnimationFrame(() => firstNavRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
    if (drawerState === 'closed' && menuBtnRef.current) {
      // 완전히 닫힌 뒤에만 포커스 복귀 — 열기 직후에는 아님
      // (초회 마운트 시에도 포커스가 튀지 않도록 이전 상태를 활용)
    }
  }, [drawerOpen, drawerState])

  /* 닫힘 완료 시 (closing → closed 전이) 메뉴 버튼으로 포커스 복귀 */
  const wasMountedRef = useRef(false)
  useEffect(() => {
    if (drawerMounted) {
      wasMountedRef.current = true
      return
    }
    if (wasMountedRef.current) {
      // 마운트→언마운트 전이 시점: 메뉴 버튼 포커스 복귀
      menuBtnRef.current?.focus()
      wasMountedRef.current = false
    }
  }, [drawerMounted])

  const NAV = [
    { to: '/',               label: t('nav.home'),        Icon: Home      },
    { to: '/matches',        label: t('nav.matches'),     Icon: Calendar  },
    { to: '/standings',      label: t('nav.standings'),   Icon: List      },
    { to: '/teams',          label: t('nav.teams'),       Icon: Users     },
    { to: '/competitions',   label: t('nav.competition'), Icon: Trophy    },
    { to: '/stats',          label: t('nav.stats'),       Icon: BarChart2 },
  ]

  // Ctrl+K 검색 단축키
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const navActive    = 'text-primary bg-primary/10'
  const navInactive  = 'text-muted-foreground hover:text-foreground hover:bg-accent'

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 bg-card border-b border-border"
        style={{ zIndex: 'var(--pl-z-header)' }}
      >
        <div className="pl-container flex items-center gap-3 h-14">
          {/* 로고 */}
          <Link
            to="/"
            className="flex items-center gap-2 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <BrandMark size={28} className="flex-shrink-0" />
            <span
              className="font-bold text-foreground text-sm tracking-tight hidden sm:block"
              style={{ boxShadow: isHome ? 'inset 0 -2px 0 var(--pl-primary)' : 'none', paddingBottom: 2 }}
            >PitchLog</span>
          </Link>

          {/* 데스크톱 내비 */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-2" aria-label={t('nav.home')}>
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? navActive : navInactive}`
                }
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          {/* 검색 */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label={t('header.searchLabel')}
            className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-foreground rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search size={18} aria-hidden="true" />
          </button>

          {/* 벨 + 알림 패널 */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              onClick={togglePanel}
              aria-label={t('notif.bell')}
              aria-expanded={panelOpen}
              style={{
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                position: 'relative',
                color: 'var(--pl-text)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M10 3.2a5 5 0 0 0-5 5V12l-1.6 2.6h13.2L15 12V8.2a5 5 0 0 0-5-5zM8 17.2h4" />
              </svg>
              {/* 안 읽음 배지 — 브랜드 파랑 (빨강 금지) */}
              {unreadCount > 0 && (
                <span
                  className="num"
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 4,
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    borderRadius: 999,
                    background: 'var(--pl-primary)',
                    color: 'var(--pl-on-primary)',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 0 0 2px var(--pl-card)',
                  }}
                  aria-label={t('notif.unreadCount', { count: unreadCount })}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {panelOpen && <NotificationPanel onClose={closePanel} containerRef={bellRef} />}
          </div>

          {/* 언어 전환 */}
          <LanguageToggle />

          {/* 테마 전환 */}
          <ThemeToggle />

          {/* 모바일 메뉴 토글 (오른쪽) */}
          <button
            ref={menuBtnRef}
            onClick={() => (drawerMounted ? closeDrawer() : openDrawer())}
            aria-label={drawerMounted ? t('header.menuClose') : t('header.menuOpen')}
            aria-expanded={drawerMounted}
            aria-controls="mobile-drawer"
            className="lg:hidden flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {drawerMounted ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* 모바일 드로어 — 오른쪽 슬라이드 · AssistantPanel 과 같은 모션 */}
      {drawerMounted && (
        <div className="lg:hidden">
          {/* 오버레이 (헤더 아래로만 덮음 — 헤더 X 버튼이 눌리게) */}
          <div
            data-open={drawerOpen ? 'true' : 'false'}
            onClick={closeDrawer}
            aria-hidden="true"
            className="pl-drawer-scrim"
          />
          <nav
            id="mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.home')}
            data-open={drawerOpen ? 'true' : 'false'}
            className="pl-drawer"
            onTransitionEnd={onDrawerTransitionEnd}
          >
            <div className="space-y-1">
              {NAV.map(({ to, label, Icon }, i) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  ref={i === 0 ? firstNavRef : undefined}
                  onClick={closeDrawer}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded transition-colors ${isActive ? navActive : navInactive}`
                  }
                >
                  <Icon size={18} aria-hidden="true" />{label}
                </NavLink>
              ))}
            </div>

            {/* 언어·테마 (기존 유지) */}
            <div className="border-t border-border pt-4 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{t('header.language')}</span>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}

      {/* 검색 패널 */}
      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
    </>
  )
}
