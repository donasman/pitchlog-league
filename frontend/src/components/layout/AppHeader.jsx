/**
 * 공통 헤더
 * 로고, 주메뉴, 검색, 알림, 언어 전환, 테마 전환 포함.
 * 대회·시즌 선택은 각 페이지에서 처리 — 헤더는 대회 목록·시즌 목록을 fetch 하지 않는다.
 */

import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useMatch } from 'react-router-dom'
import { Home, Trophy, Calendar, Users, List, BarChart2, Search, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import SearchPanel from './SearchPanel'
import NotificationPanel from '@/components/notifications/NotificationPanel'
import { useNotifications } from '@/contexts/NotificationContext'

export default function AppHeader() {
  const { t } = useTranslation()
  const isHome = useMatch('/')  // 홈에서 로고 밑줄 표시

  const { unreadCount, panelOpen, togglePanel, closePanel } = useNotifications()
  const bellRef = useRef(null)

  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)

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

  if (typeof document !== 'undefined') {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
  }

  const navActive    = 'text-primary bg-primary/10'
  const navInactive  = 'text-muted-foreground hover:text-foreground hover:bg-accent'

  return (
    <>
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
          {/* 로고 */}
          <Link
            to="/"
            className="flex items-center gap-2 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-primary-foreground select-none">PL</span>
            </div>
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
            className="p-2 text-muted-foreground hover:text-foreground rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            {panelOpen && <NotificationPanel onClose={closePanel} />}
          </div>

          {/* 언어 전환 */}
          <LanguageToggle />

          {/* 테마 전환 */}
          <ThemeToggle />

          {/* 모바일 메뉴 토글 */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? t('header.menuClose') : t('header.menuOpen')}
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* 모바일 메뉴 오버레이 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <nav
            className="absolute top-0 left-0 w-72 h-full bg-card border-r border-border p-6 space-y-6 overflow-y-auto"
            aria-label={t('nav.home')}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
                <span className="text-xs font-black text-primary-foreground">PL</span>
              </div>
              <span className="font-bold text-foreground">PitchLog</span>
            </div>

            <div className="space-y-1">
              {NAV.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded transition-colors ${isActive ? navActive : navInactive}`
                  }
                >
                  <Icon size={18} aria-hidden="true" />{label}
                </NavLink>
              ))}
            </div>

            {/* 모바일 언어·테마 */}
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
