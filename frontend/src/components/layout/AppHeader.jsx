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

import { useState, useEffect, useRef, useCallback, useReducer } from 'react'
import { Link, NavLink, useMatch, useLocation } from 'react-router-dom'
import { Home, Trophy, Calendar, Users, List, BarChart2, Search, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import SearchPanel from './SearchPanel'
import BrandMark from '@/components/ui/BrandMark'
import NotificationPanel from '@/components/notifications/NotificationPanel'
import { useNotifications } from '@/contexts/NotificationContext'
import {
  nextDrawerState,
  drawerMounted as isDrawerMounted,
  drawerIntendedOpen as isDrawerIntendedOpen,
  drawerDataOpen,
  drawerFocusTarget,
} from './drawerState'

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

  /* ── 모바일 드로어 상태 머신 ──
     로직은 drawerState.js 순수 reducer 에 있다. 컴포넌트는 rAF 로 opening→open,
     transitionend/350ms 안전장치로 closing→closed 를 dispatch 하는 얇은 어댑터.
     'opening' 이 한 프레임 존재해야 브라우저가 초기 스타일을 페인트해서
     data-open flip 시 CSS transition 이 실제로 발동한다 (없으면 즉시 나타남 = 열림 버그). */
  const [drawerState, dispatchDrawer] = useReducer(
    (prev, action) => nextDrawerState(prev, action, { reducedMotion: prefersReducedMotion() }),
    'closed',
  )
  const [searchOpen, setSearchOpen] = useState(false)
  const menuBtnRef      = useRef(null)
  const drawerRef       = useRef(null)
  const closeTimerRef   = useRef(0)

  const drawerMounted  = isDrawerMounted(drawerState)
  const intendedOpen   = isDrawerIntendedOpen(drawerState)

  const openDrawer  = useCallback(() => dispatchDrawer('open'),  [])
  const closeDrawer = useCallback(() => dispatchDrawer('close'), [])

  /* opening → open : 두 번의 rAF 이후 dispatch. 브라우저가 첫 프레임에서 초기 스타일
     (translateX(100%)) 을 페인트한 뒤 두 번째 프레임에서 data-open="true" 로 바뀌어
     transition 이 정상 실행된다. */
  useEffect(() => {
    if (drawerState !== 'opening') return
    let raf1 = 0, raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => dispatchDrawer('enter'))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [drawerState])

  /* closing 안전장치 — transitionend 를 못 받아도 350ms 뒤 exit dispatch */
  useEffect(() => {
    if (drawerState !== 'closing') return
    closeTimerRef.current = setTimeout(() => dispatchDrawer('exit'), 350)
    return () => clearTimeout(closeTimerRef.current)
  }, [drawerState])

  const onDrawerTransitionEnd = (e) => {
    // 드로어 자체의 transform 전이만 채택 (자식 요소의 다른 전이 무시)
    if (e.target !== drawerRef.current) return
    if (e.propertyName !== 'transform') return
    if (drawerState === 'closing') dispatchDrawer('exit')
  }

  /* Esc 닫기 */
  useEffect(() => {
    if (!drawerMounted) return
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerMounted, closeDrawer])

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
    if (drawerMounted) closeDrawer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  /* 포커스: open 진입 시 드로어 컨테이너로 이동 (첫 링크 아님).
     첫 링크로 옮기면 Safari 가 프로그램 포커스에도 링을 그려, 현재 페이지가
     '순위' 인데도 '홈' 링크가 강조돼 보이는 오해가 생긴다. 컨테이너 자체는
     tabIndex=-1 + outline:none 이라 링이 나오지 않고, 스크린리더는 dialog
     라벨을 읽는다. 키보드 사용자는 Tab 을 누르면 첫 링크로 정상 이동. */
  useEffect(() => {
    if (drawerFocusTarget(drawerState) !== 'drawer') return
    const id = requestAnimationFrame(() => drawerRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(id)
  }, [drawerState])

  /* 닫힘 완료 시 (마운트 → 언마운트 전이) 메뉴 버튼으로 포커스 복귀 */
  const wasMountedRef = useRef(false)
  useEffect(() => {
    if (drawerMounted) {
      wasMountedRef.current = true
      return
    }
    if (wasMountedRef.current) {
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

          {/* 모바일 메뉴 토글 (오른쪽) — 라벨/아이콘은 "의도된 열림 상태" 기준.
              closing 중에는 다시 ☰ 로 돌아가서 재-열기 시 reducer 가 open 으로 뒤집는다. */}
          <button
            ref={menuBtnRef}
            onClick={() => (intendedOpen ? closeDrawer() : openDrawer())}
            aria-label={intendedOpen ? t('header.menuClose') : t('header.menuOpen')}
            aria-expanded={intendedOpen}
            aria-controls="mobile-drawer"
            className="lg:hidden flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {intendedOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* 모바일 드로어 — 오른쪽 슬라이드 · AssistantPanel 과 같은 모션.
          data-open 은 drawerDataOpen(state): opening 은 "false" 로 한 프레임 두어야
          다음 rAF 에서 "true" 로 바뀌면서 브라우저가 transition 을 발동한다. */}
      {drawerMounted && (
        <div className="lg:hidden">
          <div
            data-open={drawerDataOpen(drawerState)}
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
            tabIndex={-1}
            data-open={drawerDataOpen(drawerState)}
            className="pl-drawer"
            onTransitionEnd={onDrawerTransitionEnd}
          >
            <div className="space-y-1">
              {NAV.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
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
