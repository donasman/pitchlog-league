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
import StandingsTable from '@/components/ui/StandingsTable'
import StatsRanking from '@/components/ui/StatsRanking'
import TeamBadge from '@/components/ui/TeamBadge'
import EmptyState from '@/components/ui/EmptyState'
import NotImplementedState from '@/components/ui/NotImplementedState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import ScheduleSections from '@/components/competition/ScheduleSections'
import RoundNavigator from '@/components/competition/RoundNavigator'
import TournamentBracket from '@/components/competition/TournamentBracket'
import TieCard from '@/components/competition/TieCard'
import { useData } from '@/hooks/useData'
import { useSeasonParam } from '@/hooks/useSeasonParam'
import { useRoundParam } from '@/hooks/useRoundParam'
import { fetchCompetitionHub, fetchCompetitionsForStats, fetchSeasons } from '@/services/api'
import { getLocalizedCompetitionName } from '@/utils/localization'
import { selectableSeasons } from '@/utils/seasons'
import { roundList, filterByRound } from '@/utils/schedule'
import { buildTies, bracketRounds, defaultTab, isSuperCup } from '@/utils/ties'
// groupCupMatchesByRound 는 utils/schedule 로 이관 — ScheduleSections 도 소비. 기존 T-C 잠금 유지 목적으로 여기서 re-export.
export { groupCupMatchesByRound } from '@/utils/schedule'

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

// 사이드바 그룹 순서 — 사용자 결정 (2026-09-21 · feat/schedule-split):
// 유럽 대항전을 위로 · 리그를 아래로. 그룹 안 대회는 displayOrder 그대로.
const GROUP_ORDER = ['european', 'domesticCup', 'superCup', 'league']

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

/**
 * 대회 페이지 부제에 쓸 시즌 라벨.
 *
 * 선택 시즌이 있으면 그 시즌 라벨을 우선 — 컵은 standings 가 없어 예전 로직은 항상 currentSeason 을
 * 그려 `?season=2025` 로 진입해도 부제가 `2026-27` 이 되던 09-21 실측 결함을 이 함수가 잡는다.
 * 리그도 같은 식이면 `standings.seasonId` 와 값이 같아 무해.
 *
 * @param {{ seasons: Array<{year:number,label:string}>|null|undefined, seasonYear:number|undefined, standings:{seasonId?:string}|null, comp:{currentSeason?:string}|null }} args
 * @returns {string|undefined}
 */
export function seasonLabelFor({ seasons, seasonYear, standings, comp }) {
  if (seasonYear != null) {
    const hit = (seasons ?? []).find(s => s?.year === seasonYear)
    if (hit?.label) return hit.label
  }
  return standings?.seasonId ?? comp?.currentSeason
}

/**
 * 시즌 드롭다운 옵션. `selectableSeasons` 는 `dataState==='COMPLETE'` 만 필터 (`utils/seasons.js:24`) —
 * UEL·UECL 은 전 시즌 NONE 이라 필터 결과가 비어 드롭다운이 사라지던 09-21 실측 결함을 이 함수가 잡는다.
 * 컵도 같은 이유로 이 폴백에 의존.
 *
 * @param {Array<object>} seasonsMemo  `selectableSeasons(fetchSeasons)` 결과 (COMPLETE 만)
 * @param {Array<object>} compSeasons  `data.comp.seasons` 원본 (필터 없음)
 * @returns {Array<object>}
 */
