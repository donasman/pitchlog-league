/**
 * 통계 /stats?competition=<slug>
 * 하이브리드 필터: 상단 chip 6개(EPL·라리가·분데스·SA·L1·UCL, displayOrder<=60) +
 * "더 보기 ▼" 드롭다운 (컵·슈퍼컵·UEL·UECL 등, displayOrder>60).
 * URL 에 competition 이 없으면 즉시 premier-league 로 replace.
 * 각 순위 리스트에 coverage 뱃지와 행별 apps/min 서브라인.
 */

import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { useData } from '@/hooks/useData'
import { fetchCompetitionStats, fetchCompetitionsForStats } from '@/services/api'
import { getLocalizedCompetitionName, getLocalizedName } from '@/utils/localization'

/* ── coverage 뱃지 ── */
function CoverageBadge({ coverage, t }) {
  if (!coverage) return null
  const ratio = Math.round((coverage.ratio ?? 0) * 100)
  return (
    <span className="pl-badge">
      {t('stats.coverageLabel')} · {coverage.collected}/{coverage.finished} · {ratio}%
    </span>
  )
}

/* ── 득점/도움 행 ── */
// StatsRanking.jsx 와 같은 규칙: playerSlug 가 있을 때만 /players/<slug> 로 이동 가능한 Link, 없으면 div.
// 스타일(grid 레이아웃) 은 유지 · 밑줄 없음 · 색 상속.
function StatRow({ rank, player, value, unit, locale, t }) {
  const name = getLocalizedName({ id: player.playerSlug, name: player.playerName }, locale) || player.playerName
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '28px 1fr auto',
    gap: 10,
    alignItems: 'center',
    padding: '10px 16px',
    borderTop: '1px solid var(--pl-line)',
  }
  const inner = (
    <>
      <span className="num t-sub" style={{ fontWeight: 700 }}>{rank}</span>
      <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
        <span
          className="t-body"
          style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {name}
          <span className="t-cap" style={{ marginLeft: 6, color: 'var(--pl-sub)' }}>
            {player.teamName}
          </span>
        </span>
        {(player.appearances != null || player.minutes != null) && (
          <span className="t-cap num" style={{ color: 'var(--pl-sub)' }}>
            {t('stats.appearances')} {player.appearances ?? '-'} · {t('stats.minutes')} {player.minutes ?? '-'}
          </span>
        )}
      </span>
      <span className="num t-body" style={{ fontWeight: 700, flexShrink: 0 }}>
        {value}{unit}
      </span>
    </>
  )
  if (player.playerSlug) {
    return (
      <Link
        to={`/players/${player.playerSlug}`}
        style={{ ...rowStyle, textDecoration: 'none', color: 'inherit' }}
      >
        {inner}
      </Link>
    )
  }
  return <div style={rowStyle}>{inner}</div>
}

/* ── 대회별 패널 ── */
function CompStatsPanel({ data, comp, t, locale }) {
  if (!data) return null
  const coverage = data.coverage ?? null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="stats-comp-grid">
      <style>{`@media(min-width:768px){.stats-comp-grid{grid-template-columns:1fr 1fr!important}}`}</style>

      {/* 득점 */}
      <div className="pl-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--pl-line)', flexWrap: 'wrap' }}>
          <span className="t-card" style={{ flex: 1 }}>{t('stats.topScorers')}</span>
          <CoverageBadge coverage={coverage} t={t} />
          {comp && (
            <Link to={`/competitions/${comp.slug}`} className="pl-link" style={{ fontSize: 12 }}>
              {getLocalizedCompetitionName(comp, locale)}
            </Link>
          )}
        </div>
        {(data.topScorers ?? []).length === 0
          ? <EmptyState title={t('stats.noData')} description={t('stats.noDataDesc')} />
          : (data.topScorers ?? []).map((p, i) => (
            <StatRow
              key={p.playerSlug ?? i}
              rank={p.rank ?? i + 1}
              player={p}
              value={p.value}
              unit={t('stats.goals')}
              locale={locale}
              t={t}
            />
          ))
        }
      </div>

      {/* 도움 */}
      <div className="pl-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--pl-line)', flexWrap: 'wrap' }}>
          <span className="t-card" style={{ flex: 1 }}>{t('stats.topAssisters')}</span>
          <CoverageBadge coverage={coverage} t={t} />
        </div>
        {(data.topAssisters ?? []).length === 0
          ? <EmptyState title={t('stats.noData')} description={t('stats.noDataDesc')} />
          : (data.topAssisters ?? []).map((p, i) => (
            <StatRow
              key={p.playerSlug ?? i}
              rank={p.rank ?? i + 1}
              player={p}
              value={p.value}
              unit={t('stats.assists')}
              locale={locale}
              t={t}
            />
          ))
        }
      </div>
    </div>
  )
}

