/**
 * 순위 페이지 (/standings)
 * 데이터: services/api.js → fetchCompetitions, fetchStandings
 */

import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StandingsTable from '@/components/ui/StandingsTable'
import DataTimestamp from '@/components/ui/DataTimestamp'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { fetchCompetitions, fetchStandings } from '@/services/api'
import { getLocalizedCompetitionName, getLocalizedCompetitionShortName } from '@/utils/localization'

export default function StandingsPage() {
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const competitionSlug = searchParams.get('competition') ?? 'premier-league'

  const { data: competitions, loading: loadingComps } = useData(fetchCompetitions, [])
  const { data: standings, loading: loadingStandings, error } = useData(
    () => fetchStandings(competitionSlug).catch(() => null),
    [competitionSlug]
  )

  const loading = loadingComps || loadingStandings
  const comp = (competitions ?? []).find(c => c.slug === competitionSlug) ?? null
  const isUCL = comp?.format === 'groups_knockout'

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {comp ? getLocalizedCompetitionName(comp, locale) : t('standings.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {standings?.stage
              ? `${standings.stage.label} ${t(standings.stage.status === 'ongoing' ? 'standings.stageOngoing' : 'standings.stageCompleted')}`
              : t('standings.title')
            } · {t('standings.season')}
          </p>
        </div>
        {comp && (
          <Link
            to={`/competitions/${comp.slug}`}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            {t('standings.hubLink')} <ChevronRight size={14} />
          </Link>
        )}
      </div>

      {/* 대회 필터 */}
      {competitions && (
        <nav aria-label={t('header.competitionSelect')} className="flex gap-2 flex-wrap">
          {competitions.map(c => (
            <Link
              key={c.slug}
              to={`/standings?competition=${c.slug}`}
              aria-current={c.slug === competitionSlug ? 'page' : undefined}
              className={`px-3 py-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                c.slug === competitionSlug
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {getLocalizedCompetitionShortName(c, locale) || c.shortName}
            </Link>
          ))}
        </nav>
      )}

      {/* UCL 안내 */}
      {isUCL && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-lg px-4 py-3">
          <p className="text-blue-700 dark:text-blue-300 font-medium text-sm mb-1">{t('standings.leaguePhaseTitle')}</p>
          <p className="text-muted-foreground text-xs">{t('standings.leaguePhaseDesc')}</p>
          <Link
            to="/competitions/champions-league/knockout"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            {t('standings.leaguePhaseLink')} <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="bg-card border border-border rounded-xl p-4">
          <LoadingSkeleton rows={10} />
        </div>
      )}

      {/* 오류 */}
      {!loading && error && (
        <ErrorState title={t('standings.errorTitle')} description={error} />
      )}

      {/* 순위 테이블 */}
      {!loading && !error && (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {isUCL ? t('standings.leaguePhaseLabel') : t('standings.leagueRankLabel')}
            </h2>
            {standings && <DataTimestamp updatedAt={standings.updatedAt} />}
          </div>
          {standings ? (
            <StandingsTable entries={standings.entries} isUCL={isUCL} competitionSlug={competitionSlug} />
          ) : (
            <EmptyState title={t('standings.noData')} description={t('standings.noDataDesc')} />
          )}
        </div>
      )}
    </div>
  )
}
