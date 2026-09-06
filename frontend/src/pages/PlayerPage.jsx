/**
 * 선수 상세 (/players/:slug)
 * 데이터: services/api.js → fetchPlayerDetail
 */

import { useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import TeamBadge from '@/components/ui/TeamBadge'
import FilterBar from '@/components/ui/FilterBar'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { fetchPlayerDetail } from '@/services/api'
import { calcAge } from '@/utils/dateFormat'
import { getLocalizedName } from '@/utils/localization'

function StatCell({ label, value, dataStatus }) {
  const { t } = useTranslation()
  const display = dataStatus === 'unavailable'
    ? <span className="text-muted-foreground text-xs">{t('player.statusUnavailable')}</span>
    : dataStatus === 'pending'
    ? <span className="text-amber-600 dark:text-amber-400 text-xs">{t('player.statusPending')}</span>
    : <span className="text-2xl font-bold text-foreground">{value}</span>

  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      {display}
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {dataStatus === 'pending' && <div className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">{t('player.statusRecheck')}</div>}
    </div>
  )
}

export default function PlayerPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterComp = searchParams.get('competition') ?? 'all'
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const { data, loading, error } = useData(() => fetchPlayerDetail(slug), [slug])

  function handleFilter(v) {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('competition', v); return n })
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <LoadingSkeleton rows={3} variant="text" />
        <LoadingSkeleton rows={5} variant="card" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '64px 16px' }}>
        <ErrorState title={t('player.errorTitle')} description={error} />
      </div>
    )
  }

  if (!data) return null

  const { player, allStats, team, calcTotalStats: calcTotal } = data
  const age = calcAge(player.dateOfBirth)

  const filtered = filterComp === 'all' ? allStats : allStats.filter(s => s.competitionId === filterComp)
  const totals   = calcTotal(allStats)

  const compOptions = [
    { value: 'all', label: t('player.filterAll') },
    ...allStats.map(s => ({ value: s.competitionId, label: s.competitionName })),
  ]

  const teamName = getLocalizedName({ id: team?.id, name: team?.name }, locale) || team?.name

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}><div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 48px' }} className="lg:px-8 space-y-5">
      {team && (
        <Link
          to={`/teams/${team.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
        >
          <ArrowLeft size={16} />
          {teamName}
        </Link>
      )}

      {/* 선수 헤더 */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-5">
        <PlayerAvatar name={player.name} position={player.position} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-4xl font-black text-muted-foreground">#{player.number}</span>
            <h1 className="text-2xl font-bold text-foreground truncate">{player.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{player.position}</span>
            <span>·</span>
            <span>{player.nationality}</span>
            <span>·</span>
            <span>{t('player.age', { age })}</span>
          </div>
          {team && (
            <Link to={`/teams/${team.slug}`} className="inline-flex items-center gap-2 mt-3 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded">
              <TeamBadge initials={team.initials} color={team.color} size="xs" name={team.name} />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{teamName}</span>
            </Link>
          )}
        </div>
      </div>

      {/* 대회 필터 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('player.seasonStats')}</h2>
        <FilterBar options={compOptions} value={filterComp} onChange={handleFilter} label={t('team.filterLabel')} />
      </div>

      {/* 통계 그리드 */}
      {filterComp === 'all' ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCell label={t('player.appearances')} value={totals.appearances} dataStatus="confirmed" />
          <StatCell label={t('player.goals')} value={totals.goals} dataStatus="confirmed" />
          <StatCell label={t('player.assists')} value={totals.assists} dataStatus="confirmed" />
          <StatCell label={t('player.yellowCards')} value={totals.yellowCards} dataStatus="confirmed" />
          <StatCell label={t('player.redCards')} value={totals.redCards} dataStatus="confirmed" />
        </div>
      ) : (
        filtered.map(s => (
          <div key={s.competitionId}>
            <p className="text-xs text-muted-foreground mb-3">{s.competitionName}</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCell label={t('player.appearances')} value={s.appearances} dataStatus={s.dataStatus} />
              <StatCell label={t('player.goals')} value={s.goals} dataStatus={s.dataStatus} />
              <StatCell label={t('player.assists')} value={s.assists} dataStatus={s.dataStatus} />
              <StatCell label={t('player.yellowCards')} value={s.yellowCards} dataStatus={s.dataStatus} />
              <StatCell label={t('player.redCards')} value={s.redCards} dataStatus={s.dataStatus} />
            </div>
          </div>
        ))
      )}

      {allStats.length === 0 && (
        <EmptyState description={t('player.noStats2627')} />
      )}

      {/* 대회별 상세 테이블 */}
      {allStats.length > 0 && (
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-border">
                <th className="text-left px-4 py-3">{t('competition.tabs.schedule')}</th>
                <th className="text-center px-3 py-3">{t('player.appearances')}</th>
                <th className="text-center px-3 py-3">{t('player.starts')}</th>
                <th className="text-center px-3 py-3">{t('player.goals')}</th>
                <th className="text-center px-3 py-3">{t('player.assists')}</th>
                <th className="text-center px-3 py-3">{t('player.yellowCards')}</th>
                <th className="text-center px-3 py-3">{t('standings.zone')}</th>
              </tr>
            </thead>
            <tbody>
              {allStats.map(s => (
                <tr key={s.competitionId} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.competitionName}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{s.appearances}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{s.starts}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{s.goals}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{s.assists}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{s.yellowCards}</td>
                  <td className="text-center px-3 py-3">
                    {s.dataStatus === 'confirmed'   && <span className="text-xs text-primary">{t('player.statusConfirmed')}</span>}
                    {s.dataStatus === 'pending'     && <span className="text-xs text-amber-600 dark:text-amber-400">{t('player.statusPending')}</span>}
                    {s.dataStatus === 'unavailable' && <span className="text-xs text-muted-foreground">{t('player.statusUnavailable')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div></div>
  )
}
