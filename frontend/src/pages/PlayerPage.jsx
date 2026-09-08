/**
 * 선수 상세 (/players/:slug)
 * 데이터: services/api.js → fetchPlayerDetail
 *
 * 표시 판단은 정규화 계층(`services/normalize.js`)의 순수 함수 셋에 있다.
 * 이 페이지에는 표시 판단이 없다 — `formatStat` 로 셀을 그리고, 부분 합계는 `playerTotals` 로 만든다.
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
import { formatStat, playerTotals } from '@/services/normalize'
import { calcAge } from '@/utils/dateFormat'
import { getLocalizedName } from '@/utils/localization'

/**
 * 얇은 표시 셀. 값의 종류를 판단하지 않는다 — `formatStat` 결과가 '-' 이면
 * 흐리게 그리는 것만 한다. "값이 왜 '-' 인가" 는 정규화 계층의 책임이다.
 */
function Stat({ label, value }) {
  const isDash = value === '-'
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${isDash ? 'text-muted-foreground' : 'text-foreground'}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
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

  const { player, allStats, team, totals } = data
  const age = calcAge(player.dateOfBirth)

  // row.key 로 필터·목록 key 를 통일한다 — 조합 문자열을 컴포넌트에서 만들지 않는다
  const filtered = filterComp === 'all'
    ? allStats
    : allStats.filter(s => s.key === filterComp)

  const compOptions = [
    { value: 'all', label: t('player.filterAll') },
    ...allStats.map(s => ({
      value: s.key,
      label: `${s.seasonLabel} ${s.competitionName}${s.teamName ? ` · ${s.teamName}` : ''}`,
    })),
  ]

  // 전체 = 백엔드 dto.totals 신뢰. 부분 = playerTotals(filtered).
  const displayTotals = filterComp === 'all' ? totals : playerTotals(filtered)

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
            {age != null && (
              <>
                <span>·</span>
                <span>{t('player.age', { age })}</span>
              </>
            )}
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

      {/* 필터 요약 (선택 시 어느 조각을 보고 있는지) */}
      {filterComp !== 'all' && (
        <p className="text-xs text-muted-foreground">
          {compOptions.find(o => o.value === filterComp)?.label}
        </p>
      )}

      {/* 통계 그리드 — 전체(dto.totals) 또는 필터(playerTotals(filtered)) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label={t('player.appearances')} value={formatStat(displayTotals.appearances)} />
        <Stat label={t('player.goals')}       value={formatStat(displayTotals.goals)} />
        <Stat label={t('player.assists')}     value={formatStat(displayTotals.assists)} />
        <Stat label={t('player.yellowCards')} value={formatStat(displayTotals.yellowCards)} />
        <Stat label={t('player.redCards')}    value={formatStat(displayTotals.redCards)} />
      </div>

      {allStats.length === 0 && (
        <EmptyState description={t('player.noStats2627')} />
      )}

      {/* 대회별 상세 테이블 */}
      {allStats.length > 0 && (
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-border">
                <th className="text-left px-4 py-3">{t('header.season')}</th>
                <th className="text-left px-4 py-3">{t('matches.filterComp')}</th>
                <th className="text-center px-3 py-3">{t('player.appearances')}</th>
                <th className="text-center px-3 py-3">{t('player.starts')}</th>
                <th className="text-center px-3 py-3">{t('player.goals')}</th>
                <th className="text-center px-3 py-3">{t('player.assists')}</th>
                <th className="text-center px-3 py-3">{t('player.yellowCards')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.key} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.seasonLabel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.competitionName}{s.teamName ? ` · ${s.teamName}` : ''}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{formatStat(s.appearances)}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{formatStat(s.starts)}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{formatStat(s.goals)}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{formatStat(s.assists)}</td>
                  <td className="text-center px-3 py-3 text-muted-foreground">{formatStat(s.yellowCards)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div></div>
  )
}
