/**
 * 공통 헤더
 * 로고, 주메뉴, 대회·시즌 선택, 검색, 언어 전환, 테마 전환 포함.
 * 대회·시즌 선택 상태는 URL 검색 파라미터로 보존.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, NavLink, useSearchParams, useMatch } from 'react-router-dom'
import { Home, Trophy, Calendar, Users, List, BarChart2, Search, Menu, X, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { fetchCompetitions, fetchSeasons } from '@/services/api'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import SearchPanel from './SearchPanel'
import NotificationPanel from '@/components/notifications/NotificationPanel'
import { useNotifications } from '@/contexts/NotificationContext'
import { getLocalizedCompetitionName } from '@/utils/localization'
import { selectableSeasons, seasonYearFromParam, isPastSeason } from '@/utils/seasons'

export default function AppHeader() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const isHome = useMatch('/')  // 홈에서 로고 밑줄 표시

  const { unreadCount, panelOpen, togglePanel, closePanel } = useNotifications()
  const bellRef = useRef(null)

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

  // 헤더는 목록을 못 받아도 페이지를 막지 않는다 — 선택기만 비워두고 나머지는 그대로 뜬다
  const { data: competitionsData } = useData(fetchCompetitions, [])
  const competitions = competitionsData ?? []
  // `?competition=` 은 페이지마다 뜻이 다르다 — PlayerPage 는 'all'·'epl' 같은 자체 id 를 쓴다.
  // 그 값을 그대로 넘기면 fetchSeasons 가 competitionNotFound 로 던지고 선택기가 조용히 빈다.
  // 목록에 있는 slug 일 때만 넘기고, 아니면 기본 대회(EPL)로 둔다.
  const seasonCompSlug =
    competitions.some(c => c.slug === currentCompSlug) ? currentCompSlug : undefined
  // 시즌 목록은 대회마다 다르다 — 대회를 안 넘기면 어느 대회를 골라도 EPL 시즌이 나온다(live.js fetchSeasons 기본값)
  const { data: seasonsData }      = useData(() => fetchSeasons(seasonCompSlug), [seasonCompSlug])
  // 적재가 끝난 시즌만 고를 수 있다 (INGESTION_STRATEGY 5-4). useMemo 로 참조를 고정해 아래 정리 effect 가 매 렌더 돌지 않게 한다
  const seasons      = useMemo(() => selectableSeasons(seasonsData), [seasonsData])
  const seasonParam  = searchParams.get('season')
  // URL 에 시즌이 없거나 이 대회에 없는 시즌이면 목록의 첫 항목(최신). 목록도 없으면 표기를 비운다 — 리터럴로 채우지 않는다
  const currentSeasonYear = seasonYearFromParam(seasonParam, seasons) ?? seasons[0]?.year ?? null

  const selectedComp =
    competitions.find(c => c.slug === currentCompSlug) ?? competitions[0] ?? null
  const selectedSeason =
    seasons.find(s => s.year === currentSeasonYear) ?? seasons[0] ?? { year: null, label: '' }

  // URL 의 시즌 값을 연도로 정규화한다.
  //   · 대회를 바꾸면 이전 시즌이 새 대회에 없을 수 있다 → 파라미터를 떨어뜨려 백엔드 폴백(isCurrent)에 맡긴다
  //   · 예전 헤더가 라벨('2025-26')을 URL 에 썼다 → 이미 공유된 링크가 400 을 맞지 않게 연도로 바꾼다
  // 페이지들은 이 값을 그대로 `?season=` 에 실어 보내므로 여기서 한 번만 맞춰 두면 된다.
  useEffect(() => {
    if (seasonParam === null) return
    if (seasons.length === 0) return  // 아직 목록을 못 받았다 — 판단 근거가 없으므로 건드리지 않는다
    const resolved = seasonYearFromParam(seasonParam, seasons)
    // 현재 시즌은 URL 에 남기지 않는다. 남기면 `?season=` 의 뜻이 "현재가 아닌 시즌" 에서
    // "시즌을 한 번 눌렀음" 으로 흐려지고, 경기 화면이 그걸 보고 대회를 서버로 내리기
    // 시작해 칩을 누를 때마다 재요청이 돈다. 없으면 백엔드가 isCurrent 로 폴백한다.
    const drop = resolved === null || !isPastSeason(resolved, seasons)
    if (!drop && String(resolved) === seasonParam) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (drop) next.delete('season')
      else next.set('season', String(resolved))
      return next
    }, { replace: true })
  }, [seasonParam, seasons, setSearchParams])

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

          {/* 대회 선택 */}
          <div className="relative hidden md:block">
            <button
              onClick={() => { setCompOpen(!compOpen); setSeasonOpen(false) }}
              aria-expanded={compOpen}
              aria-haspopup="listbox"
              className={dropdownBtn}
            >
              <span className="font-medium">{selectedComp?.shortName ?? '—'}</span>
              <ChevronDown size={12} aria-hidden="true" />
            </button>
            {compOpen && (
              <div
                className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 w-52 py-1"
                role="listbox"
                aria-label={t('header.competitionSelect')}
              >
                {competitions.map(c => (
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
                {seasons.map(s => (
                  <button
                    key={s.year}
                    role="option"
                    aria-selected={s.year === currentSeasonYear}
                    /* 백엔드 `?season=` 은 연도(int)를 받는다 — 라벨을 URL 에 넣으면 400 이다 */
                    onClick={() => setParam('season', s.year)}
                    className={dropdownItem(s.year === currentSeasonYear)}
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

        {/* 컨텍스트 바 */}
        <div className="hidden md:flex items-center gap-2 px-6 py-1 bg-muted/50 border-t border-border text-xs text-muted-foreground">
          <span>{getLocalizedCompetitionName(selectedComp, locale)}</span>
          <span>·</span>
          <span>{selectedSeason.label} {t('header.season')}</span>
          {selectedComp?.format === 'groups_knockout' && (
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
              {competitions.map(c => (
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
