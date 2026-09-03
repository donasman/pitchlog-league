/**
 * 공통 헤더
 * 로고, 주메뉴, 대회·시즌 선택, 검색, 언어 전환, 테마 전환 포함.
 * 대회·시즌 선택 상태는 URL 검색 파라미터로 보존.
 */

import { useState, useEffect } from 'react'
import { Link, NavLink, useSearchParams } from 'react-router-dom'
import { Home, Trophy, Calendar, Users, List, BarChart2, Search, Menu, X, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { COMPETITIONS, SEASONS } from '@/mocks/competitions'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import SearchPanel from './SearchPanel'
import { getLocalizedCompetitionName } from '@/utils/localization'

export default function AppHeader() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [compOpen,    setCompOpen]    = useState(false)
  const [seasonOpen,  setSeasonOpen]  = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)

  const NAV = [
    { to: '/',               label: t('nav.home'),        Icon: Home      },
    { to: '/competitions',   label: t('nav.competition'), Icon: Trophy    },
    { to: '/matches',        label: t('nav.matches'),     Icon: Calendar  },
    { to: '/teams',          label: t('nav.teams'),       Icon: Users     },
    { to: '/standings',      label: t('nav.standings'),   Icon: List      },
    { to: '/stats',          label: t('nav.stats'),       Icon: BarChart2 },
  ]

  const currentCompSlug = searchParams.get('competition') ?? 'premier-league'
  const currentSeasonId = searchParams.get('season')      ?? '2026-27'

  const selectedComp   = COMPETITIONS.find(c => c.slug === currentCompSlug) ?? COMPETITIONS[0]
  const selectedSeason = SEASONS.find(s => s.id === currentSeasonId)        ?? SEASONS[0]

  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set(key, value)
      return next
    })
    setCompOpen(false)
    setSeasonOpen(false)
  }

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
  const dropdownBtn  = 'flex items-center gap-1.5 px-3 py-1.5 rounded bg-card border border-border text-sm text-foreground hover:border-ring transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  const dropdownItem = (active) => `w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:bg-accent ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`

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
            <span className="font-bold text-foreground text-sm tracking-tight hidden sm:block">PitchLog</span>
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

          {/* 대회 선택 */}
          <div className="relative hidden md:block">
            <button
              onClick={() => { setCompOpen(!compOpen); setSeasonOpen(false) }}
              aria-expanded={compOpen}
              aria-haspopup="listbox"
              className={dropdownBtn}
            >
              <span className="font-medium">{selectedComp.shortName}</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>
            {compOpen && (
              <div
                className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 w-52 py-1"
                role="listbox"
                aria-label={t('header.competitionSelect')}
              >
                {COMPETITIONS.map(c => (
                  <button
                    key={c.slug}
                    role="option"
                    aria-selected={c.slug === currentCompSlug}
                    onClick={() => setParam('competition', c.slug)}
                    className={dropdownItem(c.slug === currentCompSlug)}
                  >
                    <span>{getLocalizedCompetitionName(c, locale)}</span>
                    {c.slug === currentCompSlug && <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 시즌 선택 */}
          <div className="relative hidden md:block">
            <button
              onClick={() => { setSeasonOpen(!seasonOpen); setCompOpen(false) }}
              aria-expanded={seasonOpen}
              aria-haspopup="listbox"
              className={dropdownBtn}
            >
              <span>{selectedSeason.label}</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>
            {seasonOpen && (
              <div
                className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 w-32 py-1"
                role="listbox"
                aria-label={t('header.seasonSelect')}
              >
                {SEASONS.map(s => (
                  <button
                    key={s.id}
                    role="option"
                    aria-selected={s.id === currentSeasonId}
                    onClick={() => setParam('season', s.id)}
                    className={dropdownItem(s.id === currentSeasonId)}
                  >
                    {s.label}
                    {s.current && <span className="ml-1 text-xs text-muted-foreground">{t('header.currentSeason')}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 검색 */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label={t('header.searchLabel')}
            className="p-2 text-muted-foreground hover:text-foreground rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search size={18} aria-hidden="true" />
          </button>

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

        {/* 컨텍스트 바 */}
        <div className="hidden md:flex items-center gap-2 px-6 py-1 bg-muted/50 border-t border-border text-xs text-muted-foreground">
          <span>{getLocalizedCompetitionName(selectedComp, locale)}</span>
          <span>·</span>
          <span>{selectedSeason.label} {t('header.season')}</span>
          {selectedComp.format === 'groups_knockout' && (
            <><span>·</span><span className="text-blue-600 dark:text-blue-400">{t('header.leaguePhaseOngoing')}</span></>
          )}
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

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">{t('header.competitionsSection')}</p>
              {COMPETITIONS.map(c => (
                <button
                  key={c.slug}
                  onClick={() => { setParam('competition', c.slug); setMobileOpen(false) }}
                  className={`w-full text-left px-2 py-2 rounded text-sm transition-colors ${c.slug === currentCompSlug ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {getLocalizedCompetitionName(c, locale)}
                </button>
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
