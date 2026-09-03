/**
 * 통계 /stats?competition=
 * 전체 합산 선택 시 대회별 분해 표기 (12골 = EPL 9 + UCL 3)
 * 대회별 선택 시 해당 대회 득점·도움 순위
 */

import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { useData } from '@/hooks/useData'
import { fetchCompetitionStats, fetchAllStats } from '@/services/api'
import { getLocalizedCompetitionName, getLocalizedName } from '@/utils/localization'

const COMP_TABS = [
  { slug: 'all',             label: null },   // 전체 합산 — label은 i18n
  { slug: 'premier-league',  label: 'EPL'    },
  { slug: 'la-liga',         label: 'LaLiga' },
  { slug: 'bundesliga',      label: 'BL'     },
  { slug: 'serie-a',         label: 'SA'     },
  { slug: 'ligue-1',         label: 'L1'     },
  { slug: 'champions-league',label: 'UCL'    },
]

/* ── 대회별 분해 포맷 ── */
function Breakdown({ breakdown }) {
  if (!breakdown || !Object.keys(breakdown).length) return null
  const parts = Object.entries(breakdown).map(([k, v]) => `${k} ${v}`).join(' + ')
  return <span className="t-cap num" style={{ color: 'var(--pl-sub)' }}>{parts}</span>
}

/* ── 득점/도움 테이블 행 ── */
function StatRow({ rank, player, value, unit, breakdown, locale }) {
  const name = getLocalizedName({ id: player.playerSlug, name: player.playerName }, locale) || player.playerName
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr auto',
        gap: 10,
        alignItems: 'center',
        padding: '0 16px',
        minHeight: 52,
        borderTop: '1px solid var(--pl-line)',
      }}
    >
      <span className="num t-sub" style={{ fontWeight: 700 }}>{rank}</span>
      <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
        <span className="t-body" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
          <span className="t-cap" style={{ marginLeft: 6, color: 'var(--pl-sub)' }}>
            {player.teamName}
          </span>
        </span>
        {breakdown && <Breakdown breakdown={breakdown} />}
      </span>
      <span className="num t-body" style={{ fontWeight: 700, flexShrink: 0 }}>
        {value}{unit}
      </span>
    </div>
  )
}

/* ── 전체 합산 패널 ── */
function AllStatsPanel({ data, t, locale }) {
  if (!data) return null
  const scorers  = data.topScorers ?? []
  const assisters = data.topAssisters ?? []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="stats-all-grid">
      <style>{`@media(min-width:768px){.stats-all-grid{grid-template-columns:1.3fr 1fr!important}}`}</style>

      {/* 득점 */}
      <div className="pl-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--pl-line)' }}>
          <span className="t-card" style={{ flex: 1 }}>{t('stats.topScorers')}</span>
          <span className="t-cap" style={{ color: 'var(--pl-sub)' }}>{t('stats.allDesc')}</span>
        </div>
        {scorers.length === 0
          ? <EmptyState />
          : scorers.map((p, i) => (
            <StatRow
              key={p.playerSlug}
              rank={p.rank ?? i + 1}
              player={p}
              value={p.value}
              unit={t('stats.goals')}
              breakdown={p.breakdown?.reduce((acc, b) => ({ ...acc, [b.competition]: b.goals }), {})}
              locale={locale}
            />
          ))
        }
      </div>

      {/* 도움 */}
      <div className="pl-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--pl-line)' }}>
          <span className="t-card">{t('stats.topAssisters')}</span>
        </div>
        {assisters.length === 0
          ? <EmptyState />
          : assisters.map((p, i) => (
            <StatRow
              key={p.playerSlug ?? i}
              rank={i + 1}
              player={p}
              value={p.value}
              unit={t('stats.assists')}
              locale={locale}
            />
          ))
        }
      </div>
    </div>
  )
}

/* ── 대회별 패널 ── */
function CompStatsPanel({ data, comp, t, locale }) {
  if (!data) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="stats-comp-grid">
      <style>{`@media(min-width:768px){.stats-comp-grid{grid-template-columns:1fr 1fr!important}}`}</style>

      <div className="pl-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--pl-line)' }}>
          <span className="t-card" style={{ flex: 1 }}>{t('stats.topScorers')}</span>
          {comp && (
            <Link to={`/competitions/${comp.slug}`} className="pl-link" style={{ fontSize: 12 }}>
              {getLocalizedCompetitionName(comp, locale)}
            </Link>
          )}
        </div>
        {(data.topScorers ?? []).length === 0
          ? <EmptyState title={t('stats.noData')} description={t('stats.noDataDesc')} />
          : (data.topScorers ?? []).map((p, i) => (
            <StatRow key={p.playerSlug ?? i} rank={i + 1} player={p} value={p.value} unit={t('stats.goals')} locale={locale} />
          ))
        }
      </div>

      <div className="pl-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--pl-line)' }}>
          <span className="t-card">{t('stats.topAssisters')}</span>
        </div>
        {(data.topAssisters ?? []).length === 0
          ? <EmptyState title={t('stats.noData')} description={t('stats.noDataDesc')} />
          : (data.topAssisters ?? []).map((p, i) => (
            <StatRow key={p.playerSlug ?? i} rank={i + 1} player={p} value={p.value} unit={t('stats.assists')} locale={locale} />
          ))
        }
      </div>
    </div>
  )
}

/* ── StatsPage ── */
export default function StatsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [searchParams, setSearchParams] = useSearchParams()
  const slug = searchParams.get('competition') ?? 'all'

  const isAll = slug === 'all'

  const { data: allData, loading: loadingAll, error: errorAll } = useData(
    fetchAllStats,
    []
  )
  const { data: compData, loading: loadingComp, error: errorComp } = useData(
    () => isAll ? Promise.resolve(null) : fetchCompetitionStats(slug),
    [slug, isAll]
  )

  const loading = isAll ? loadingAll : loadingComp
  const error   = isAll ? errorAll  : errorComp

  function setSlug(s) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (s === 'all') next.delete('competition')
      else next.set('competition', s)
      return next
    }, { replace: true })
  }

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 48px' }} className="lg:px-8">

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <h1 className="t-page" style={{ margin: 0, fontSize: 26 }}>{t('stats.pageTitle')}</h1>
          <span className="t-sub">2026-27</span>
        </div>

        {/* 대회 필터 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--pl-line)', paddingBottom: 14, marginBottom: 14 }}>
          <span className="t-cap" style={{ width: 44, flexShrink: 0 }}>{t('matches.filterComp')}</span>
          {COMP_TABS.map(c => (
            <button
              key={c.slug}
              className="pl-chip"
              aria-pressed={slug === c.slug}
              onClick={() => setSlug(c.slug)}
            >
              {c.slug === 'all' ? t('stats.allLeagues') : c.label}
            </button>
          ))}
          {isAll && (
            <span className="t-sub" style={{ marginLeft: 'auto' }}>{t('stats.allDesc')}</span>
          )}
        </div>

        {/* 로딩 */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="pl-card" style={{ padding: 16 }}><LoadingSkeleton rows={8} /></div>
            <div className="pl-card" style={{ padding: 16 }}><LoadingSkeleton rows={8} /></div>
          </div>
        )}

        {/* 오류 */}
        {!loading && error && <ErrorState title={t('stats.errorTitle')} description={error} />}

        {/* 데이터 */}
        {!loading && !error && (
          isAll
            ? <AllStatsPanel data={allData} t={t} locale={locale} />
            : <CompStatsPanel data={compData} comp={compData?.comp} t={t} locale={locale} />
        )}
      </div>
    </div>
  )
}