export function pickSeasonsForDropdown(seasonsMemo, compSeasons) {
  return (seasonsMemo?.length ?? 0) > 0 ? seasonsMemo : (compSeasons ?? [])
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
        maxHeight: 'calc(var(--pl-page-min-h) - 32px)',
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

  // 라운드 네비게이션 — matches 가 아직 없으면 빈 배열로 훅 호출 (조기 return 앞이라 순서 고정).
  // `data?.matches ?? []` 을 useMemo 로 감싸 매 렌더마다 새 빈 배열이 생기는 것을 막는다 (하위 useMemo deps 안정화).
  const matchesForRounds = useMemo(() => data?.matches ?? [], [data])
  const rounds = useMemo(() => roundList(matchesForRounds), [matchesForRounds])
  const { roundKey, setRoundKey } = useRoundParam(matchesForRounds)

  // 시즌 select 를 감싼다 — 시즌을 바꾸면 이전 시즌 URL 의 ?round= 를 버려 새 시즌 기본값이 잡히도록.
  // URL 쓰기는 1회: react-router 6 setSearchParams(fn) 은 렌더 스냅샷을 넘기므로(#9304)
  // setSeasonYear · setRoundKey 를 연달아 부르면 두 번째가 첫 번째(season) 를 지운다 (2026-09-22 결함).
  const handleSeasonChange = (year) => {
    setSeasonYear(year, { dropKeys: ['round'] })
  }

  // T 판 · 컵/유럽 갈래 판정 — comp.format 은 'cup'|'groups_knockout'|'league'.
  const isCup      = data?.comp?.format === 'cup'
  const superCup   = data?.comp ? isSuperCup(data.comp) : false
  const isUCLFmt   = data?.comp?.format === 'groups_knockout'

  // 녹아웃 대진 — buildTies (프론트) · bracketRounds (라운드 별 4열 트리 + 접힌 리스트).
  const ties    = useMemo(() => buildTies(matchesForRounds), [matchesForRounds])
  const bracket = useMemo(
    () => (data?.comp?.format ? bracketRounds(ties, data.comp.format) : []),
    [ties, data],
  )

  // 방어 useEffect — 컵은 standings 없음 · 슈퍼컵은 bracket 없음. 활성 탭이 없어질 조합이면 되돌린다.
  useEffect(() => {
    if (isCup && activeTab === 'standings') setActiveTab('schedule')
    if (superCup && activeTab === 'bracket') setActiveTab('schedule')
  }, [isCup, superCup, activeTab])

  // 기본 탭 결정 — data 도착 후 한 번만 (사용자가 탭을 눌렀으면 덮지 않는다).
  const [tabInitialized, setTabInitialized] = useState(false)
  useEffect(() => {
    if (!data?.comp || tabInitialized) return
    const target = defaultTab({
      format:        data.comp.format,
      ties,
      hasStandings:  !!data.standings,
      matches:       data.matches ?? [],
    })
    if (target !== activeTab) setActiveTab(target)
    setTabInitialized(true)
    // activeTab 변화는 초기화 트리거 아님
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ties, tabInitialized])

  // TABS 는 갈래 3분 — 슈퍼컵(2) · 컵(3 · bracket 우선) · UCL·UEL·UECL(4 · standings·bracket 포함) · league(3 · 기존).
  const TABS = useMemo(() => {
    if (superCup) {
      return [
        { id: 'schedule', labelKey: 'competition.tabs.schedule' },
        { id: 'stats',    labelKey: 'competition.tabs.stats' },
      ]
    }
    if (isCup) {
      return [
        { id: 'bracket',  labelKey: 'competition.tabs.bracket' },
        { id: 'schedule', labelKey: 'competition.tabs.schedule' },
        { id: 'stats',    labelKey: 'competition.tabs.stats' },
      ]
    }
    if (isUCLFmt) {
      return [
        { id: 'standings', labelKey: 'competition.tabs.standings' },
        { id: 'bracket',   labelKey: 'competition.tabs.bracket' },
        { id: 'schedule',  labelKey: 'competition.tabs.schedule' },
        { id: 'stats',     labelKey: 'competition.tabs.stats' },
      ]
    }
    return [
      { id: 'schedule',  labelKey: 'competition.tabs.schedule' },
      { id: 'standings', labelKey: 'competition.tabs.standings' },
      { id: 'stats',     labelKey: 'competition.tabs.stats' },
    ]
  }, [isCup, superCup, isUCLFmt])

  // 일정 탭은 splitSchedule + ScheduleSections 컴포넌트가 담당 — 페이지에 인라인 없음.
  // 컵 라운드 그룹은 그 안에서 자동 (groupByRound=true 전달).

  if (loading) return (
    <div className="pl-container" style={{ paddingBlock: '24px' }}>
      <LoadingSkeleton rows={6} />
    </div>
  )

  if (error) return (
    <div className="pl-container" style={{ paddingBlock: '64px' }}>
      <ErrorState title={t('competition.errorTitle')} description={error} />
    </div>
  )

  if (!data) return null

  const { comp, matches, standings, teams, topScorers, topAssisters } = data
  const showNoDataBanner = shouldShowNoDataBanner({
    isCup,
    matchesLength: matches.length,
    dataState: comp.currentSeason?.dataState,
  })

  // 시즌 드롭다운은 selectableSeasons(COMPLETE) 결과가 있으면 그대로 · 비면 comp.seasons 폴백.
  // UEL·UECL(groups_knockout)·컵은 전 시즌 NONE 이라 폴백을 탐. 리그·UCL 은 폴백 안 탐. T-E1 잠금.
  const seasonsForDropdown = pickSeasonsForDropdown(seasonsMemo, comp.seasons)

  const competitionsList = competitionsAll ?? []

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: 'var(--pl-page-min-h)' }}>
      <div
        style={{ paddingBlock: '20px 48px' }}
        className="pl-container comp-page-layout"
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
            <div style={{ display: 'grid', minWidth: 0, flex: '1 1 auto' }}>
              <h1 className="t-page" style={{ margin: 0, fontSize: 24, wordBreak: 'keep-all' }}>{getLocalizedCompetitionName(comp, locale)}</h1>
              <span className="t-sub">
                {seasonLabelFor({ seasons: comp.seasons, seasonYear, standings, comp })} · {comp.country}
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
                onChange={(e) => handleSeasonChange(e.target.value === '' ? null : Number(e.target.value))}
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

            {/* UCL 녹아웃 링크는 T 판 (feat/tournament-bracket) 에서 삭제 — 대진표 탭으로 흡수 */}
          </div>

          {/* 데이터 없음 / 컵 경기 0건 배너 */}
          {showNoDataBanner && (
            <div className="pl-card" style={{ padding: 12, marginBottom: 12 }}>
              <p className="t-sub" style={{ margin: 0 }}>{t('competition.noDataYet')}</p>
            </div>
          )}

          {/* 탭 바 */}
          <div
            className="pl-card pl-sticky-filter"
            style={{ display: 'flex', overflow: 'hidden', marginBottom: 16, background: 'var(--pl-card)' }}
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

          {/* 대진표 탭 (T 판) — TournamentBracket 이 buildTies → bracketRounds 결과를 소비.
              슈퍼컵은 TABS 에서 bracket 이 아예 빠짐. UCL R32 는 트리 밖 접힌 리스트. */}
          {activeTab === 'bracket' && (
            <TournamentBracket rounds={bracket} locale={locale} />
          )}

          {/* 일정 탭 — RoundNavigator + ScheduleSections. B 판에서 컵도 라운드 축을 셀렉터로 잡아
              ScheduleSections 안 라운드 그룹핑을 끔 (`groupByRound={false}`).
              슈퍼컵 (`isSuperCup`) 은 상단에 tie 카드 리스트 (1~3개) 를 얹은 뒤 그 아래 일정. */}
          {activeTab === 'schedule' && (
            superCup ? (
              matches.length === 0 ? (
                <EmptyState description={t('competition.noMatches')} />
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {ties.length > 0 && (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {ties.map(tie => <TieCard key={tie.tieId} tie={tie} locale={locale} />)}
                    </div>
                  )}
                  <ScheduleSections matches={filterByRound(matches, roundKey)} groupByRound={false} />
                </div>
              )
            ) : isCup ? (
              // 컵: 팀 사이드 없이 1열
              matches.length === 0 ? (
                <EmptyState description={t('competition.noMatches')} />
              ) : (
                <>
                  <div className="pl-sticky-filter" style={{ top: 'calc(var(--pl-header-h) + 44px)' }}>
                    <RoundNavigator rounds={rounds} roundKey={roundKey} onChange={setRoundKey} />
                  </div>
                  <ScheduleSections matches={filterByRound(matches, roundKey)} groupByRound={false} />
                </>
              )
            ) : (
              // 리그·UCL: 기존 2열 (경기 + 참가 팀 사이드)
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }} className="comp-sched-grid">
                <style>{`@media(min-width:768px){.comp-sched-grid{grid-template-columns:minmax(0,1fr) 280px!important}}`}</style>

                {matches.length > 0 ? (
                  <div>
                    <div className="pl-sticky-filter" style={{ top: 'calc(var(--pl-header-h) + 44px)' }}>
                      <RoundNavigator rounds={rounds} roundKey={roundKey} onChange={setRoundKey} />
                    </div>
                    <ScheduleSections matches={filterByRound(matches, roundKey)} />
                  </div>
                ) : (
                  <EmptyState description={t('competition.noMatches')} />
                )}

                {/* 참가팀 사이드 (280px 열) — minWidth:0 로 넘침 방어 (fix/round-url-one-based 실측:
                    UCL 페이지 scrollWidth 1450 vs innerWidth 1438 = 12px 넘침. 원인: 안쪽 2열 그리드
                    `1fr 1fr` 이 팀명 자연 폭에 늘어남 (`.tname` ellipsis 있어도 부모 grid `1fr` 은
                    `minmax(auto, 1fr)` 등가라 자식 요구 폭에 따라 넓어짐). 두 자리 모두 min-width:0 로 잠근다. */}
                <div style={{ display: 'grid', gap: 12, alignContent: 'start', minWidth: 0 }}>
                  <h2 className="t-card" style={{ margin: 0 }}>{t('competition.teams')}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
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
                <StandingsTable
                  entries={standings.entries}
                  competitionSlug={slug}
                  format={data?.comp?.format}
                  seasonFinished={(data?.comp?.seasons ?? []).find(s => s?.year === seasonYear)?.status === 'FINISHED'}
                />
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
