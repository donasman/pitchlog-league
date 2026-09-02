/**
 * 홈 페이지 (/)
 * Phase 4 통합 홈 — 시안 3a 기준
 * 데이터: services/api.js → fetchHomeData + useData Hook
 * 1440×900 첫 화면: CompetitionChips ~ UnifiedMatchList + 사이드바까지
 */

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import CompetitionChips  from '@/components/home/CompetitionChips'
import SummaryStrip      from '@/components/home/SummaryStrip'
import LiveHeroCard      from '@/components/home/LiveHeroCard'
import UnifiedMatchList  from '@/components/home/UnifiedMatchList'
import StandingsTable    from '@/components/ui/StandingsTable'
import StatsRanking      from '@/components/ui/StatsRanking'
import MatchCard         from '@/components/ui/MatchCard'
import DataTimestamp     from '@/components/ui/DataTimestamp'
import LoadingSkeleton   from '@/components/ui/LoadingSkeleton'
import ErrorState        from '@/components/ui/ErrorState'
import EmptyState        from '@/components/ui/EmptyState'

import { fetchHomeData }      from '@/services/api'
import { useData }            from '@/hooks/useData'
import { mergeAndSort, filterTodayMatches } from '@/utils/matchSort'
import { getLocalizedName }   from '@/utils/localization'

// ─── 헬퍼 ──────────────────────────────────────────────────────
function parseSelectedComps(raw) {
  if (!raw || raw === 'all') return null
  const slugs = raw.split(',').filter(Boolean)
  return slugs.length > 0 ? slugs : null
}

function filterByComps(matches, selectedSlugs) {
  if (!selectedSlugs) return matches
  return matches.filter(m => selectedSlugs.includes(m.competitionSlug))
}

// ─── 사이드바 대회 선택기 ─────────────────────────────────────
const SIDEBAR_COMPS = [
  { slug:'premier-league',  label:'EPL'    },
  { slug:'la-liga',         label:'LaLiga' },
  { slug:'bundesliga',      label:'BL'     },
  { slug:'serie-a',         label:'SA'     },
  { slug:'ligue-1',         label:'L1'     },
  { slug:'champions-league',label:'UCL'    },
]

