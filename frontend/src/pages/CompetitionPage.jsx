/**
 * 대회 허브 /competitions/:slug
 *
 * 레이아웃:
 *   - 데스크톱(>=1024px): 좌측 사이드바 240px (그룹 헤더 4 · 대회 19)
 *   - 모바일(<1024px):    상단 chip (displayOrder<=60 · 6개) + "더 보기" 드롭다운(나머지 13)
 *
 * 대회 갈래 (`comp.format`):
 *   - `league`            → 리그 5개 (스탠딩 있음 · 팀 섹션 있음 · 3탭)
 *   - `groups_knockout`   → UCL·UEL·UECL (스탠딩 있음 · 팀 섹션 있음 · 3탭 + 녹아웃 링크)
 *   - `cup`               → 국내 컵 6 + 슈퍼컵 5 (스탠딩 없음 · 팀 섹션 없음 · 2탭 · 라운드별 그룹)
 *
 * "아직 수집이 시작되지 않았다" 배너: 컵은 실제 경기 0건이면 (dataState 무시 — 컵은 전 시즌 NONE 이 정상) ·
 * 리그·UCL·UEL·UECL 은 `dataState==='NONE'` 이면. 순수 함수 `shouldShowNoDataBanner` (T-B1~T-B3 잠금).
 */

import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import MatchCard from '@/components/ui/MatchCard'
import StandingsTable from '@/components/ui/StandingsTable'
import StatsRanking from '@/components/ui/StatsRanking'
import TeamBadge from '@/components/ui/TeamBadge'
import EmptyState from '@/components/ui/EmptyState'
import NotImplementedState from '@/components/ui/NotImplementedState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { useSeasonParam } from '@/hooks/useSeasonParam'
import { fetchCompetitionHub, fetchCompetitionsForStats, fetchSeasons } from '@/services/api'
import { getLocalizedCompetitionName } from '@/utils/localization'
import { selectableSeasons } from '@/utils/seasons'

/**
 * 사이드바 / chip 그룹 판정. 백엔드 `displayOrder` + `format` 기준.
 *
 *   - `league` (format==='league')                              displayOrder 10~50 (5)
 *   - `european` (format==='groups_knockout')                   displayOrder 60·70·80 (UCL·UEL·UECL, 3)
 *   - `domesticCup` (format==='cup' && displayOrder<=200)       displayOrder 110~160 (FA·EFL·CDR·DFB·CI·CDF, 6)
 *   - `superCup` (format==='cup' && displayOrder>200)           displayOrder 210~250 (CS·SC·DFL·Supercoppa·Trophée, 5)
 *
 * 총 19 — `MATCH_VISIBLE_COMPETITION_API_IDS` 와 일치.
 */
function competitionGroup(comp) {
  if (comp.format === 'league') return 'league'
  if (comp.format === 'groups_knockout') return 'european'
  if (comp.format === 'cup' && (comp.displayOrder ?? 0) <= 200) return 'domesticCup'
  return 'superCup'
}

const GROUP_ORDER = ['league', 'european', 'domesticCup', 'superCup']

/**
 * "아직 수집이 시작되지 않았다" 배너 노출 여부.
 *
 * 컵(`isCup`)은 백엔드 `dataState` 가 전 시즌 NONE 인 것이 정상값이라 dataState 를 무시하고
 * 실제 경기 수만 본다 — 매치 창을 걷었어도 실제 0건이면 시즌이 아직 안 시작.
 * 리그·UCL·UEL·UECL 은 기존대로 `dataState==='NONE'` 이 판정 근거.
 *
 * 순수 함수라 CompetitionPage.test.js 에서 잠근다 (T-B1~T-B3).
 *
 * @param {{ isCup: boolean, matchesLength: number, dataState: string|null|undefined }} args
 * @returns {boolean}
 */
export function shouldShowNoDataBanner({ isCup, matchesLength, dataState }) {
  if (isCup) return matchesLength === 0
  return dataState === 'NONE'
}

