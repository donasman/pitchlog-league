/**
 * 순위 /standings
 * 국내 리그 · UCL 리그 페이즈를 같은 레이아웃에서 전환한다.
 * 구역 표기: 좌측 2px 표시선 (solid/dash/dot/block 패턴) + 4% 배경 틴트 + 하단 범례.
 * 색을 빼도 구역이 구분되어야 한다 (PRD 완료 조건).
 *
 * 모바일: 순위·팀 고정 + 나머지 열 가로 스크롤 (MobileTable in StandingsTable)
 */

import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StandingsTable from '@/components/ui/StandingsTable'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { useData } from '@/hooks/useData'
import { fetchCompetitions, fetchStandings } from '@/services/api'
import { getLocalizedCompetitionName } from '@/utils/localization'
import { toKSTDateTime } from '@/utils/dateFormat'

export default function StandingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const competitionSlug = searchParams.get('competition') ?? 'premier-league'

  const { data: competitions, loading: loadingComps } = useData(fetchCompetitions, [])
  const { data: standings, loading: loadingStand, error } = useData(
    () => fetchStandings(competitionSlug).catch(() => null),
    [competitionSlug]
  )

  const loading = loadingComps || loadingStand
  const comp    = (competitions ?? []).find(c => c.slug === competitionSlug) ?? null
  const isUCL   = comp?.format === 'groups_knockout'

  function setComp(slug) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('competition', slug)
      return next
    }, { replace: true })
  }

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '20px 16px 48px',
        }}
        className="lg:px-8"
      >
        {/* ── 페이지 헤더 ── */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <h1 className="t-page" style={{ margin: 0, fontSize: 26 }}>
            {t('standings.title')}
          </h1>
          <span className="t-sub">2026-27 · 6{t('common.country')}</span>
        </div>

        {/* ── 대회 필터 칩 ── */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--pl-line)',
            paddingBottom: 14,
            marginBottom: 14,
          }}
        >
          <span className="t-cap" style={{ width: 44, flexShrink: 0 }}>{t('matches.filterComp')}</span>
          {(competitions ?? []).map(c => (
            <button
              key={c.slug}
              onClick={() => setComp(c.slug)}
              aria-pressed={c.slug === competitionSlug}
              className="pl-chip"
            >
              {getLocalizedCompetitionName(c, locale) || c.shortName}
            </button>
          ))}
          {competitions && (
            <span className="t-sub" style={{ marginLeft: 'auto' }}>
              {t('standings.leaguePhaseTitle').slice(0,1).toUpperCase() + t('standings.leaguePhaseTitle').slice(1)}
            </span>
          )}
        </div>

        {/* ── 스테이지 정보 + 데이터 기준 시각 ── */}
        {standings && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <span className="t-body" style={{ fontWeight: 600 }}>
              {standings.stage?.label}
              {standings.stage?.status && (
                <span className="t-sub" style={{ marginLeft: 6, fontWeight: 400 }}>
                  {t(standings.stage.status === 'ongoing' ? 'standings.stageOngoing' : 'standings.stageCompleted')}
                </span>
              )}
            </span>
            {isUCL && (
              <span className="t-sub">{t('standings.uclLeagueNote')}</span>
            )}
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="t-cap num" style={{ color: 'var(--pl-sub)' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" style={{ display: 'inline', marginRight: 4 }}>
                  <circle cx="6" cy="6" r="4.6" /><path d="M6 3.4V6l1.8 1.2" />
                </svg>
                {standings.updatedAt ? toKSTDateTime(standings.updatedAt, locale) : ''}
              </span>
              {comp && (
                <Link
                  to={`/competitions/${comp.slug}`}
                  className="pl-link"
                  style={{ fontSize: 12 }}
                >
                  {t('standings.hubLink')}
                </Link>
              )}
            </span>
          </div>
        )}

        {/* ── UCL 녹아웃 링크 ── */}
        {isUCL && !loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'color-mix(in srgb, var(--z-ucl) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--z-ucl) 30%, transparent)',
              marginBottom: 14,
            }}
          >
            <span
              style={{
                width: 3,
                height: 20,
                borderRadius: 2,
                background: 'var(--z-ucl)',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t-body" style={{ margin: 0, fontWeight: 600 }}>{t('standings.leaguePhaseTitle')}</p>
              <p className="t-sub" style={{ margin: 0 }}>{t('standings.leaguePhaseDesc')}</p>
            </div>
            <Link
              to="/competitions/champions-league/knockout"
              className="pl-btn pl-btn-sm pl-btn-ghost"
              style={{ flexShrink: 0 }}
            >
              {t('standings.leaguePhaseLink')}
            </Link>
          </div>
        )}

        {/* ── 모바일 스크롤 안내 ── */}
        <div
          className="md:hidden"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            background: 'var(--pl-fill)',
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--pl-sub)', flexShrink: 0 }} aria-hidden="true">
            <path d="M7 5 3 10l4 5M13 5l4 5-4 5" />
          </svg>
          <span className="t-cap">{t('standings.mobileHint')}</span>
        </div>

        {/* ── 로딩 ── */}
        {loading && (
          <div className="pl-card" style={{ padding: 16 }}>
            <LoadingSkeleton rows={12} />
          </div>
        )}

        {/* ── 오류 ── */}
        {!loading && error && (
          <ErrorState title={t('standings.errorTitle')} description={error} />
        )}

        {/* ── 순위표 ── */}
        {!loading && !error && (
          <div className="pl-card" style={{ overflow: 'hidden' }}>
            {standings?.entries?.length > 0 ? (
              <StandingsTable
                entries={standings.entries}
                competitionSlug={competitionSlug}
              />
            ) : (
              <EmptyState
                title={t('standings.noData')}
                description={t('standings.noDataDesc')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
