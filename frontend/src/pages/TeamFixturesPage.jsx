/**
 * 팀 전체 일정 /teams/:slug/fixtures
 * 대회 필터 + "오늘" 위치 표시 (과거·현재·미래를 한 흐름으로)
 */

import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MatchCard from '@/components/ui/MatchCard'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { useData } from '@/hooks/useData'
import { fetchTeamFixtures } from '@/services/api'
import { getLocalizedName, getLocalizedCompetitionShortName } from '@/utils/localization'
import { isLive } from '@/utils/matchStatus'

const MOCK_TODAY_KST = '2026-11-23'  // Mock 기준일 (경기 데이터 기준)

function getKSTDateKey(isoString) {
  return new Date(isoString).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

/* 오늘 구분선 */
function TodayDivider({ t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <span style={{ height: 2, flex: 1, background: 'var(--pl-primary)' }} />
      <span className="t-cap" style={{ color: 'var(--pl-primary)', fontWeight: 700, flexShrink: 0 }}>
        {t('team.todayDivider')}
      </span>
      <span style={{ height: 2, flex: 1, background: 'var(--pl-primary)' }} />
    </div>
  )
}

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
      if (v === 'all') n.delete('competition')
      else n.set('competition', v)
      return n
    }, { replace: true })
  }

  if (loading) return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>
      <LoadingSkeleton rows={8} />
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 16px' }}>
      <ErrorState title={t('team.fixtureErrorTitle')} description={error} />
    </div>
  )

  if (!data) return null

  const { team, matches, competitions } = data
  const teamName = getLocalizedName({ id: team.id, name: team.name }, locale) || team.name

  const compOptions = [
    { slug: 'all', label: t('team.allCompetitions') },
    ...(competitions ?? []).map(c => ({
      slug: c.slug,
      label: getLocalizedCompetitionShortName(c, locale) || c.shortName,
    })),
  ]

  const filtered = filterComp === 'all'
    ? matches
    : matches.filter(m => m.competitionSlug === filterComp)

  /* 날짜 순 정렬 */
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date))

  /* 오늘 기준으로 분리: 과거 / 오늘 / 미래 */
  const past    = sorted.filter(m => getKSTDateKey(m.date) < MOCK_TODAY_KST)
  const today   = sorted.filter(m => getKSTDateKey(m.date) === MOCK_TODAY_KST)
  const future  = sorted.filter(m => getKSTDateKey(m.date) > MOCK_TODAY_KST)

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '16px 16px 48px' }} className="lg:px-8">

        {/* 헤더 */}
        <div style={{ marginBottom: 16 }}>
          <Link to={`/teams/${slug}`} className="pl-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 44 }}>
            ← {teamName}
          </Link>
          <h1 className="t-page" style={{ margin: '4px 0 2px', fontSize: 22 }}>
            {teamName} — {t('team.fixtures')}
          </h1>
          <span className="t-sub">2026-27 · {t('team.allCompetitions')}</span>
        </div>

        {/* 대회 필터 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {compOptions.map(c => (
            <button
              key={c.slug}
              className="pl-chip"
              aria-pressed={filterComp === c.slug}
              onClick={() => handleFilter(c.slug)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {sorted.length === 0 && <EmptyState description={t('team.noFixtures')} />}

        {sorted.length > 0 && (
          <div className="pl-card" style={{ overflow: 'hidden' }}>

            {/* LIVE */}
            {today.filter(m => isLive(m.displayState)).map(m => (
              <div key={m.id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--pl-line)' }}>
                <MatchCard match={m} />
              </div>
            ))}

            {/* 과거 경기 */}
            {past.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, padding: 12 }}>
                {past.map(m => <MatchCard key={m.id} match={m} compact />)}
              </div>
            )}

            {/* 오늘 구분선 */}
            {(past.length > 0 || today.length > 0) && (future.length > 0 || today.filter(m => !isLive(m.displayState)).length > 0) && (
              <div style={{ padding: '0 12px' }}>
                <TodayDivider t={t} />
              </div>
            )}

            {/* 오늘 비-LIVE 경기 */}
            {today.filter(m => !isLive(m.displayState)).map(m => (
              <div key={m.id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--pl-line)', background: 'color-mix(in srgb, var(--pl-primary) 5%, transparent)' }}>
                <MatchCard match={m} />
              </div>
            ))}

            {/* 미래 경기 */}
            {future.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, padding: 12 }}>
                {future.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
