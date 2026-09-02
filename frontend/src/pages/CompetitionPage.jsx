/**
 * 대회 허브 (/competitions/:slug)
 * 데이터: services/api.js → fetchCompetitionHub
 */

import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { ChevronRight, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MatchCard from '@/components/ui/MatchCard'
import StandingsTable from '@/components/ui/StandingsTable'
import StatsRanking from '@/components/ui/StatsRanking'
import TeamBadge from '@/components/ui/TeamBadge'
import DataTimestamp from '@/components/ui/DataTimestamp'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { fetchCompetitionHub } from '@/services/api'
import { getLocalizedCompetitionName } from '@/utils/localization'

// 탭 상태: 영문 id (언어 전환 시 탭이 풀리지 않음)
const TABS = [
  { id: 'schedule',  labelKey: 'competition.tabs.schedule' },
  { id: 'standings', labelKey: 'competition.tabs.standings' },
  { id: 'stats',     labelKey: 'competition.tabs.stats' },
]

export default function CompetitionPage() {
  const { slug } = useParams()
  const [activeTab, setActiveTab] = useState('schedule')
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const { data, loading, error } = useData(() => fetchCompetitionHub(slug), [slug])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <LoadingSkeleton rows={2} variant="text" />
        <LoadingSkeleton rows={4} variant="card" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <ErrorState title={t('competition.errorTitle')} description={error} />
      </div>
    )
  }

  if (!data) return null

  const { comp, matches, standings, teams, topScorers, topAssisters } = data
  const isUCL = comp.format === 'groups_knockout'

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center">
            <span className="text-lg font-black text-muted-foreground">{comp.initials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{getLocalizedCompetitionName(comp, locale)}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('competition.season')} · {comp.country}
              {isUCL && <span className="ml-2 text-blue-600 dark:text-blue-400">{t('competition.leaguePhaseOngoing')}</span>}
            </p>
          </div>
        </div>
        {isUCL && (
          <Link
            to="/competitions/champions-league/knockout"
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/50 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trophy size={14} aria-hidden="true" />
            {t('competition.knockoutLink')} <ChevronRight size={13} />
          </Link>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('competition.mainMatches')}</h2>
              {matches.length > 0
                ? matches.map(m => <MatchCard key={m.id} match={m} />)
                : <EmptyState description={t('competition.noMatches')} />
              }
            </div>
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('competition.teams')}</h2>
              <div className="grid grid-cols-2 gap-2">
                {teams.map(team => (
                  <Link
                    key={team.slug}
                    to={`/teams/${team.slug}`}
                    className="flex items-center gap-2 p-2 rounded bg-card border border-border hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <TeamBadge initials={team.initials} color={team.color} size="xs" name={team.name} />
                    <span className="text-xs text-foreground truncate">{team.shortName}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {isUCL ? t('competition.uclLeaguePhase') : t('competition.leagueRank')}
              </h2>
              {standings && <DataTimestamp updatedAt={standings.updatedAt} />}
            </div>
            {standings
              ? <StandingsTable entries={standings.entries} isUCL={isUCL} competitionSlug={slug} />
              : <EmptyState description={t('competition.noStandings')} />
            }
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <StatsRanking title={t('competition.topScorers')} unit={t('stats.goals')} entries={topScorers} />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <StatsRanking title={t('competition.topAssisters')} unit={t('stats.assists')} entries={topAssisters} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
