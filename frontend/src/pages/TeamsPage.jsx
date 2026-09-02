/**
 * 팀 목록 (/teams)
 * 국내 리그별 그룹 + UCL 참가 표시.
 * 데이터: services/api.js → fetchTeamsByLeague
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { fetchTeamsByLeague } from '@/services/api'
import TeamBadge from '@/components/ui/TeamBadge'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { getLocalizedName, getLocalizedCompetitionName } from '@/utils/localization'

export default function TeamsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { data: groups, loading, error } = useData(fetchTeamsByLeague, [])

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <LoadingSkeleton rows={8} />
    </div>
  )

  if (error) return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-16">
      <ErrorState title={t('common.errorTitle')} description={error} />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('nav.teams')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('common.season')}</p>
      </div>

      {(groups ?? []).map(({ comp, teams }) => (
        <section key={comp.slug}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {getLocalizedCompetitionName(comp, locale)}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {teams.map(team => {
              const isUCL = team.competitions.includes('champions-league')
              return (
                <Link
                  key={team.id}
                  to={`/teams/${team.slug}`}
                  className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-accent hover:border-ring transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group text-center"
                >
                  <TeamBadge initials={team.initials} color={team.color} size="lg" name={team.name} />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
                    {getLocalizedName({ id: team.id, name: team.name }, locale) || team.name}
                  </span>
                  {isUCL && (
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      {t('standings.legend.ucl')}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
