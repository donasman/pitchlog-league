/**
 * 경기 목록 (/matches)
 * 대회·상태 필터, 예정/LIVE/종료 구분
 * 데이터: services/api.js → fetchAllMatches, fetchCompetitions
 */

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { fetchAllMatches, fetchCompetitions } from '@/services/api'
import MatchCard from '@/components/ui/MatchCard'
import FilterBar from '@/components/ui/FilterBar'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { sortMatchesByKickoff } from '@/utils/matchSort'

export default function MatchesPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState('all')

  const competitionSlug = searchParams.get('competition') ?? 'all'

  const { data: allMatches, loading: loadingMatches, error: matchError } = useData(fetchAllMatches, [])
  const { data: competitions, loading: loadingComps } = useData(fetchCompetitions, [])

  const loading = loadingMatches || loadingComps

  const STATUS_OPTIONS = [
    { value: 'all',       label: t('matches.allStatuses') },
    { value: 'live',      label: 'LIVE' },
    { value: 'scheduled', label: t('match.scheduled') },
    { value: 'confirmed', label: t('match.finishedFilter') },
    { value: 'recheck',   label: t('match.recheck') },
  ]

  function setCompFilter(slug) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (slug === 'all') next.delete('competition')
      else next.set('competition', slug)
      return next
    })
  }

  const filtered = (allMatches ?? []).filter(m => {
    const compOk = competitionSlug === 'all' || m.competitionSlug === competitionSlug
    const stateOk = statusFilter === 'all' || m.displayState === statusFilter ||
      (statusFilter === 'confirmed' && ['confirmed', 'final'].includes(m.displayState))
    return compOk && stateOk
  })

  const sorted = sortMatchesByKickoff(filtered)

  const liveMatches      = sorted.filter(m => ['live', 'halftime'].includes(m.displayState))
  const scheduledMatches = sorted.filter(m => m.displayState === 'scheduled')
  const finishedMatches  = sorted.filter(m => ['confirmed', 'final', 'recheck', 'postponed', 'cancelled'].includes(m.displayState))

  const compOptions = [
    { value: 'all', label: t('matches.allCompetitions') },
    ...(competitions ?? []).map(c => ({ value: c.slug, label: c.shortName })),
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('matches.pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('common.season')}</p>
      </div>

      <div className="space-y-3">
        <FilterBar
          options={compOptions}
          value={competitionSlug}
          onChange={setCompFilter}
          label={t('matches.filterComp')}
        />
        <FilterBar
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          label={t('matches.filterStatus')}
        />
      </div>

      {loading && <LoadingSkeleton rows={6} />}

      {!loading && matchError && (
        <ErrorState description={matchError} />
      )}

      {!loading && !matchError && sorted.length === 0 && (
        <EmptyState
          title={t('matches.noMatches')}
          description={t('matches.noMatchesDesc')}
        />
      )}

      {!loading && !matchError && sorted.length > 0 && (
        <div className="space-y-6">
          {(statusFilter === 'all' || statusFilter === 'live') && liveMatches.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
                {t('match.inProgress')} ({liveMatches.length})
              </h2>
              <div className="space-y-2">
                {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {(statusFilter === 'all' || statusFilter === 'scheduled') && scheduledMatches.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('match.scheduled')} ({scheduledMatches.length})
              </h2>
              <div className="space-y-2">
                {scheduledMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {(statusFilter === 'all' || statusFilter === 'confirmed' || statusFilter === 'recheck') && finishedMatches.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('match.finished')} ({finishedMatches.length})
              </h2>
              <div className="space-y-2">
                {finishedMatches.map(m => <MatchCard key={m.id} match={m} compact />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
