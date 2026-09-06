/**
 * 팀 목록 /teams — 국내 리그별 그룹 + UCL 참가 표시
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <LoadingSkeleton rows={8} />
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 16px' }}>
      <ErrorState title={t('common.errorTitle')} description={error} />
    </div>
  )

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 48px' }} className="lg:px-8">

        <div style={{ marginBottom: 24 }}>
          <h1 className="t-page" style={{ margin: 0, fontSize: 26 }}>{t('nav.teams')}</h1>
          <span className="t-sub">2026-27</span>
        </div>

        <div style={{ display: 'grid', gap: 32 }}>
          {(groups ?? []).map(({ comp, teams }) => (
            <section key={comp.slug}>
              <h2
                className="t-cap"
                style={{ marginBottom: 12, letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {getLocalizedCompetitionName(comp, locale)}
                <span style={{ fontWeight: 400, opacity: 0.7 }}>{teams.length}</span>
              </h2>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}
                className="teams-grid"
              >
                <style>{`@media(min-width:480px){.teams-grid{grid-template-columns:repeat(3,1fr)!important}}@media(min-width:768px){.teams-grid{grid-template-columns:repeat(4,1fr)!important}}@media(min-width:1024px){.teams-grid{grid-template-columns:repeat(5,1fr)!important}}`}</style>
                {teams.map(team => {
                  const isUCL = team.competitions?.includes('champions-league')
                  const name  = getLocalizedName({ id: team.id, name: team.name }, locale) || team.name
                  return (
                    <Link
                      key={team.id}
                      to={`/teams/${team.slug}`}
                      className="pl-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 12,
                        textDecoration: 'none',
                        color: 'inherit',
                        minHeight: 56,
                      }}
                    >
                      <TeamBadge initials={team.initials} color={team.color} size="sm" name={team.name} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          className="tname t-body"
                          style={{ fontWeight: 600, display: 'block' }}
                          title={name}
                        >
                          {name}
                        </span>
                        {isUCL && (
                          <span className="t-cap" style={{ color: 'var(--z-ucl)' }}>
                            {t('standings.legend.ucl')}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
