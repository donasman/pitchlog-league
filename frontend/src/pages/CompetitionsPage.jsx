/**
 * 대회 목록 (/competitions)
 * 6개 대회 카드. UCL 카드에 녹아웃 대진 링크 포함.
 * 데이터: services/api.js → fetchCompetitionsOverview
 */

import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { fetchCompetitionsOverview } from '@/services/api'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { getLocalizedCompetitionName } from '@/utils/localization'

export default function CompetitionsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { data: competitions, loading, error } = useData(fetchCompetitionsOverview, [])

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      <LoadingSkeleton rows={4} variant="card" />
    </div>
  )

  if (error) return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-16">
      <ErrorState title={t('common.errorTitle')} description={error} />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('nav.competition')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('common.season')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(competitions ?? []).map(comp => {
          const isUCL = comp.slug === 'champions-league'
          const stageText = comp.stage
            ? `${comp.stage.label} ${t(comp.stage.status === 'ongoing' ? 'standings.stageOngoing' : 'standings.stageCompleted')}`
            : null

          return (
            <div key={comp.slug} className="bg-card border border-border rounded-xl overflow-hidden hover:border-ring transition-colors">
              <Link
                to={`/competitions/${comp.slug}`}
                className="block p-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {getLocalizedCompetitionName(comp, locale)}
                  </h2>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                </div>
                <p className="text-xs text-muted-foreground">{comp.country}</p>
                {stageText && (
                  <p className="text-xs text-muted-foreground mt-1.5">{stageText}</p>
                )}
              </Link>

              {isUCL && (
                <div className="px-4 pb-3 border-t border-border/50 pt-2.5">
                  <Link
                    to="/competitions/champions-league/knockout"
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 w-fit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                  >
                    {t('competition.knockoutLink')}
                    <ChevronRight size={10} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
