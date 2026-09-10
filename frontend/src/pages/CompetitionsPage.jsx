/**
 * 대회 목록 /competitions
 * 6개 대회를 3×2 그리드로 표시 — HomePage CompetitionCard와 같은 형태
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { fetchCompetitionsOverview } from '@/services/api'
import TeamBadge from '@/components/ui/TeamBadge'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { getLocalizedCompetitionName } from '@/utils/localization'

/**
 * CompetitionEmblem — 대회 로고, 없으면 shortName 텍스트 폴백.
 * HomePage 것과 같은 규칙이지만 파일 간 컴포넌트 공유 대신 각 페이지에 두는 것이
 * 지금 골든 룰이다 (프로젝트에 공용 CompetitionBadge 자리가 아직 없음 — 다음 판).
 */
function CompetitionEmblem({ comp }) {
  const [failed, setFailed] = useState(false)
  const showImg = comp.logoUrl && !failed
  return (
    <span
      className="pl-emblem"
      style={{
        width: 36,
        height: 36,
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
        borderRadius: 8,
        background: showImg ? 'transparent' : undefined,
      }}
    >
      {showImg ? (
        <img
          src={comp.logoUrl}
          alt={comp.name ?? comp.shortName}
          width={36}
          height={36}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: 36, height: 36, objectFit: 'contain' }}
        />
      ) : (
        comp.shortName
      )}
    </span>
  )
}

export default function CompetitionsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { data: competitions, loading, error } = useData(fetchCompetitionsOverview, [])

  if (loading) return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <LoadingSkeleton rows={3} variant="card" />
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '64px 16px' }}>
      <ErrorState title={t('common.errorTitle')} description={error} />
    </div>
  )

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 48px' }} className="lg:px-8">

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
          <h1 className="t-page" style={{ margin: 0, fontSize: 26 }}>{t('nav.competition')}</h1>
          <span className="t-sub">{(competitions ?? []).length}{(competitions ?? []).find(c => c.currentSeason)?.currentSeason ? ` · ${(competitions ?? []).find(c => c.currentSeason).currentSeason}` : ''}</span>
        </div>

        {/* minmax(0, 1fr) — /teams 와 같은 min-content 하한 버그 방어 · CompetitionCard 안 긴 대회명이 트랙을 밀지 않게 */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}
          className="comp-list-grid"
        >
          <style>{`@media(min-width:640px){.comp-list-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}`}</style>

          {(competitions ?? []).map(comp => {
            const liveCount     = comp.liveCount ?? 0
            const upcomingCount = comp.upcomingCount ?? 0
            const isUCL         = comp.slug === 'champions-league'

            return (
              <Link
                key={comp.slug}
                to={`/competitions/${comp.slug}`}
                className="pl-card"
                style={{ display: 'grid', gap: 12, padding: 16, textDecoration: 'none', color: 'inherit' }}
              >
                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CompetitionEmblem comp={comp} />
                  <div style={{ display: 'grid', minWidth: 0, flex: 1 }}>
                    <span className="t-card tname" style={{ fontWeight: 600 }} title={getLocalizedCompetitionName(comp, locale)}>
                      {getLocalizedCompetitionName(comp, locale)}
                    </span>
                    <span className="t-cap">{comp.country}</span>
                  </div>
                  <span style={{ flexShrink: 0 }}>
                    {liveCount > 0 ? (
                      <span className="pl-badge b-live">
                        <span className="pl-dot pl-dot-pulse" aria-hidden="true" />
                        LIVE {liveCount}
                      </span>
                    ) : upcomingCount > 0 ? (
                      <span className="pl-badge b-sched">{upcomingCount}</span>
                    ) : null}
                  </span>
                </div>

                {/* 라운드 — 긴 문자열 방어 · 트랙 좁아지면 말줄임 */}
                <span className="t-sub tname" title={comp.stage?.label ?? ''}>{comp.stage?.label}</span>

                {/* 선두 */}
                {comp.leader && (
                  <div style={{ borderTop: '1px solid var(--pl-line)', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="t-cap">{t('home.leaderLabel')}</span>
                    <TeamBadge initials={comp.leader.teamInitials} color={comp.leader.teamColor} logoUrl={comp.leader.teamLogoUrl} size="xs" name={comp.leader.teamName} />
                    <span className="tname t-body" style={{ fontWeight: 600, flex: 1 }} title={comp.leader.teamName}>{comp.leader.teamName}</span>
                    {comp.leader.points != null && (
                      <span className="num t-body" style={{ fontWeight: 700, flexShrink: 0 }}>
                        {t('home.ptsUnit', { pts: comp.leader.points })}
                      </span>
                    )}
                  </div>
                )}

                {/* UCL 녹아웃 링크 */}
                {isUCL && (
                  <span className="pl-link" style={{ fontSize: 12 }}>
                    {t('standings.leaguePhaseLink')} →
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
