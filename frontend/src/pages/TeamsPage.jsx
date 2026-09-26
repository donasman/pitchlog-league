/**
 * 팀 목록 /teams — 국내 리그별 그룹 + UCL 참가 표시
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { fetchTeamsByLeague } from '@/services/api'
import TeamBadge from '@/components/ui/TeamBadge'
import FavoriteToggle from '@/components/ui/FavoriteToggle'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import HScroller from '@/components/ui/HScroller'
import { getLocalizedName, getLocalizedCompetitionName } from '@/utils/localization'

export default function TeamsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { data: groups, loading, error } = useData(fetchTeamsByLeague, [])

  if (loading) return (
    <div className="pl-container" style={{ paddingBlock: '24px' }}>
      <LoadingSkeleton rows={8} />
    </div>
  )

  if (error) return (
    <div className="pl-container" style={{ paddingBlock: '64px' }}>
      <ErrorState title={t('common.errorTitle')} description={error} />
    </div>
  )

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: 'var(--pl-page-min-h)' }}>
      <div style={{ paddingBlock: '20px 48px' }} className="pl-container">

        <div style={{ marginBottom: 24 }}>
          <h1 className="t-page" style={{ margin: 0, fontSize: 26 }}>{t('nav.teams')}</h1>
          {(groups ?? []).find(g => g.comp?.currentSeason)?.comp.currentSeason && (
            <span className="t-sub">{(groups ?? []).find(g => g.comp?.currentSeason).comp.currentSeason}</span>
          )}
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
              <HScroller
                rows={2}
                gap={10}
                ariaLabel={`${getLocalizedCompetitionName(comp, locale)} — ${t('nav.teams')}`}
              >
                {teams.map(team => {
                  const isUCL = team.competitions?.includes('champions-league')
                  const name  = getLocalizedName({ id: team.id, name: team.name }, locale) || team.name
                  return (
                    <Link
                      key={team.id}
                      to={`/teams/${team.slug}`}
                      className="pl-card"
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 12,
                        textDecoration: 'none',
                        color: 'inherit',
                        minHeight: 56,
                      }}
                    >
                      <TeamBadge
                        initials={team.initials}
                        color={team.color}
                        logoUrl={team.logoUrl}
                        size="sm"
                        name={team.name}
                        loading="eager"
                      />
                      <div style={{ minWidth: 0, flex: 1, paddingRight: 32 }}>
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
                      <span style={{ position: 'absolute', top: 8, right: 8 }}>
                        <FavoriteToggle slug={team.slug} label={name} size="sm" />
                      </span>
                    </Link>
                  )
                })}
              </HScroller>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
