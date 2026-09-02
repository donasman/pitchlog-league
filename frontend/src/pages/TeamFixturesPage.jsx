/**
 * 팀 전체 일정 (/teams/:slug/fixtures)
 * 데이터: services/api.js → fetchTeamFixtures
 */

import { useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MatchCard from '@/components/ui/MatchCard'
import FilterBar from '@/components/ui/FilterBar'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { fetchTeamFixtures } from '@/services/api'
import { getLocalizedName, getLocalizedCompetitionShortName } from '@/utils/localization'

export default function TeamFixturesPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const filterComp = searchParams.get('competition') ?? 'all'

  const { data, loading, error } = useData(() => fetchTeamFixtures(slug), [slug])

  function handleFilter(v) {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev)
      n.set('competition', v)
      return n
    })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <LoadingSkeleton rows={2} variant="text" />
        <LoadingSkeleton rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState title={t('team.fixtureErrorTitle')} description={error} />
      </div>
    )
  }

  if (!data) return null

  const { team, matches, competitions } = data

  const teamDisplayName = getLocalizedName({ id: team.id, name: team.name }, locale) || team.name

  const filterOptions = [
    { value: 'all', label: t('team.allCompetitions') },
    ...competitions.map(c => ({ value: c.slug, label: getLocalizedCompetitionShortName(c, locale) || c.shortName })),
  ]

  const filtered = filterComp === 'all'
    ? matches
    : matches.filter(m => m.competitionSlug === filterComp)

  const scheduled = filtered.filter(m => m.displayState === 'scheduled')
  const results   = filtered.filter(m => ['confirmed','recheck','final'].includes(m.displayState))
  const live      = filtered.filter(m => ['live','halftime'].includes(m.displayState))

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/teams/${slug}`}
          className="text-muted-foreground hover:text-foreground p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={t('team.backToTeam')}
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {teamDisplayName} — {t('team.fixtures')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('team.fixtureSubtitle')}</p>
        </div>
      </div>

      <FilterBar
        options={filterOptions}
        value={filterComp}
        onChange={handleFilter}
        label={t('team.filterLabel')}
      />

      {live.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-3">
            {t('team.live')}
          </h2>
          <div className="space-y-2">{live.map(m => <MatchCard key={m.id} match={m} />)}</div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('team.upcoming')}
          </h2>
          <div className="space-y-2">{scheduled.map(m => <MatchCard key={m.id} match={m} />)}</div>
        </section>
      )}

      {results.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('team.results')}
          </h2>
          <div className="space-y-2">{results.map(m => <MatchCard key={m.id} match={m} compact />)}</div>
        </section>
      )}

      {filtered.length === 0 && (
        <EmptyState description={t('team.noFixtures')} />
      )}
    </div>
  )
}