function SidebarCompChips({ selected, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-3">
      {SIDEBAR_COMPS.map(c => (
        <button
          key={c.slug}
          onClick={() => onChange(c.slug)}
          aria-pressed={selected === c.slug}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            selected === c.slug
              ? 'bg-primary/10 text-primary border-primary/30 font-bold'
              : 'text-muted-foreground border-border hover:border-ring'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

// ─── 섹션 헤더 ─────────────────────────────────────────────────
function SH({ title, to, linkLabel }) {
  const { t } = useTranslation()
  const label = linkLabel ?? t('standings.viewAll')
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      {to && (
        <Link to={to} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded">
          {label} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

// ─── 페이지 ────────────────────────────────────────────────────
export default function HomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [searchParams] = useSearchParams()
  const [sidebarComp, setSidebarComp] = useState('premier-league')

  const { data, loading, error } = useData(fetchHomeData, [])

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-4 space-y-5">
        <LoadingSkeleton rows={2} variant="text" />
        <LoadingSkeleton rows={8} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-16">
        <ErrorState description={error} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-16">
        <EmptyState />
      </div>
    )
  }

  const { competitions, allMatches, standings, uclKnockout, competitionScorers } = data

  // UCL 녹아웃 진출 타이 (round_of_16 완료분)
  const uclCompleted = uclKnockout.filter(
    tie => tie.stage === 'round_of_16' && tie.status === 'completed'
  )

  // CompetitionChips 선택값
  const selectedSlugs = parseSelectedComps(searchParams.get('competitions'))

  // 필터 적용된 경기 목록
  const filteredMatches = filterByComps(allMatches, selectedSlugs)
  const liveMatches     = filteredMatches.filter(m => ['live','halftime'].includes(m.displayState))
  const todayFiltered   = filterByComps(filterTodayMatches(allMatches), selectedSlugs)
  const todaySorted     = mergeAndSort([todayFiltered]).slice(0, 8)
  const recentResults   = filteredMatches.filter(m => ['confirmed','recheck'].includes(m.displayState))
  const nextScheduled   = filteredMatches.find(m => m.displayState === 'scheduled') ?? null

  const mainLive = liveMatches[0] ?? null
  const subLives = liveMatches.slice(1, 3)

  // 사이드바 — 선택 대회 데이터
  const isUCLSidebar   = sidebarComp === 'champions-league'
  const curStandings   = standings[sidebarComp]
  const curTop5        = curStandings?.entries.slice(0, 5) ?? []
  const curScorers     = (competitionScorers?.[sidebarComp] ?? []).slice(0, 5)
  const sidebarLabel   = SIDEBAR_COMPS.find(c => c.slug === sidebarComp)?.label ?? 'EPL'

  // 요약 스트립 — EPL 득점 1위 (EPL 데이터 기준)
  const eplStandings  = standings['premier-league']
  const eplTopScorer  = competitionScorers?.['premier-league']?.[0] ?? null
  const summaryItems  = [
    { label: t('home.liveLabel'),       value: t('home.liveCount', { count: liveMatches.length }), tone: liveMatches.length > 0 ? 'live' : 'default' },
    { label: t('home.todayLabel'),      value: t('home.liveCount', { count: todayFiltered.length }) },
    { label: t('home.eplFirstLabel'),   value: getLocalizedName({ id: eplStandings?.entries[0]?.teamId, name: eplStandings?.entries[0]?.teamName }, locale) || eplStandings?.entries[0]?.teamName || '—' },
    { label: t('home.eplTopScorerLabel'), value: eplTopScorer ? `${eplTopScorer.playerName} ${eplTopScorer.value} ${t('home.goalsUnit')}` : '—' },
  ]

  const isFiltered = selectedSlugs !== null

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-4 space-y-5">

      {/* ① 대회 필터 칩 */}
      <CompetitionChips competitions={competitions} />

      {/* ② 요약 스트립 */}
      <SummaryStrip items={summaryItems} />

      {/* ③ 메인 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

        {/* 왼쪽 */}
        <div className="space-y-4 min-w-0">

          {/* LIVE 카드 영역 */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-3.5">
            <LiveHeroCard match={mainLive} fallbackMatch={nextScheduled} />
            <div className="space-y-3">
              {subLives.length > 0
                ? subLives.map(m => <MatchCard key={m.id} match={m} />)
                : filteredMatches.filter(m => m.displayState === 'scheduled').slice(0, 2).map(m => (
                    <MatchCard key={m.id} match={m} />
                  ))
              }
            </div>
          </div>

          {/* 오늘의 경기 목록 */}
          <div>
            <SH
              title={isFiltered ? t('home.todayFiltered', { count: selectedSlugs.length }) : t('home.todayAll')}
              to="/matches"
              linkLabel={t('home.scheduleAll')}
            />
            {todaySorted.length > 0
              ? <UnifiedMatchList matches={todaySorted} maxRows={8} />
              : <EmptyState
                  title={isFiltered ? t('home.noTodayFiltered') : t('home.noTodayAll')}
                />
            }
          </div>
        </div>

        {/* 오른쪽 사이드바 */}
        <aside className="space-y-5 min-w-0">

          {/* 공통 대회 선택기 */}
          <SidebarCompChips selected={sidebarComp} onChange={setSidebarComp} />

          {/* 순위 */}
          <section>
            <SH
              title={`${sidebarLabel} ${t('home.sideStandingsTitle')}`}
              to={`/standings?competition=${sidebarComp}`}
              linkLabel={t('standings.viewAll')}
            />
            <div className="bg-card border border-border rounded-xl p-3">
              {curTop5.length > 0
                ? <>
                    <StandingsTable entries={curTop5} maxRows={5} competitionSlug={sidebarComp} isUCL={isUCLSidebar} compact />
                    {curStandings && <DataTimestamp updatedAt={curStandings.updatedAt} className="mt-3" />}
                  </>
                : <EmptyState description={t('standings.noDataDesc')} />
              }
            </div>
          </section>

          {/* 득점 순위 */}
          <section>
            <SH
              title={`${sidebarLabel} ${t('home.sideScoringTitle')}`}
              to={`/stats?competition=${sidebarComp}`}
              linkLabel={t('standings.viewAll')}
            />
            <div className="bg-card border border-border rounded-xl p-3">
              {curScorers.length > 0
                ? <StatsRanking title="" unit={t('stats.goals')} entries={curScorers} />
                : <EmptyState description={t('standings.noDataDesc')} />
              }
            </div>
          </section>

          {/* UCL 녹아웃 진출 팀 */}
          <section>
            <SH title={t('home.uclKnockout')} to="/competitions/champions-league/knockout" linkLabel={t('home.uclKnockoutFull')} />
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {uclCompleted.map(tie => (
                <div key={tie.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tie.homeTeam?.color ?? '#64748b' }} aria-hidden="true" />
                    <span className="text-foreground font-medium">{tie.winner}</span>
                  </div>
                  <span className="text-muted-foreground">{t('home.aggregateScore', { home: tie.aggregateScore?.home, away: tie.aggregateScore?.away })}</span>
                </div>
              ))}
              {uclCompleted.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground">{t('home.noTeamConfirmed')}</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* ④ 최근 결과 / 다음 경기 / UCL 3열 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-border">
        <section>
          <SH title={t('home.recentResults')} to="/matches" />
          <div className="space-y-2">
            {recentResults.slice(0, 3).map(m => <MatchCard key={m.id} match={m} compact />)}
            {recentResults.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {isFiltered ? t('home.noRecentFiltered') : t('home.noRecentAll')}
              </p>
            )}
          </div>
        </section>
        <section>
          <SH title={t('home.nextMatch')} />
          <div className="space-y-2">
            {filteredMatches.filter(m => m.displayState === 'scheduled').slice(0, 3).map(m => (
              <MatchCard key={m.id} match={m} compact />
            ))}
            {filteredMatches.filter(m => m.displayState === 'scheduled').length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">{t('home.noNextMatch')}</p>
            )}
          </div>
        </section>
        <section>
          <SH title={t('home.ucl16')} to="/competitions/champions-league/knockout" linkLabel={t('home.uclKnockoutFull')} />
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {uclCompleted.concat(uclKnockout.filter(t2 => t2.stage === 'round_of_16' && t2.status === 'in_progress'))
              .slice(0, 4).map(tie => (
                <div key={tie.id} className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <span className="flex-1 truncate">{tie.homeTeam?.name ?? t('knockout.tbd')}</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {tie.aggregateScore ? `${tie.aggregateScore.home}-${tie.aggregateScore.away}` : 'vs'}
                  </span>
                  <span className="flex-1 text-right truncate">{tie.awayTeam?.name ?? t('knockout.tbd')}</span>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  )
}
