/**
 * 경기 탭 /matches — 3열 레이아웃
 * 좌: 대회·상태 필터 레일 (lg+)
 * 중: LIVE 히어로 + 날짜별 경기 그룹
 * 우: 미니 순위표 (lg+)
 *
 * 필터 조합(competition, status)은 URL에 보존된다.
 * 모바일(<1024px): 필터 칩 가로 스크롤 + 1열 목록
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { useLiveMatches } from '@/hooks/useLiveMatches'
import { fetchAllMatches, fetchCompetitions, fetchStandings } from '@/services/api'
import { mergeLive } from '@/utils/liveMerge'
import MatchCard from '@/components/ui/MatchCard'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import StandingsTable from '@/components/ui/StandingsTable'
import LiveHeroCard from '@/components/home/LiveHeroCard'
import HScroller, { HScrollerHeaderControls } from '@/components/ui/HScroller'
import { isLive } from '@/utils/matchStatus'
import { getLocalizedCompetitionName } from '@/utils/localization'
import { kstDateKey } from '@/utils/dateFormat'
import { todayKstKey, tomorrowKstKey } from '@/services/clock'
import { pickFocusMatchdays } from '@/utils/matchDays'

/* ── 상수 ── */
const STATUS_GROUPS = {
  live:      ['live', 'halftime'],
  scheduled: ['scheduled'],
  finished:  ['confirmed', 'final', 'recheck', 'postponed', 'cancelled'],
}

