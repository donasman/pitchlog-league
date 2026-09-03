/**
 * 경기 탭 /matches — 3열 레이아웃
 * 좌: 대회·상태 필터 레일 (lg+)
 * 중: LIVE 히어로 + 날짜별 경기 그룹
 * 우: 미니 순위표 (lg+)
 *
 * 필터 조합(competition, status)은 URL에 보존된다.
 * 모바일(<1024px): 필터 칩 가로 스크롤 + 1열 목록
 */

import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { fetchAllMatches, fetchCompetitions, fetchStandings } from '@/services/api'
import MatchCard from '@/components/ui/MatchCard'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import StandingsTable from '@/components/ui/StandingsTable'
import LiveHeroCard from '@/components/home/LiveHeroCard'
import { isLive } from '@/utils/matchStatus'
import { getLocalizedCompetitionName } from '@/utils/localization'

/* ── 상수 ── */
const MOCK_TODAY = '2026-11-23'   // Mock 기준일 (Live 경기 날짜)

const STATUS_GROUPS = {
  live:      ['live', 'halftime'],
  scheduled: ['scheduled'],
  finished:  ['confirmed', 'final', 'recheck', 'postponed', 'cancelled'],
}

/* ── 날짜 유틸 ── */
function getKSTDateKey(isoString) {
  return new Date(isoString).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

/* ── 경기 날짜별 그룹화 ── */
function groupByDate(matches) {
  const map = {}
  for (const m of matches) {
    const key = getKSTDateKey(m.date)
    if (!map[key]) map[key] = { key, firstIso: m.date, matches: [] }
    map[key].matches.push(m)
  }
  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key))
}

/* ─────────────────────────────────────────────────────────────
   CompFilterRail — 좌측 필터 패널 (lg 이상)
───────────────────────────────────────────────────────────── */
function CompFilterRail({ competitions, activeComp, activeStatus, onCompChange, onStatusChange, t, locale }) {
  const compOptions = [
    { slug: 'all', label: t('matches.allCompetitions'), initials: 'ALL' },
    ...(competitions ?? []).map(c => ({ slug: c.slug, label: getLocalizedCompetitionName(c, locale), initials: c.shortName })),
  ]

  const statusOptions = [
    { value: 'all',       label: t('matches.allStatuses') },
    { value: 'live',      label: t('matches.statusLive') },
    { value: 'scheduled', label: t('matches.statusScheduled') },
    { value: 'finished',  label: t('matches.statusFinished') },
  ]

  return (
    <aside style={{ display: 'grid', gap: 8 }}>
      <div className="pl-card" style={{ overflow: 'hidden' }}>
        <p className="t-cap" style={{ padding: '10px 14px 6px', margin: 0 }}>{t('matches.filterComp')}</p>
        {compOptions.map(c => (
          <button
            key={c.slug}
            onClick={() => onCompChange(c.slug)}
            aria-pressed={activeComp === c.slug}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              minHeight: 40,
              padding: '0 14px',
              background: activeComp === c.slug ? 'var(--pl-primary)' : 'transparent',
              color: activeComp === c.slug ? 'var(--pl-on-primary)' : 'var(--pl-text)',
              border: 'none',
              borderTop: '1px solid var(--pl-line)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background .12s',
              fontFamily: 'var(--font)',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 11, minWidth: 32, opacity: activeComp === c.slug ? 1 : 0.6 }}>
              {c.initials}
            </span>
            <span style={{ fontSize: 13, fontWeight: activeComp === c.slug ? 600 : 400 }}>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="pl-card" style={{ overflow: 'hidden' }}>
        <p className="t-cap" style={{ padding: '10px 14px 6px', margin: 0 }}>{t('matches.filterStatus')}</p>
        {statusOptions.map(s => (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            aria-pressed={activeStatus === s.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              minHeight: 40,
              padding: '0 14px',
              borderTop: '1px solid var(--pl-line)',
              background: activeStatus === s.value ? 'var(--pl-fill)' : 'transparent',
              color: activeStatus === s.value ? 'var(--pl-text)' : 'var(--pl-sub)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              fontSize: 13,
              fontWeight: activeStatus === s.value ? 600 : 400,
              textAlign: 'left',
            }}
          >
            {s.value === 'live' && (
              <span className="pl-dot pl-dot-pulse" style={{ background: 'var(--st-neg)' }} aria-hidden="true" />
            )}
            {s.label}
          </button>
        ))}
      </div>
    </aside>
  )
}