/** 데스크톱 사이드바 (>=1024px). CompetitionPage 안에서만 쓴다. */
function CompetitionSidebar({ competitions, activeSlug, locale, t }) {
  const grouped = useMemo(() => {
    const bucket = { league: [], european: [], domesticCup: [], superCup: [] }
    for (const c of competitions) bucket[competitionGroup(c)].push(c)
    return bucket
  }, [competitions])

  return (
    <nav
      aria-label={t('competition.sidebarLabel')}
      className="pl-card"
      style={{
        padding: 12,
        display: 'grid',
        gap: 12,
        alignContent: 'start',
        position: 'sticky',
        top: 16,
        maxHeight: 'calc(100dvh - 32px)',
        overflowY: 'auto',
      }}
    >
      {GROUP_ORDER.map(g => grouped[g].length === 0 ? null : (
        <div key={g} style={{ display: 'grid', gap: 4 }}>
          <span className="t-cap" style={{ color: 'var(--pl-sub)', padding: '2px 4px' }}>
            {t(`nav.competitionGroup.${g}`)}
          </span>
          {grouped[g].map(c => {
            const active = c.slug === activeSlug
            return (
              <Link
                key={c.slug}
                to={`/competitions/${c.slug}`}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'block',
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--pl-text)' : 'var(--pl-sub)',
                  background: active ? 'var(--pl-fill)' : 'transparent',
                  textDecoration: 'none',
                  minHeight: 36,
                  lineHeight: '20px',
                }}
              >
                {getLocalizedCompetitionName(c, locale)}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

/** 모바일 chip (<1024px). displayOrder<=60 은 chip, 나머지는 드롭다운. */
function CompetitionChips({ competitions, activeSlug, locale, t }) {
  const navigate = useNavigate()
  const chipComps    = competitions.filter(c => (c.displayOrder ?? 0) <= 60)
  const dropdownComps = competitions.filter(c => (c.displayOrder ?? 0) > 60)

  return (
    <div
      aria-label={t('competition.chipsLabel')}
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        overflowX: 'auto',
        paddingBottom: 8,
        marginBottom: 12,
      }}
    >
      {chipComps.map(c => {
        const active = c.slug === activeSlug
        return (
          <Link
            key={c.slug}
            to={`/competitions/${c.slug}`}
            aria-current={active ? 'page' : undefined}
            className="pl-chip"
            style={{
              flexShrink: 0,
              fontWeight: active ? 700 : 500,
              background: active ? 'var(--pl-fill)' : 'transparent',
              color: active ? 'var(--pl-text)' : 'var(--pl-sub)',
              textDecoration: 'none',
            }}
          >
            {getLocalizedCompetitionName(c, locale) || c.shortName}
          </Link>
        )
      })}
      {dropdownComps.length > 0 && (
        <select
          aria-label={t('competition.moreCompetitions')}
          value={dropdownComps.some(c => c.slug === activeSlug) ? activeSlug : ''}
          onChange={(e) => { if (e.target.value) navigate(`/competitions/${e.target.value}`) }}
          className="pl-chip"
          style={{ flexShrink: 0, fontFamily: 'var(--font)' }}
        >
          <option value="">{t('competition.moreCompetitions')}</option>
          {dropdownComps.map(c => (
            <option key={c.slug} value={c.slug}>{getLocalizedCompetitionName(c, locale) || c.shortName}</option>
          ))}
        </select>
      )}
    </div>
  )
}

export default function CompetitionPage() {
  const { slug } = useParams()
  const [activeTab, setActiveTab] = useState('schedule')
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  // 대회 목록 · 시즌 목록 — 사이드바/chip 과 시즌 드롭다운의 소스.
  const { data: competitionsAll } = useData(fetchCompetitionsForStats, [])
  const { data: seasonsData }     = useData(() => fetchSeasons(slug), [slug])
  const seasonsMemo = useMemo(() => selectableSeasons(seasonsData ?? []), [seasonsData])
  const { seasonYear, setSeasonYear } = useSeasonParam(seasonsMemo)

  // deps 에 seasonYear 가 있어야 시즌을 바꿨을 때 다시 받는다
  const { data, loading, error } = useData(() => fetchCompetitionHub(slug, seasonYear), [slug, seasonYear])

  // 컵일 때는 standings 탭이 아예 없다. 초기 URL 로 진입하거나, 다른 대회에서
  // standings 활성 상태로 이 페이지에 들어오면 schedule 로 되돌린다.
  const isCup = data?.comp?.format === 'cup'
  useEffect(() => {
    if (isCup && activeTab === 'standings') setActiveTab('schedule')
  }, [isCup, activeTab])

  // TABS 는 대회 갈래에 따라 다르다 — 컵은 스탠딩 없음(2탭).
  const TABS = useMemo(() => isCup
    ? [
        { id: 'schedule', labelKey: 'competition.tabs.schedule' },
        { id: 'stats',    labelKey: 'competition.tabs.stats' },
      ]
    : [
        { id: 'schedule',  labelKey: 'competition.tabs.schedule' },
        { id: 'standings', labelKey: 'competition.tabs.standings' },
        { id: 'stats',     labelKey: 'competition.tabs.stats' },
      ], [isCup])

  // 컵일 때 schedule 탭은 라운드별 그룹. Hook 규칙상 early return 이전에 호출한다 —
  // data 가 아직 없어도 빈 배열로 계산되고, 렌더 시점엔 이 값이 필요 없어 낭비도 없다.
  const cupRoundGroups = useMemo(() => {
    if (!isCup) return null
    const matches = data?.matches ?? []
    const map = new Map()
    for (const m of matches) {
      const key = m.round?.name ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(m)
    }
    return Array.from(map.entries())
  }, [isCup, data])

  if (loading) return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
      <LoadingSkeleton rows={6} />
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '64px 16px' }}>
      <ErrorState title={t('competition.errorTitle')} description={error} />
    </div>
  )

  if (!data) return null

  const { comp, matches, standings, teams, topScorers, topAssisters } = data
  const isUCL = comp.format === 'groups_knockout'
  const showNoDataBanner = shouldShowNoDataBanner({
    isCup,
    matchesLength: matches.length,
    dataState: comp.currentSeason?.dataState,
  })

  // 컵은 selectableSeasons 필터(COMPLETE 만)를 우회한다 — 컵 시즌은 전부 NONE 이 정상.
  // 리그·UCL·UEL·UECL 은 기존 seasonsMemo(COMPLETE 만) 그대로.
  const seasonsForDropdown = isCup ? (comp.seasons ?? []) : seasonsMemo

  const competitionsList = competitionsAll ?? []

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '20px 16px 48px',
        }}
        className="lg:px-8 comp-page-layout"
      >
        {/* 데스크톱은 240px 사이드바 + 본문, 모바일은 1열 */}
        <style>{`
          .comp-page-layout { display: grid; grid-template-columns: 1fr; gap: 20px; }
          @media (min-width: 1024px) {
            .comp-page-layout { grid-template-columns: 240px 1fr; }
            .comp-page-chips { display: none !important; }
          }
          @media (max-width: 1023.98px) {
            .comp-page-sidebar { display: none !important; }
          }
        `}</style>

        <div className="comp-page-sidebar">
          <CompetitionSidebar competitions={competitionsList} activeSlug={slug} locale={locale} t={t} />
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="comp-page-chips">
            <CompetitionChips competitions={competitionsList} activeSlug={slug} locale={locale} t={t} />
          </div>

          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <span
              className="pl-emblem"
              style={{ width: 52, height: 52, fontSize: 14, fontWeight: 700, flexShrink: 0, borderRadius: 12 }}
            >
              {comp.initials}
            </span>
            <div style={{ display: 'grid', minWidth: 0, flex: 1 }}>
              <h1 className="t-page" style={{ margin: 0, fontSize: 24 }}>{getLocalizedCompetitionName(comp, locale)}</h1>
              <span className="t-sub">
                {standings?.seasonId ?? comp.currentSeason} · {comp.country}
                {standings?.stage && (
                  <span style={{ marginLeft: 8 }}>
                    · {standings.stage.label}
                    <span style={{ marginLeft: 4, color: 'var(--pl-sub)' }}>
                      {t(standings.stage.status === 'ongoing' ? 'standings.stageOngoing' : 'standings.stageCompleted')}
                    </span>
                  </span>
                )}
              </span>
            </div>

            {/* 시즌 드롭다운 — 컵은 comp.seasons 전부 · 그 외는 selectableSeasons(COMPLETE). 현재 시즌은 값 '' (URL 에서 param 제거) */}
            {seasonsForDropdown.length > 0 && (
              <select
                aria-label={t('header.seasonSelect')}
                value={seasonYear !== undefined ? String(seasonYear) : ''}
                onChange={(e) => setSeasonYear(e.target.value === '' ? null : Number(e.target.value))}
                className="pl-chip"
                style={{ flexShrink: 0, fontFamily: 'var(--font)' }}
              >
                {seasonsForDropdown.map(s => (
                  <option key={s.year} value={s.current ? '' : String(s.year)}>
                    {s.label}
                    {s.current ? ` ${t('header.currentSeason')}` : ''}
                  </option>
                ))}
              </select>
            )}

            {isUCL && (
              <Link to="/competitions/champions-league/knockout" className="pl-btn pl-btn-sm pl-btn-ghost">
                {t('competition.knockoutLink')}
              </Link>
            )}
          </div>

          {/* 데이터 없음 / 컵 경기 0건 배너 */}
          {showNoDataBanner && (
            <div className="pl-card" style={{ padding: 12, marginBottom: 12 }}>
              <p className="t-sub" style={{ margin: 0 }}>{t('competition.noDataYet')}</p>
            </div>
          )}

          {/* 탭 바 */}
          <div
            className="pl-card"
            style={{ display: 'flex', overflow: 'hidden', marginBottom: 16 }}
            role="tablist"
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? 'var(--pl-text)' : 'var(--pl-sub)',
                  boxShadow: activeTab === tab.id ? 'inset 0 -2px 0 var(--pl-primary)' : 'none',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          {/* 일정 탭 */}
          {activeTab === 'schedule' && (
            isCup ? (
              // 컵: 팀 사이드 없이 1열. 라운드별 그룹 (그룹 1개면 헤더 생략)
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 className="t-card" style={{ margin: 0 }}>{t('competition.mainMatches')}</h2>
                  <Link to={`/matches?competition=${slug}`} className="pl-link" style={{ marginLeft: 'auto', fontSize: 12 }}>
                    {t('competition.allMatches')}
                  </Link>
                </div>
                {matches.length === 0 ? (
                  <EmptyState description={t('competition.noMatches')} />
                ) : cupRoundGroups.length <= 1 ? (
                  // 라운드 1개면 헤더 생략 (예: 슈퍼컵 결승)
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                    {matches.map(m => <MatchCard key={m.id} match={m} />)}
                  </div>
                ) : (
                  cupRoundGroups.map(([roundName, list]) => (
                    <div key={roundName} style={{ display: 'grid', gap: 8 }}>
                      {roundName && <h3 className="t-card" style={{ margin: '4px 0 0' }}>{roundName}</h3>}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                        {list.map(m => <MatchCard key={m.id} match={m} />)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // 리그·UCL: 기존 2열 (경기 + 참가 팀 사이드)
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="comp-sched-grid">
                <style>{`@media(min-width:768px){.comp-sched-grid{grid-template-columns:1fr 280px!important}}`}</style>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 className="t-card" style={{ margin: 0 }}>{t('competition.mainMatches')}</h2>
                    <Link to={`/matches?competition=${slug}`} className="pl-link" style={{ marginLeft: 'auto', fontSize: 12 }}>
                      {t('competition.allMatches')}
                    </Link>
                  </div>
                  {matches.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                      {matches.map(m => <MatchCard key={m.id} match={m} />)}
                    </div>
                  ) : (
                    <EmptyState description={t('competition.noMatches')} />
                  )}
                </div>

                <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
                  <h2 className="t-card" style={{ margin: 0 }}>{t('competition.teams')}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {teams.slice(0, 12).map(team => (
                      <Link
                        key={team.slug}
                        to={`/teams/${team.slug}`}
                        className="pl-card"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', textDecoration: 'none', color: 'inherit', minHeight: 44 }}
                      >
                        <TeamBadge initials={team.initials} color={team.color} logoUrl={team.logoUrl} size="xs" name={team.name} />
                        <span className="tname t-sub" style={{ color: 'var(--pl-text)', fontWeight: 600 }}>{team.shortName}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {/* 순위 탭 — 컵은 TABS 에 없어 진입 불가, useEffect 가 방어 */}
          {!isCup && activeTab === 'standings' && (
            <div className="pl-card" style={{ overflow: 'hidden' }}>
              {standings ? (
                <StandingsTable entries={standings.entries} competitionSlug={slug} />
              ) : (
                <EmptyState description={t('competition.noStandings')} />
              )}
            </div>
          )}

          {/* 통계 탭 */}
          {activeTab === 'stats' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="comp-stats-grid">
              <style>{`@media(min-width:640px){.comp-stats-grid{grid-template-columns:1fr 1fr!important}}`}</style>
              {/* 실 API 는 득점·도움 순위가 아직 없어 null 을 준다 — 0명(빈 배열) 과 구분해 "아직 없음" 으로 그린다 */}
              <div className="pl-card" style={{ padding: 16 }}>
                {topScorers == null
                  ? <NotImplementedState featureKey="errors.feature.top_scorers" />
                  : <StatsRanking title={t('competition.topScorers')} unit={t('stats.goals')} entries={topScorers} />}
              </div>
              <div className="pl-card" style={{ padding: 16 }}>
                {topAssisters == null
                  ? <NotImplementedState featureKey="errors.feature.top_assisters" />
                  : <StatsRanking title={t('competition.topAssisters')} unit={t('stats.assists')} entries={topAssisters} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