/* ── 경기 날짜별 그룹화 ── */
function groupByDate(matches) {
  const map = {}
  for (const m of matches) {
    const key = kstDateKey(m.date)
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

  /* "오늘"·"내일" 은 services/clock 이 정한다 — Mock 은 고정 기준일, 실 API 는 실제 오늘 (KST) */
  let dayTag = null
  if (group.key === todayKstKey()) dayTag = t('matches.today')
  else if (group.key === tomorrowKstKey()) dayTag = t('matches.tomorrow')

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
   FocusRow / FocusSummary — 상단 요약 칸 (최근 결과 · 다가오는 경기).
   HScroller step='card' 로 카드 1장씩 슬라이드 · 자동재생 4s · 두 줄은 2s 엇갈림.
───────────────────────────────────────────────────────────── */
function FocusRow({ ariaLabel, titleKey, emptyKey, items, autoDelayMs, resetKey, t }) {
  return (
    /* minWidth:0 — grid 자식 기본 min-width:auto 가 트랙 content 폭까지 팽창시켜 부모를 뚫는 것을 막는다 */
    <section aria-label={ariaLabel} style={{ display: 'grid', gap: 8, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 className="t-card" style={{ margin: 0 }}>{t(titleKey)}</h2>
        {items.length > 0 && (
          <span className="t-sub num" style={{ marginLeft: 4 }}>
            {t('matches.matchCount', { count: items.length })}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="t-sub" style={{ margin: 0 }}>{t(emptyKey)}</p>
      ) : (
        /* key=resetKey — 대회 필터 변경 시 HScroller 인스턴스 자체를 리마운트 → scrollLeft 0 · 자동재생 타이머 재시작.
           스코어 갱신(mergeLive) 은 key 를 안 바꾸므로 그대로 유지. */
        <HScroller
          key={resetKey}
          rows={1}
          gap={8}
          step="card"
          ariaLabel={ariaLabel}
          autoPlay
          intervalMs={4000}
          startDelayMs={autoDelayMs}
          showPauseToggle
          header={(ctrl) => (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <HScrollerHeaderControls {...ctrl} />
            </div>
          )}
        >
          {items.map(m => (
            <div key={m.id} style={{ width: 260, flexShrink: 0 }}>
              <MatchCard match={m} compact />
            </div>
          ))}
        </HScroller>
      )}
    </section>
  )
}

function FocusSummary({ focus, resetKey, t }) {
  return (
    <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
      <FocusRow
        ariaLabel="Recent results"
        titleKey="matches.focus.recent"
        emptyKey="matches.focus.noRecent"
        items={focus.recent}
        autoDelayMs={0}
        resetKey={resetKey}
        t={t}
      />
      <FocusRow
        ariaLabel="Upcoming matches"
        titleKey="matches.focus.upcoming"
        emptyKey="matches.focus.noUpcoming"
        items={focus.upcoming}
        autoDelayMs={2000}
        resetKey={resetKey}
        t={t}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MiniStandingsPanel — 우측 순위표 패널 (lg 이상)
───────────────────────────────────────────────────────────── */
function MiniStandingsPanel({ competitions, activeCompSlug, seasonYear, t, locale }) {
  const displaySlug = activeCompSlug === 'all' ? 'premier-league' : activeCompSlug
  const { data: standingsData, loading, error } = useData(
    () => fetchStandings(displaySlug, seasonYear),
    [displaySlug, seasonYear]
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
        ) : error ? (
          <ErrorState description={error} />
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
  // 백엔드 `?season=` 은 연도(int)만 받는다. 헤더가 URL 을 연도로 정규화하기 전 한 렌더 동안
  // 예전 라벨('2025-26')이 남아 있을 수 있어, 연도가 아니면 넘기지 않는다(백엔드가 현재 시즌으로 폴백).
  const seasonParam  = searchParams.get('season')
  const seasonYear   = /^\d{4}$/.test(seasonParam ?? '') ? Number(seasonParam) : undefined

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
  // 시즌을 안 골랐으면(기본) 지금까지처럼 6대회를 한 번에 받아 대회 칩은 클라이언트에서 거른다.
  // 그래서 activeComp 를 deps 에 넣지 않는다 — 넣으면 칩을 누를 때마다 재요청이 돌아 목록이 로딩으로 깜빡인다.
  // 시즌을 고르면 대회를 서버로 내린다: 과거 시즌은 조회 창이 없어 6대회를 다 받으면 ≈1,900경기가 온다.
  const scopedCompSlug = seasonYear && activeComp !== 'all' ? activeComp : undefined
  // deps 에 seasonYear 가 있어야 시즌을 바꿨을 때 다시 받는다
  const { data: matchesResult, loading: loadingMatches, error: matchError } = useData(
    () => fetchAllMatches({ season: seasonYear, competitionSlug: scopedCompSlug }),
    [seasonYear, scopedCompSlug ?? null]
  )
  const { data: competitions, loading: loadingComps } = useData(fetchCompetitions, [])
  const loading = loadingMatches || loadingComps

  const allMatches = matchesResult?.items ?? null
  /** 과거 시즌인데 대회를 안 골랐다 — 빈 결과가 아니라 "고르면 보인다" 다. 둘을 같은 화면으로 그리지 않는다 */
  const needsCompetition = matchesResult?.unavailableReason === 'COMPETITION_REQUIRED'

  /* 라이브 폴링 병합 — mergeLive 는 원본 배열 그대로(참조 유지) 또는 새 배열 반환 */
  const { liveMap } = useLiveMatches()
  const mergedMatches = useMemo(
    () => allMatches ? mergeLive(allMatches, liveMap) : null,
    [allMatches, liveMap]
  )

  /* 대회 필터만 적용된 목록 — 요약 칸(FocusSummary) 입력 (R1).
     아래 `filtered` 는 상태 필터까지 포함 — 목록·LIVE 히어로 용도. */
  const byCompetition = useMemo(() => {
    if (!mergedMatches) return null
    return activeComp === 'all'
      ? mergedMatches
      : mergedMatches.filter(m => m.competitionSlug === activeComp)
  }, [mergedMatches, activeComp])

  /* 필터 적용 — 상태 필터만 (대회 필터는 위에서 이미 적용됨) */
  const filtered = useMemo(() => {
    if (!byCompetition) return []
    if (activeStatus === 'all') return byCompetition
    const group = STATUS_GROUPS[activeStatus] ?? []
    return byCompetition.filter(m => group.includes(m.displayState))
  }, [byCompetition, activeStatus])

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

  /* 요약 칸 데이터 — 대회 필터만 적용된 목록에서 3경기일씩 뽑는다.
     라이브 병합은 byCompetition 단계에서 끝났으므로 focus 결과도 자동 갱신.
     카드 재렌더 시 HScroller 는 children 을 useEffect deps 로 안 넣어 scrollLeft·자동재생 타이머 유지. */
  const todayKey = todayKstKey()
  const focus = useMemo(
    () => pickFocusMatchdays(byCompetition ?? [], todayKey),
    [byCompetition, todayKey]
  )

  /* 지난 경기 접기 (R3 · 앵커 스크롤 보정) */
  const [showPast, setShowPast] = useState(false)
  const buttonRef = useRef(null)
  const anchorTopRef = useRef(null)
  /* activeStatus === 'finished' 은 원래 지난 경기를 보려는 필터라 접기 비활성 */
  const foldEnabled = activeStatus !== 'finished'
  const hiddenGroups = useMemo(
    () => (foldEnabled ? dayGroups.filter(g => g.key < todayKey) : []),
    [dayGroups, foldEnabled, todayKey]
  )
  const hiddenMatchCount = hiddenGroups.reduce((n, g) => n + g.matches.length, 0)
  const visibleDayGroups = useMemo(() => {
    if (!foldEnabled || showPast) return dayGroups
    return dayGroups.filter(g => g.key >= todayKey)
  }, [dayGroups, foldEnabled, showPast, todayKey])

  /* 앵커 스크롤 보정 — 클릭 직전 버튼의 화면 상단 위치를 기억, 펼침/접힘 후 같은 위치로 되돌린다.
     Chrome 자체 overflow-anchor 보정과 이중 적용되면 흔들리므로 목록 컨테이너에 overflow-anchor:none. */
  function onToggleShowPast() {
    const el = buttonRef.current
    anchorTopRef.current = el ? el.getBoundingClientRect().top : null
    setShowPast(v => !v)
  }
  useLayoutEffect(() => {
    const prevTop = anchorTopRef.current
    anchorTopRef.current = null
    if (prevTop == null) return
    const el = buttonRef.current
    if (!el) return
    const newTop = el.getBoundingClientRect().top
    const delta = newTop - prevTop
    if (Math.abs(delta) > 0.5) window.scrollBy(0, delta)
  }, [showPast])

  /* 헤더 부가 정보 */
  const totalCount = filtered.length
  const liveCount  = liveMatches.length

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: 'var(--pl-page-min-h)' }}>
      {/* 모바일 필터 (lg 미만) */}
      <div className="lg:hidden pl-sticky-filter">
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
        className="pl-container"
        style={{
          paddingBlock: '16px 40px',
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
              padding-block: 16px 40px;
            }
          }
        `}</style>
        <div className="matches-3col">

          {/* LEFT: 필터 레일 (lg+) */}
          <div className="hidden lg:block pl-sticky-filter" style={{ top: 'calc(var(--pl-header-h) + 16px)' }}>
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

            {/* 과거 시즌 — 대회를 골라야 목록이 뜬다. "경기가 없음" 과 다른 상태라 문구를 나눈다 */}
            {!loading && !matchError && needsCompetition && (
              <EmptyState title={t('matches.pickCompetition')} description={t('matches.pickCompetitionDesc')} />
            )}

            {/* 빈 결과 */}
            {!loading && !matchError && !needsCompetition && filtered.length === 0 && (
              <EmptyState
                title={t('matches.noMatches')}
                description={t('matches.noMatchesDesc')}
              />
            )}

            {/* 경기 목록 */}
            {!loading && !matchError && !needsCompetition && filtered.length > 0 && (
              <>
                {/* 요약 칸 — 최근 결과 · 다가오는 경기 */}
                <FocusSummary focus={focus} resetKey={activeComp} t={t} />

                {/* LIVE 히어로 */}
                {(activeStatus === 'all' || activeStatus === 'live') && liveMatches.length > 0 && (
                  <LiveSection matches={liveMatches} t={t} />
                )}

                {/* 지난 경기 접기 버튼 — 접힐 대상이 있을 때만 */}
                {foldEnabled && hiddenGroups.length > 0 && (
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={onToggleShowPast}
                    aria-expanded={showPast}
                    style={{
                      alignSelf: 'start',
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--pl-line)',
                      background: 'var(--pl-card)',
                      color: 'var(--pl-text)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font)',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {showPast
                      ? t('matches.hidePast')
                      : t('matches.showPast', { count: hiddenGroups.length, matches: hiddenMatchCount })}
                  </button>
                )}

                {/* 날짜별 그룹 — 접기 상태 반영 · overflow-anchor:none 으로 Chrome 자동 보정 이중 적용 방지 */}
                <div style={{ overflowAnchor: 'none', display: 'grid', gap: 16 }}>
                  {visibleDayGroups.map(group => (
                    <DayGroup key={group.key} group={group} t={t} locale={locale} />
                  ))}
                </div>

                {/* 오늘 이후 그룹이 0개 · 그러나 지난 그룹은 있음 → 안내 문구 (버튼만 남는 상태 방지) */}
                {foldEnabled && visibleDayGroups.length === 0 && hiddenGroups.length > 0 && (
                  <p className="t-sub" style={{ margin: 0 }}>{t('matches.futureEmpty')}</p>
                )}
              </>
            )}
          </main>

          {/* RIGHT: 미니 순위표 (lg+) */}
          <div className="hidden lg:block">
            <MiniStandingsPanel
              competitions={competitions}
              activeCompSlug={activeComp}
              seasonYear={seasonYear}
              t={t}
              locale={locale}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