/* ─────────────────────────────────────────────────────────────
   MobileFilterBar — 모바일 가로 스크롤 필터 칩
───────────────────────────────────────────────────────────── */
function MobileFilterBar({ competitions, activeComp, activeStatus, onCompChange, onStatusChange, t }) {
  const comps = [
    { slug: 'all', label: t('matches.allCompetitions') },
    ...(competitions ?? []).map(c => ({ slug: c.slug, label: c.shortName })),
  ]
  const statuses = [
    { value: 'all', label: t('matches.allStatuses') },
    { value: 'live', label: t('matches.statusLive') },
    { value: 'scheduled', label: t('matches.statusScheduled') },
    { value: 'finished', label: t('matches.statusFinished') },
  ]

  const scrollStyle = {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    scrollbarWidth: 'none',
    WebkitMaskImage: 'linear-gradient(90deg, #000 calc(100% - 32px), transparent)',
    paddingBottom: 2,
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 8,
        padding: '10px 16px',
        background: 'var(--pl-card)',
        borderBottom: '1px solid var(--pl-line)',
      }}
    >
      <div style={scrollStyle}>
        {comps.map(c => (
          <button
            key={c.slug}
            className="pl-chip pl-chip-m"
            aria-pressed={activeComp === c.slug}
            onClick={() => onCompChange(c.slug)}
            style={{ flexShrink: 0 }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div style={scrollStyle}>
        {statuses.map(s => (
          <button
            key={s.value}
            className="pl-chip pl-chip-m"
            aria-pressed={activeStatus === s.value}
            onClick={() => onStatusChange(s.value)}
            style={{ flexShrink: 0 }}
          >
            {s.value === 'live' && <span className="pl-dot pl-dot-pulse" style={{ background: 'currentColor' }} aria-hidden="true" />}
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   LiveSection — LIVE 히어로 + 추가 진행 중 경기
───────────────────────────────────────────────────────────── */
function LiveSection({ matches, t }) {
  if (!matches.length) return null
  const [hero, ...rest] = matches

  return (
    <section aria-label={t('match.inProgress')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="pl-dot pl-dot-pulse" style={{ background: 'var(--st-neg)' }} aria-hidden="true" />
        <h2 className="t-card" style={{ margin: 0, color: 'var(--st-neg-text)' }}>
          {t('match.inProgress')}
        </h2>
        <span className="t-cap num" style={{ color: 'var(--pl-sub)' }}>{matches.length}</span>
      </div>

      {/* 첫 LIVE 경기 — 히어로 카드 */}
      <LiveHeroCard match={hero} fallbackMatch={null} />

      {/* 나머지 LIVE 경기 */}
      {rest.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 8,
          }}
        >
          {rest.map(m => (
            <MatchCard key={m.id} match={m} compact />
          ))}
        </div>
      )}
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   DayGroup — 날짜별 경기 그룹
───────────────────────────────────────────────────────────── */
function DayGroup({ group, t, locale }) {
  const dateLabel = new Date(group.firstIso).toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : 'en-US',
    { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }
  )

  let dayTag = null
  if (group.key === MOCK_TODAY) dayTag = t('matches.today')
  else if (group.key === '2026-11-24') dayTag = t('matches.tomorrow')

  const liveCount = group.matches.filter(m => isLive(m.displayState)).length

  return (
    <section aria-label={dateLabel}>
      {/* 날짜 헤더 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <h2 className="t-card" style={{ margin: 0 }}>{dateLabel}</h2>
        {dayTag && (
          <span className="pl-badge b-sched">{dayTag}</span>
        )}
        <span className="t-sub num" style={{ marginLeft: 4 }}>
          {t('matches.matchCount', { count: group.matches.length })}
          {liveCount > 0 && (
            <> · <span style={{ color: 'var(--st-neg-text)' }}>{t('matches.statusLive')} {liveCount}</span></>
          )}
        </span>
      </div>

      {/* 경기 카드 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 8,
        }}
      >
        {group.matches.map(m => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   MiniStandingsPanel — 우측 순위표 패널 (lg 이상)
───────────────────────────────────────────────────────────── */
function MiniStandingsPanel({ competitions, activeCompSlug, t, locale }) {
  const displaySlug = activeCompSlug === 'all' ? 'premier-league' : activeCompSlug
  const { data: standingsData, loading } = useData(
    () => fetchStandings(displaySlug),
    [displaySlug]
  )

  const comp = (competitions ?? []).find(c => c.slug === displaySlug)
  const entries = standingsData?.entries ?? []

  return (
    <aside style={{ display: 'grid', gap: 8 }}>
      <div className="pl-card" style={{ overflow: 'hidden' }}>
        {/* 패널 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 14px 8px',
            borderBottom: '1px solid var(--pl-line)',
          }}
        >
          <span className="t-card" style={{ flex: 1 }}>
            {comp ? getLocalizedCompetitionName(comp, locale) : t('matches.standingsPanel')}
          </span>
          <Link
            to={`/standings?competition=${displaySlug}`}
            className="pl-link"
            style={{ fontSize: 12 }}
          >
            {t('matches.viewStandings')}
          </Link>
        </div>

        {/* 순위표 */}
        {loading ? (
          <div style={{ padding: 12 }}>
            <LoadingSkeleton rows={6} />
          </div>
        ) : entries.length > 0 ? (
          <div style={{ padding: '4px 0' }}>
            <StandingsTable entries={entries} maxRows={8} compact competitionSlug={displaySlug} />
          </div>
        ) : null}
      </div>
    </aside>
  )
}

/* ─────────────────────────────────────────────────────────────
   MatchesPage — 메인
───────────────────────────────────────────────────────────── */
export default function MatchesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [searchParams, setSearchParams] = useSearchParams()

  const activeComp   = searchParams.get('competition') ?? 'all'
  const activeStatus = searchParams.get('status') ?? 'all'

  /* URL 파라미터 업데이트 헬퍼 */
  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === 'all' || value === null) next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }

  /* 데이터 조회 */
  const { data: allMatches, loading: loadingMatches, error: matchError } = useData(fetchAllMatches, [])
  const { data: competitions, loading: loadingComps } = useData(fetchCompetitions, [])
  const loading = loadingMatches || loadingComps

  /* 필터 적용 */
  const filtered = useMemo(() => {
    if (!allMatches) return []
    return allMatches.filter(m => {
      const compOk = activeComp === 'all' || m.competitionSlug === activeComp
      if (!compOk) return false
      if (activeStatus === 'all') return true
      const group = STATUS_GROUPS[activeStatus] ?? []
      return group.includes(m.displayState)
    })
  }, [allMatches, activeComp, activeStatus])

  /* LIVE 경기 (히어로) & 날짜별 그룹 */
  const liveMatches = useMemo(
    () => filtered.filter(m => isLive(m.displayState)),
    [filtered]
  )
  const nonLiveFiltered = useMemo(
    () => activeStatus === 'live' ? [] : filtered.filter(m => !isLive(m.displayState)),
    [filtered, activeStatus]
  )
  const dayGroups = useMemo(() => groupByDate(nonLiveFiltered), [nonLiveFiltered])

  /* 헤더 부가 정보 */
  const totalCount = filtered.length
  const liveCount  = liveMatches.length

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      {/* 모바일 필터 (lg 미만) */}
      <div className="lg:hidden">
        <MobileFilterBar
          competitions={competitions}
          activeComp={activeComp}
          activeStatus={activeStatus}
          onCompChange={v => setParam('competition', v)}
          onStatusChange={v => setParam('status', v)}
          t={t}
          locale={locale}
        />
      </div>

      {/* 3열 그리드 (lg+) / 단일 열 (모바일) */}
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '16px 16px 40px',
        }}
      >
        {/* ── 레이아웃: 데스크톱 3열 ── */}
        <style>{`
          @media (min-width: 1024px) {
            .matches-3col {
              display: grid;
              grid-template-columns: 196px 1fr 300px;
              gap: 16px;
              align-items: start;
              padding: 16px 24px 40px;
            }
          }
        `}</style>
        <div className="matches-3col">

          {/* LEFT: 필터 레일 (lg+) */}
          <div className="hidden lg:block">
            <CompFilterRail
              competitions={competitions}
              activeComp={activeComp}
              activeStatus={activeStatus}
              onCompChange={v => setParam('competition', v)}
              onStatusChange={v => setParam('status', v)}
              t={t}
              locale={locale}
            />
          </div>

          {/* CENTER: 경기 목록 */}
          <main style={{ display: 'grid', gap: 16, minWidth: 0 }}>
            {/* 페이지 헤더 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="t-page" style={{ margin: 0, fontSize: 22 }}>
                {t('matches.pageTitle')}
              </h1>
              <span className="t-sub num" style={{ flexShrink: 0 }}>
                {totalCount > 0 && t('matches.matchCount', { count: totalCount })}
                {liveCount > 0 && (
                  <span style={{ color: 'var(--st-neg-text)', marginLeft: 6 }}>
                    · {t('matches.statusLive')} {liveCount}
                  </span>
                )}
              </span>
            </div>

            {/* 로딩 */}
            {loading && <LoadingSkeleton rows={8} />}

            {/* 오류 */}
            {!loading && matchError && (
              <ErrorState description={matchError} />
            )}

            {/* 빈 결과 */}
            {!loading && !matchError && filtered.length === 0 && (
              <EmptyState
                title={t('matches.noMatches')}
                description={t('matches.noMatchesDesc')}
              />
            )}

            {/* 경기 목록 */}
            {!loading && !matchError && filtered.length > 0 && (
              <>
                {/* LIVE 히어로 */}
                {(activeStatus === 'all' || activeStatus === 'live') && liveMatches.length > 0 && (
                  <LiveSection matches={liveMatches} t={t} />
                )}

                {/* 날짜별 그룹 */}
                {dayGroups.map(group => (
                  <DayGroup key={group.key} group={group} t={t} locale={locale} />
                ))}
              </>
            )}
          </main>

          {/* RIGHT: 미니 순위표 (lg+) */}
          <div className="hidden lg:block">
            <MiniStandingsPanel
              competitions={competitions}
              activeCompSlug={activeComp}
              t={t}
              locale={locale}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
