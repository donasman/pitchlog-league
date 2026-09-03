/**
 * 팀 상세 (/teams/:slug)
 * 데이터: services/api.js → fetchTeamDetail
 */

import { useParams, Link } from 'react-router-dom'
import { MapPin, Calendar, ChevronRight, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TeamBadge from '@/components/ui/TeamBadge'
import FormBadge from '@/components/ui/FormBadge'
import MatchCard from '@/components/ui/MatchCard'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { fetchTeamDetail } from '@/services/api'
import { getLocalizedName, getLocalizedCompetitionShortName } from '@/utils/localization'

export default function TeamPage() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { data, loading, error } = useData(() => fetchTeamDetail(slug), [slug])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <LoadingSkeleton rows={3} variant="text" />
        <LoadingSkeleton rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <ErrorState title={t('team.errorTitle')} description={error} />
      </div>
    )
  }

  if (!data) return null

  const { team, matches, eplRank, players, competitions } = data
  const upcoming = matches.filter(m => m.displayState === 'scheduled').slice(0, 2)
  const recent   = matches.filter(m => ['confirmed','recheck','final'].includes(m.displayState)).slice(0, 3)

  const teamDisplayName = getLocalizedName({ id: team.id, name: team.name }, locale) || team.name

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 48px' }} className="lg:px-8 space-y-5">
      {/* 팀 헤더 */}
      <div className="pl-card" style={{ padding: 'clamp(14px,3vw,24px)', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <TeamBadge initials={team.initials} color={team.color} size="lg" name={team.name} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{teamDisplayName}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" />{team.stadium}</span>
            <span>{t('team.founded')} {team.foundedYear}</span>
            <span>{t('team.manager')}: {team.manager}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {competitions.map(c => (
              <Link
                key={c.slug}
                to={`/competitions/${c.slug}`}
                className={`text-xs px-2 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  c.format === 'groups_knockout'
                    ? 'border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    : 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                }`}
              >
                {getLocalizedCompetitionShortName(c, locale) || c.shortName}
              </Link>
            ))}
          </div>
        </div>
        {eplRank && (
          <div className="text-center flex-shrink-0">
            <div className="text-4xl font-black text-foreground">{eplRank.rank}</div>
            <div className="text-xs text-muted-foreground">{t('team.eplRank')}</div>
            <div className="text-sm font-bold text-primary mt-1">
              {t('team.eplRankPoints', { pts: eplRank.points })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {eplRank && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('team.recentForm')}
              </h2>
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-2">
                {eplRank.form.map((r, i) => <FormBadge key={i} result={r} size="md" />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('team.upcomingMatches')}
              </h2>
              <div className="space-y-2">
                {upcoming.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('team.recentResults')}
                </h2>
                <Link
                  to={`/teams/${slug}/fixtures`}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                >
                  {t('team.viewAllFixtures')} <ChevronRight size={13} />
                </Link>
              </div>
              <div className="space-y-2">
                {recent.map(m => <MatchCard key={m.id} match={m} compact />)}
              </div>
            </section>
          )}
        </div>

        <aside>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t('team.squad')}
            </h2>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users size={12} />{players.length}
            </span>
          </div>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {players.length > 0 ? players.map(p => (
              <Link
                key={p.slug}
                to={`/players/${p.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{p.number}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                  { GK:'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300', DEF:'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', MID:'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', FWD:'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }[p.position]
                }`}>{p.position}</span>
                <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">{p.name}</span>
                <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">{p.nationality}</span>
              </Link>
            )) : (
              <div className="p-4"><EmptyState description={t('team.noSquad')} /></div>
            )}
          </div>

          <Link
            to={`/teams/${slug}/fixtures`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-card border border-border hover:bg-accent text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Calendar size={14} aria-hidden="true" />
            {t('team.viewAllFixtures')}
          </Link>
        </aside>
      </div>
    </div>
    </div>
  )
}
