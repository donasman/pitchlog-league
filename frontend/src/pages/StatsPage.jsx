/**
 * 통계 페이지 (/stats?competition=)
 * 대회별 득점 순위·도움 순위 표시.
 * 데이터: services/api.js → fetchCompetitionStats
 */

import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StatsRanking   from '@/components/ui/StatsRanking'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState      from '@/components/ui/ErrorState'
import EmptyState      from '@/components/ui/EmptyState'
import { useData }     from '@/hooks/useData'
import { fetchCompetitionStats } from '@/services/api'
import { getLocalizedCompetitionName } from '@/utils/localization'

const COMP_TABS = [
  { slug:'premier-league',  label:'EPL'    },
  { slug:'la-liga',         label:'LaLiga' },
  { slug:'bundesliga',      label:'BL'     },
  { slug:'serie-a',         label:'SA'     },
  { slug:'ligue-1',         label:'L1'     },
  { slug:'champions-league',label:'UCL'    },
]

const VALID_SLUGS = new Set(COMP_TABS.map(c => c.slug))

export default function StatsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [searchParams] = useSearchParams()

  const rawSlug = searchParams.get('competition') ?? 'premier-league'
  const slug    = VALID_SLUGS.has(rawSlug) ? rawSlug : 'premier-league'

  const { data, loading, error } = useData(
    () => fetchCompetitionStats(slug),
    [slug]
  )

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">

      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('stats.pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('common.season')}</p>
      </div>

      {/* 대회 선택 탭 */}
      <nav aria-label={t('header.competitionSelect')} className="flex gap-1.5 flex-wrap">
        {COMP_TABS.map(c => (
          <Link
            key={c.slug}
            to={`/stats?competition=${c.slug}`}
            aria-current={c.slug === slug ? 'page' : undefined}
            className={`px-3 py-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              c.slug === slug
                ? 'bg-primary text-primary-foreground font-medium'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {/* 로딩 */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <LoadingSkeleton rows={5} variant="row" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <LoadingSkeleton rows={5} variant="row" />
          </div>
        </div>
      )}

      {/* 오류 */}
      {!loading && error && (
        <ErrorState title={t('stats.errorTitle')} description={error} />
      )}

      {/* 데이터 */}
      {!loading && !error && data && (
        <>
          {/* 대회 이름 안내 */}
          <div className="flex items-center gap-2">
            <Link
              to={`/competitions/${slug}`}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              {getLocalizedCompetitionName(data.comp, locale)}
              <ChevronRight size={14} />
            </Link>
          </div>

          {data.topScorers.length === 0 && data.topAssisters.length === 0 ? (
            <EmptyState
              title={t('stats.noData')}
              description={t('stats.noDataDesc')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 득점 순위 */}
              <section>
                <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <StatsRanking
                    title={t('stats.topScorers')}
                    unit={t('stats.goals')}
                    entries={data.topScorers}
                  />
                </div>
              </section>

              {/* 도움 순위 */}
              <section>
                <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <StatsRanking
                    title={t('stats.topAssisters')}
                    unit={t('stats.assists')}
                    entries={data.topAssisters}
                  />
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}
