/**
 * 대회 허브 /competitions/:slug
 * 국내 리그와 UCL이 같은 레이아웃 — 구역 규칙만 다르다
 * 탭: 일정 · 순위 · 통계
 */

import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import MatchCard from '@/components/ui/MatchCard'
import StandingsTable from '@/components/ui/StandingsTable'
import StatsRanking from '@/components/ui/StatsRanking'
import TeamBadge from '@/components/ui/TeamBadge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { fetchCompetitionHub } from '@/services/api'
import { getLocalizedCompetitionName } from '@/utils/localization'

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

  if (loading) return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <LoadingSkeleton rows={6} />
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 16px' }}>
      <ErrorState title={t('competition.errorTitle')} description={error} />
    </div>
  )

  if (!data) return null

  const { comp, matches, standings, teams, topScorers, topAssisters } = data
  const isUCL = comp.format === 'groups_knockout'

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 48px' }} className="lg:px-8">

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <span
            className="pl-emblem"
            style={{ width: 52, height: 52, fontSize: 14, fontWeight: 700, flexShrink: 0, borderRadius: 12 }}
          >
            {comp.initials}
          </span>
          <div style={{ display: 'grid', minWidth: 0, flex: 1 }}>
            <h1 className="t-page" style={{ margin: 0, fontSize: 24 }}>{getLocalizedCompetitionName(comp, locale)}</h1>
            <span className="t-sub">
              2026-27 · {comp.country}
              {standings?.stage && (
                <span style={{ marginLeft: 8 }}>
                  · {standings.stage.label}
                  <span style={{ marginLeft: 4, color: 'var(--pl-sub)' }}>
                    {t(standings.stage.status === 'ongoing' ? 'standings.stageOngoing' : 'standings.stageCompleted')}
                  </span>
                </span>
              )}
            </span>
          </div>
          {isUCL && (
            <Link to="/competitions/champions-league/knockout" className="pl-btn pl-btn-sm pl-btn-ghost">
              {t('competition.knockoutLink')}
            </Link>
          )}
        </div>

        {/* 탭 바 */}
        <div
          className="pl-card"
          style={{ display: 'flex', overflow: 'hidden', marginBottom: 16 }}
          role="tablist"
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minHeight: 44,
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'var(--pl-text)' : 'var(--pl-sub)',
                boxShadow: activeTab === tab.id ? 'inset 0 -2px 0 var(--pl-primary)' : 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* 일정 탭 */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="comp-sched-grid">
            <style>{`@media(min-width:768px){.comp-sched-grid{grid-template-columns:1fr 280px!important}}`}</style>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 className="t-card" style={{ margin: 0 }}>{t('competition.mainMatches')}</h2>
                <Link to={`/matches?competition=${slug}`} className="pl-link" style={{ marginLeft: 'auto', fontSize: 12 }}>
                  {t('competition.allMatches')}
                </Link>
              </div>
              {matches.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                  {matches.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              ) : (
                <EmptyState description={t('competition.noMatches')} />
              )}
            </div>

            <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
              <h2 className="t-card" style={{ margin: 0 }}>{t('competition.teams')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {teams.slice(0, 12).map(team => (
                  <Link
                    key={team.slug}
                    to={`/teams/${team.slug}`}
                    className="pl-card"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', textDecoration: 'none', color: 'inherit', minHeight: 44 }}
                  >
                    <TeamBadge initials={team.initials} color={team.color} size="xs" name={team.name} />
                    <span className="tname t-sub" style={{ color: 'var(--pl-text)', fontWeight: 600 }}>{team.shortName}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 순위 탭 */}
        {activeTab === 'standings' && (
          <div className="pl-card" style={{ overflow: 'hidden' }}>
            {standings ? (
              <StandingsTable entries={standings.entries} competitionSlug={slug} />
            ) : (
              <EmptyState description={t('competition.noStandings')} />
            )}
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="comp-stats-grid">
            <style>{`@media(min-width:640px){.comp-stats-grid{grid-template-columns:1fr 1fr!important}}`}</style>
            <div className="pl-card" style={{ padding: 16 }}>
              <StatsRanking title={t('competition.topScorers')} unit={t('stats.goals')} entries={topScorers} />
            </div>
            <div className="pl-card" style={{ padding: 16 }}>
              <StatsRanking title={t('competition.topAssisters')} unit={t('stats.assists')} entries={topAssisters} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