/* ── 대회 필터 (chip 6 + 드롭다운) ── */
function CompetitionFilter({ competitions, slug, onChange, t, locale }) {
  const top = (competitions ?? []).filter(c => (c.displayOrder ?? 0) <= 60)
  const rest = (competitions ?? []).filter(c => (c.displayOrder ?? 0) > 60)

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--pl-line)', paddingBottom: 14, marginBottom: 14 }}>
      <span className="t-cap" style={{ flexShrink: 0 }}>{t('stats.filterCompLabel')}</span>
      {top.map(c => (
        <button
          key={c.slug}
          type="button"
          className="pl-chip"
          aria-pressed={slug === c.slug}
          onClick={() => onChange(c.slug)}
        >
          {c.shortName ?? getLocalizedCompetitionName(c, locale)}
        </button>
      ))}
      {rest.length > 0 && (
        <select
          value={rest.some(c => c.slug === slug) ? slug : ''}
          onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
          className="pl-chip"
          style={{ marginLeft: 'auto' }}
          aria-label={t('stats.filterCompLabel')}
        >
          <option value="">{t('home.openAll')} ▼</option>
          {rest.map(c => (
            <option key={c.slug} value={c.slug}>
              {getLocalizedCompetitionName(c, locale)}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

/* ── StatsPage ── */
export default function StatsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [searchParams, setSearchParams] = useSearchParams()
  const slug = searchParams.get('competition')

  // URL 에 competition 이 없으면 즉시 premier-league 로 replace — 뒤로가기 무한 루프 방지.
  useEffect(() => {
    if (!slug) {
      setSearchParams({ competition: 'premier-league' }, { replace: true })
    }
  }, [slug, setSearchParams])

  const { data: competitions } = useData(fetchCompetitionsForStats, [])

  const { data: compData, loading, error } = useData(
    () => slug ? fetchCompetitionStats(slug) : Promise.resolve(null),
    [slug]
  )

  function setSlug(s) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('competition', s)
      return next
    }, { replace: true })
  }

  const comp = compData?.comp ?? null
  // season 라벨은 comp.currentSeason 폴백 — fetchCompetitionStats 는 season 을 반환에 넣지 않았다.
  const seasonLabel = comp?.currentSeason ?? ''

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 48px' }} className="lg:px-8">

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <h1 className="t-page" style={{ margin: 0, fontSize: 26 }}>{t('stats.pageTitle')}</h1>
          {seasonLabel && <span className="t-sub">{seasonLabel}</span>}
        </div>

        {/* 대회 필터 */}
        <CompetitionFilter
          competitions={competitions}
          slug={slug}
          onChange={setSlug}
          t={t}
          locale={locale}
        />

        {/* 로딩 — slug 없으면(리다이렉트 대기) 스켈레톤 유지 */}
        {(!slug || loading) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="pl-card" style={{ padding: 16 }}><LoadingSkeleton rows={8} /></div>
            <div className="pl-card" style={{ padding: 16 }}><LoadingSkeleton rows={8} /></div>
          </div>
        )}

        {/* 오류 */}
        {slug && !loading && error && <ErrorState title={t('stats.errorTitle')} description={error} />}

        {/* 데이터 */}
        {slug && !loading && !error && (
          <CompStatsPanel data={compData} comp={comp} t={t} locale={locale} />
        )}
      </div>
    </div>
  )
}
