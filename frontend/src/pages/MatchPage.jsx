/**
 * 경기 상세 /matches/:fixtureId
 *
 * 탭 4종: 라인업 · 통계 · H2H · 타임라인
 *
 * ★ 완료 조건:
 *   - 종료 / 재검증 중 / 확정 세 상태가 서로 다르게 읽힌다
 *   - 통계 탭에 xG (expectedGoals) 표시 — null은 0으로 바꾸지 않는다
 *   - 라인업 미공개(null) 상태 처리 — 31경기가 라인업이 없다
 *   - 라인업 포메이션: 세로(모바일) / 가로(데스크톱)
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { fetchMatchDetail } from '@/services/api'
import MatchStatusBadge from '@/components/ui/MatchStatusBadge'
import TeamBadge from '@/components/ui/TeamBadge'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import { toKSTTime, toKSTDate } from '@/utils/dateFormat'
import { getLocalizedName, getLocalizedShortName } from '@/utils/localization'
import { isLive } from '@/utils/matchStatus'

/* ── 포메이션 파싱 및 선수 좌표 계산 ── */
const POS_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 }

function ySpread(n) {
  const presets = {
    1: [50],
    2: [28, 72],
    3: [15, 50, 85],
    4: [10, 35, 65, 90],
    5: [10, 27, 50, 73, 90],
    6: [8, 24, 40, 60, 76, 92],
  }
  return presets[n] ?? Array.from({ length: n }, (_, i) => 10 + 80 * i / Math.max(n - 1, 1))
}

function computePitchPositions(startingXI, formation, isAway = false) {
  const sorted = [...startingXI].sort((a, b) =>
    (POS_ORDER[a.position] ?? 2) - (POS_ORDER[b.position] ?? 2)
  )
  const layers = [1, ...formation.split('-').map(Number)]
  const xStart = 8, xEnd = 60
  const xStep = (xEnd - xStart) / Math.max(layers.length - 1, 1)

  const result = []
  let idx = 0
  layers.forEach((count, layerIdx) => {
    const baseX = xStart + layerIdx * xStep
    const x = isAway ? 100 - baseX : baseX
    const ys = ySpread(count)
    for (let i = 0; i < count && idx < sorted.length; i++, idx++) {
      result.push({ ...sorted[idx], px: Math.round(x), py: ys[i] })
    }
  })
  return result
}

/* ── 이벤트 맵 (선수이름 → 이벤트 목록) ── */
function buildEventMap(events = []) {
  const map = {}
  events.forEach(e => {
    if (!e.playerName) return
    if (!map[e.playerName]) map[e.playerName] = []
    map[e.playerName].push(e.type)
  })
  return map
}

/* ─────────────────────────────────────────────────────────────
   ScoreBanner — 상단 스코어보드
───────────────────────────────────────────────────────────── */
function ScoreBanner({ match, t, locale }) {
  const live     = isLive(match.displayState)
  const hasScore = match.score?.home !== null && match.score?.away !== null

  const homeName  = getLocalizedName(match.homeTeam, locale) || match.homeTeam?.name
  const awayName  = getLocalizedName(match.awayTeam, locale) || match.awayTeam?.name

  return (
    <div
      className="pl-card"
      style={{
        padding: 'clamp(12px,3vw,20px)',
        boxShadow: live
          ? `inset 0 0 0 1.5px var(--st-neg), var(--sh-card)`
          : `inset 0 0 0 1px var(--pl-line), var(--sh-card)`,
      }}
    >
      {/* 메타: 대회 · 시각 · 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <span className="t-cap">{match.competitionName}</span>
        <span className="t-cap">·</span>
        <span className="t-cap">{match.round ?? match.stage}</span>
        {match.venue && (
          <>
            <span className="t-cap">·</span>
            <span className="t-cap" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{match.venue}</span>
          </>
        )}
        <span className="t-cap num" style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {toKSTDate(match.date, locale)} {toKSTTime(match.date, locale)} KST
        </span>
        <MatchStatusBadge state={match.displayState} />
      </div>

      {/* UCL 차전 */}
      {match.leg && (
        <div className="t-cap" style={{ textAlign: 'center', marginBottom: 8, color: 'var(--z-ucl)' }}>
          {match.leg === 1 ? t('match.leg1') : t('match.leg2')}
        </div>
      )}

      {/* 스코어 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
        {/* 홈팀 */}
        <div style={{ display: 'grid', gap: 8, justifyItems: 'center', minWidth: 0 }}>
          <TeamBadge initials={match.homeTeam?.initials} color={match.homeTeam?.color} size="lg" name={match.homeTeam?.name} />
          <span className="tname t-card" style={{ fontWeight: 700, textAlign: 'center', width: '100%' }} title={homeName}>
            {homeName}
          </span>
        </div>

        {/* 스코어 중앙 */}
        <div style={{ display: 'grid', gap: 4, justifyItems: 'center', minWidth: 0 }}>
          {hasScore ? (
            <>
              <span
                className="num"
                style={{
                  fontSize: 'clamp(30px,5vw,46px)',
                  fontWeight: 700,
                  letterSpacing: '-.025em',
                  color: live ? 'var(--st-neg)' : 'var(--pl-text)',
                }}
              >
                {match.score.home} – {match.score.away}
              </span>
              {live && match.minute && (
                <span className="t-cap num" style={{ color: 'var(--st-neg-text)' }}>
                  {match.minute}′
                </span>
              )}
              {!live && (
                <span className="t-cap num">90′</span>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div className="t-sec num">{toKSTTime(match.date, locale)}</div>
              <div className="t-cap">{toKSTDate(match.date, locale)}</div>
            </div>
          )}
        </div>

        {/* 원정팀 */}
        <div style={{ display: 'grid', gap: 8, justifyItems: 'center', minWidth: 0 }}>
          <TeamBadge initials={match.awayTeam?.initials} color={match.awayTeam?.color} size="lg" name={match.awayTeam?.name} />
          <span className="tname t-card" style={{ fontWeight: 700, textAlign: 'center', width: '100%' }} title={awayName}>
            {awayName}
          </span>
        </div>
      </div>

      {/* UCL 합산 점수 */}
      {match.aggregateScore && (
        <div style={{ borderTop: '1px solid var(--pl-line)', paddingTop: 12, marginTop: 12, display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="t-cap">{t('match.aggregate')}:</span>
            <span className="pl-badge b-final">
              {match.aggregateScore.home} – {match.aggregateScore.away}
            </span>
            {match.qualifier && (
              <span className="t-body" style={{ fontWeight: 700 }}>{match.qualifier}</span>
            )}
          </div>
          <span className="t-cap">{t('match.aggregateLeg')}</span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   StatusNotice — 종료/재검증/확정 구분 (핵심 차별점)
───────────────────────────────────────────────────────────── */
function StatusNotice({ state, t }) {
  if (state === 'recheck') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 10,
          background: 'color-mix(in srgb, var(--st-warn) 10%, var(--pl-card))',
          boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--st-warn) 40%, transparent)',
        }}
        role="status"
      >
        <MatchStatusBadge state="recheck" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="t-body" style={{ margin: 0, fontWeight: 600 }}>
            {t('match.recheckTitle')}
          </p>
          <p className="t-sub" style={{ margin: '2px 0 0' }}>{t('match.recheckNotice')}</p>
        </div>
      </div>
    )
  }

  if (state === 'confirmed') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 10,
          background: 'color-mix(in srgb, var(--st-pos) 10%, var(--pl-card))',
          boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--st-pos) 40%, transparent)',
        }}
        role="status"
      >
        <MatchStatusBadge state="confirmed" />
        <span className="t-body">{t('match.officialConfirmed')}</span>
      </div>
    )
  }

  if (state === 'final') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 10,
          background: 'var(--pl-fill)',
          boxShadow: 'inset 0 0 0 1px var(--pl-line)',
        }}
        role="status"
      >
        <MatchStatusBadge state="final" />
        <span className="t-body">{t('match.finalNotice')}</span>
      </div>
    )
  }

  return null
}

/* ─────────────────────────────────────────────────────────────
   TabBar
───────────────────────────────────────────────────────────── */
function TabBar({ active, onSelect, t }) {
  const tabs = [
    { id: 'lineup',   label: t('match.tabs.lineup') },
    { id: 'stats',    label: t('match.tabs.stats') },
    { id: 'h2h',      label: t('match.tabs.h2h') },
    { id: 'timeline', label: t('match.tabs.timeline') },
  ]
  return (
    <div
      className="pl-card"
      style={{ display: 'flex', overflow: 'hidden' }}
      role="tablist"
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => onSelect(tab.id)}
          style={{
            flex: 1,
            minHeight: 44,
            display: 'grid',
            placeItems: 'center',
            fontSize: 14,
            fontWeight: tab.id === active ? 700 : 500,
            color: tab.id === active ? 'var(--pl-text)' : 'var(--pl-sub)',
            boxShadow: tab.id === active ? 'inset 0 -2px 0 var(--pl-primary)' : 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            transition: 'color .12s',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PitchView — 포메이션 시각화
   세로(모바일): top=(100-px)%, left=py%
   가로(데스크톱): left=px%, top=py%
───────────────────────────────────────────────────────────── */
function PlayerMarker({ player, eventMap = {}, isAway, vertical }) {
  const events = eventMap[player.name] ?? []
  const hasGoal = events.includes('goal')
  const hasYellow = events.includes('yellow_card')
  const hasRed = events.includes('red_card')
  const hasSub = events.includes('substitution')

  const pos = vertical
    ? { top: `${100 - player.px}%`, left: `${player.py}%` }
    : { left: `${player.px}%`, top: `${player.py}%` }

  return (
    <div
      style={{
        position: 'absolute',
        ...pos,
        transform: 'translate(-50%, -50%)',
        display: 'grid',
        justifyItems: 'center',
        gap: 3,
        width: 56,
        zIndex: 2,
        pointerEvents: 'none',
      }}
      aria-label={`${player.number} ${player.name}`}
    >
      {/* 등번호 마커 */}
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: isAway ? 'var(--pl-card)' : 'var(--pl-text)',
          color: isAway ? 'var(--pl-text)' : 'var(--pl-bg)',
          boxShadow: isAway ? 'inset 0 0 0 1.5px var(--pl-control)' : 'none',
          fontSize: 11,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          position: 'relative',
        }}
        className="num"
      >
        {player.number}
        {/* 골 배지 */}
        {hasGoal && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', right: -5, top: -4,
              width: 14, height: 14, borderRadius: '50%',
              background: 'var(--st-pos)', color: '#fff',
              fontSize: 8, fontWeight: 700,
              display: 'grid', placeItems: 'center',
            }}
          >
            ⚽
          </span>
        )}
        {/* 경고 배지 */}
        {hasYellow && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', left: -5, top: -4,
              width: 8, height: 11, borderRadius: 2,
              background: 'var(--st-warn)',
            }}
          />
        )}
        {/* 퇴장 */}
        {hasRed && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', left: -5, top: -4,
              width: 8, height: 11, borderRadius: 2,
              background: 'var(--st-neg)',
            }}
          />
        )}
        {/* 교체 */}
        {hasSub && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', right: -5, bottom: -4,
              width: 14, height: 14, borderRadius: '50%',
              background: 'var(--pl-fill-2)', color: 'var(--pl-text)',
              fontSize: 8, display: 'grid', placeItems: 'center',
            }}
          >
            ↓
          </span>
        )}
        {/* 주장 */}
        {player.isCaptain && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', right: -8, bottom: -2,
              fontSize: 10, fontWeight: 900, color: 'var(--st-warn)',
            }}
          >
            C
          </span>
        )}
      </span>
      {/* 이름 */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.2,
          color: 'var(--pl-text)',
          textShadow: '0 1px 2px var(--pl-card)',
          maxWidth: 56,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {player.name.split(' ').pop()}
      </span>
    </div>
  )
}

function PitchView({ homeLineup, awayLineup, homeEvents, awayEvents, vertical, height = 420, t }) {
  const lineColor = 'var(--pl-line)'

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: 12,
        background: 'var(--pl-fill)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      role="img"
      aria-label={t('match.pitchAria')}
    >
      {/* 피치 선 SVG */}
      <svg
        width="100%"
        height="100%"
        viewBox={vertical ? '0 0 100 160' : '0 0 160 100'}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
        aria-hidden="true"
      >
        <g fill="none" stroke={lineColor} strokeWidth="0.6">
          <rect x="2" y="2" width={vertical ? 96 : 156} height={vertical ? 156 : 96} />
          {vertical ? (
            <>
              <line x1="2" y1="80" x2="98" y2="80" />
              <circle cx="50" cy="80" r="14" />
              <rect x="26" y="2" width="48" height="20" />
              <rect x="26" y="138" width="48" height="20" />
            </>
          ) : (
            <>
              <line x1="80" y1="2" x2="80" y2="98" />
              <circle cx="80" cy="50" r="14" />
              <rect x="2" y="26" width="20" height="48" />
              <rect x="138" y="26" width="20" height="48" />
            </>
          )}
        </g>
      </svg>

      {/* 홈팀 마커 */}
      {homeLineup.map(p => (
        <PlayerMarker key={`h${p.number}`} player={p} eventMap={homeEvents} isAway={false} vertical={vertical} />
      ))}
      {/* 원정팀 마커 */}
      {awayLineup.map(p => (
        <PlayerMarker key={`a${p.number}`} player={p} eventMap={awayEvents} isAway vertical={vertical} />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   LineupTab
───────────────────────────────────────────────────────────── */
function BenchPanel({ teamName, players, t }) {
  if (!players?.length) return null
  return (
    <div className="pl-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--pl-line)' }}>
        <span className="t-card">{teamName} {t('match.bench')}</span>
      </div>
      {players.map(p => (
        <div
          key={p.number}
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 1fr auto',
            gap: 8,
            alignItems: 'center',
            padding: '0 14px',
            minHeight: 44,
            borderTop: '1px solid var(--pl-line)',
          }}
        >
          <span className="num t-sub" style={{ fontWeight: 700 }}>{p.number}</span>
          <span className="t-body" style={{ fontWeight: 600 }}>{p.name}</span>
          <span className="t-cap">{p.position}</span>
        </div>
      ))}
    </div>
  )
}

function TopRatedPanel({ players, t }) {
  if (!players?.length) return null
  const top = players[0]
  if (!top) return null
  const stats = top.statistics
  return (
    <div className="pl-card" style={{ padding: 16, display: 'grid', gap: 10 }}>
      <p className="t-cap" style={{ margin: 0 }}>{t('match.topRated')}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--pl-text)', color: 'var(--pl-bg)',
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 14,
          }}
          className="num"
        >
          {stats?.games?.number ?? '?'}
        </span>
        <div style={{ display: 'grid' }}>
          <span className="t-card">{top.name}</span>
          <span className="t-cap">{top.position}</span>
        </div>
        {stats?.games?.rating != null && (
          <span
            className="num t-sec"
            style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--st-pos)' }}
          >
            {stats.games.rating.toFixed(1)}
          </span>
        )}
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid var(--pl-line)', margin: 0 }} />
      {[
        [t('match.minutesPlayed'), `${stats?.games?.minutes ?? '—'}′`],
        [t('match.shotsEffective'), stats?.shots ? `${stats.shots.total ?? '—'} (${stats.shots.on ?? '—'})` : '—'],
        [t('match.passesLabel'), stats?.passes?.total ?? '—'],
      ].map(([label, val]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="t-sub">{label}</span>
          <span className="num t-body" style={{ fontWeight: 700 }}>{val}</span>
        </div>
      ))}
    </div>
  )
}

function LineupTab({ match, lineup, topRated, t, locale }) {
  if (!lineup) {
    return (
      <div className="pl-card">
        <EmptyState
          title={t('match.lineupTbd')}
          description={t('match.noLineupDesc')}
        />
      </div>
    )
  }

  const eventMap = buildEventMap(match.events)
  const homeEventMap = {}
  const awayEventMap = {}
  Object.entries(eventMap).forEach(([name, types]) => {
    // heuristic: assign based on score events
    const ev = (match.events ?? []).find(e => e.playerName === name)
    if (ev?.team === 'home') homeEventMap[name] = types
    else if (ev?.team === 'away') awayEventMap[name] = types
  })

  const homePlayers = computePitchPositions(lineup.home.startingXI, lineup.home.formation, false)
  const awayPlayers = computePitchPositions(lineup.away.startingXI, lineup.away.formation, true)

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}
        className="lg-lineup-grid"
      >
        <style>{`@media(min-width:768px){.lg-lineup-grid{grid-template-columns:1fr 300px!important}}`}</style>

        {/* 피치 카드 */}
        <div className="pl-card" style={{ padding: 14, display: 'grid', gap: 10 }}>
          {/* 레전드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="t-sub">
              <span
                style={{
                  display: 'inline-block', width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--pl-text)', verticalAlign: 'middle', marginRight: 5,
                }}
              />
              {getLocalizedShortName(match.homeTeam, locale) || match.homeTeam?.shortName} · {t('match.homeMarker')} · {lineup.home.formation}
            </span>
            <span className="t-sub" style={{ marginLeft: 'auto' }}>
              {getLocalizedShortName(match.awayTeam, locale) || match.awayTeam?.shortName} · {t('match.awayMarker')} · {lineup.away.formation}
              <span
                style={{
                  display: 'inline-block', width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--pl-card)', border: '1.5px solid var(--pl-control)',
                  verticalAlign: 'middle', marginLeft: 5,
                }}
              />
            </span>
          </div>

          {/* 가로 피치 (md+) */}
          <div className="hidden md:block">
            <PitchView
              homeLineup={homePlayers}
              awayLineup={awayPlayers}
              homeEvents={homeEventMap}
              awayEvents={awayEventMap}
              vertical={false}
              height={380}
              t={t}
            />
          </div>
          {/* 세로 피치 (모바일) */}
          <div className="md:hidden">
            <PitchView
              homeLineup={homePlayers}
              awayLineup={awayPlayers}
              homeEvents={homeEventMap}
              awayEvents={awayEventMap}
              vertical
              height={480}
              t={t}
            />
          </div>

          {/* 이벤트 범례 */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              ['⚽', t('match.legendGoal')],
              ['■', t('match.legendYellow')],
              ['↓', t('match.legendSub')],
            ].map(([icon, label]) => (
              <span key={label} className="t-cap" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {icon} {label}
              </span>
            ))}
          </div>
        </div>

        {/* 우측 패널 (md+) */}
        <div style={{ display: 'grid', gap: 12 }}>
          <TopRatedPanel players={topRated} t={t} />
          <BenchPanel
            teamName={getLocalizedShortName(match.homeTeam, locale) || match.homeTeam?.shortName}
            players={lineup.home.substitutes}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   StatsTab — xG 포함
───────────────────────────────────────────────────────────── */
function StatRow({ label, homeVal, awayVal, unit = '', barHome, note }) {
  const fmt = v => v == null ? '—' : `${v}${unit}`

  let pct = 50  // default 50/50
  if (barHome != null) {
    pct = Math.max(5, Math.min(95, barHome))
  } else if (homeVal != null && awayVal != null && homeVal + awayVal > 0) {
    pct = Math.round((homeVal / (homeVal + awayVal)) * 100)
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 64px', alignItems: 'center', gap: 4 }}>
        <span className="num t-body" style={{ fontWeight: 700 }}>{fmt(homeVal)}</span>
        <span className="t-sub" style={{ textAlign: 'center' }}>{label}</span>
        <span className="num t-body" style={{ fontWeight: 700, textAlign: 'right' }}>{fmt(awayVal)}</span>
      </div>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--pl-fill-2)' }}>
        <span style={{ width: `${pct}%`, background: 'var(--pl-text)', transition: 'width .3s' }} />
        <span style={{ flex: 1, background: 'var(--pl-fill-2)' }} />
      </div>
      {note && <span className="t-cap" style={{ color: 'var(--pl-sub)' }}>{note}</span>}
    </div>
  )
}

function StatsPanel({ stats, t }) {
  if (!stats) {
    return <EmptyState title={t('match.noStats')} description={t('match.noStatsDesc')} />
  }
  const h = stats.home
  const a = stats.away

  const rows = [
    { label: t('match.possession'),    hv: h.ballPossession, av: a.ballPossession, unit: '%', barHome: h.ballPossession },
    { label: t('match.shots'),         hv: h.totalShots,     av: a.totalShots },
    { label: t('match.shotsOnGoal'),   hv: h.shotsOnGoal,    av: a.shotsOnGoal },
    { label: t('match.cornerKicks'),   hv: h.cornerKicks,    av: a.cornerKicks },
    { label: t('match.fouls'),         hv: h.fouls,          av: a.fouls },
    { label: t('match.passAccuracy'),  hv: h.passesPercent,  av: a.passesPercent, unit: '%', barHome: h.passesPercent },
    /* xG — null은 0으로 바꾸지 않는다 */
    {
      label: t('match.xGoals'),
      hv: h.expectedGoals,
      av: a.expectedGoals,
      fmt: v => v == null ? '—' : v.toFixed(2),
      note: t('match.xGoalsNote'),
    },
    /* goalsPrevented */
    {
      label: t('match.goalsPrevented'),
      hv: h.goalsPrevented,
      av: a.goalsPrevented,
      fmt: v => v == null ? '—' : (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)),
      note: t('match.goalsPrevNote'),
    },
  ]

  return (
    <div className="pl-card" style={{ padding: 16, display: 'grid', gap: 14 }}>
      {rows.map(row => (
        <StatRow
          key={row.label}
          label={row.label}
          homeVal={row.hv}
          awayVal={row.av}
          unit={row.unit ?? ''}
          barHome={row.barHome}
          note={row.note}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TimelinePanel
───────────────────────────────────────────────────────────── */
const EVENT_LABEL = {
  goal:         { icon: '⚽', key: 'match.goalEvent' },
  yellow_card:  { icon: '🟨', key: 'match.goalCard' },
  red_card:     { icon: '🟥', key: 'match.redCard' },
  substitution: { icon: '🔄', key: 'match.subEvent' },
  var:          { icon: '📺', key: 'match.varEvent' },
}

function TimelinePanel({ events = [], homeTeamName, awayTeamName, t }) {
  if (!events.length) {
    return (
      <div className="pl-card" style={{ padding: 24, textAlign: 'center' }}>
        <span className="t-sub">{t('match.noEvents')}</span>
      </div>
    )
  }

  return (
    <div className="pl-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--pl-line)' }}>
        <span className="t-card">{t('match.tabs.timeline')}</span>
      </div>
      {events.map((e, i) => {
        const meta = EVENT_LABEL[e.type] ?? { icon: '•', key: 'match.goalEvent' }
        const isHome = e.team === 'home'
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '52px 1fr auto',
              gap: 10,
              alignItems: 'center',
              padding: '0 14px',
              minHeight: 48,
              borderTop: '1px solid var(--pl-line)',
            }}
          >
            <span className="num t-sub" style={{ fontWeight: 700, color: 'var(--pl-text)' }}>
              {e.minute}′
            </span>
            <span className="t-body" style={{ minWidth: 0 }}>
              <span>{meta.icon} </span>
              <span style={{ fontWeight: 600 }}>{e.playerName}</span>
              {e.assistName && (
                <span className="t-sub"> · {e.assistName}</span>
              )}
            </span>
            <span className="t-cap" style={{ textAlign: 'right' }}>
              {isHome ? homeTeamName : awayTeamName}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   H2HTab
───────────────────────────────────────────────────────────── */
function H2HTab({ match, t, locale }) {
  const h2h = match.headToHead ?? []
  if (!h2h.length) {
    return (
      <div className="pl-card">
        <EmptyState title={t('match.noH2H')} />
      </div>
    )
  }

  const homeName = getLocalizedShortName(match.homeTeam, locale) || match.homeTeam?.shortName
  const awayName = getLocalizedShortName(match.awayTeam, locale) || match.awayTeam?.shortName

  const homeWins = h2h.filter(r => {
    const hTeam = r.homeTeam?.toLowerCase()
    const hScore = r.homeScore
    const aScore = r.awayScore
    return (hTeam?.includes(match.homeTeam?.slug?.split('-')[0]) && hScore > aScore) ||
           (!hTeam?.includes(match.homeTeam?.slug?.split('-')[0]) && aScore > hScore)
  }).length
  const draws = h2h.filter(r => r.homeScore === r.awayScore).length
  const awayWins = h2h.length - homeWins - draws

  return (
    <div className="pl-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--pl-line)' }}>
        <span className="t-card">{t('match.h2hSummary')}</span>
      </div>
      {/* 요약 */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 20, borderBottom: '1px solid var(--pl-line)' }}>
        {[[homeName, homeWins], [t('match.drawAbbr'), draws], [awayName, awayWins]].map(([label, count]) => (
          <span key={label} className="t-sub">
            {label} <b className="num" style={{ color: 'var(--pl-text)', fontWeight: 700 }}>{count}</b>
          </span>
        ))}
      </div>
      {/* 경기 목록 */}
      {h2h.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 56px 1fr',
            gap: 10,
            alignItems: 'center',
            padding: '0 16px',
            minHeight: 48,
            borderTop: i ? '1px solid var(--pl-line)' : 'none',
          }}
        >
          <span className="num t-sub">{r.date?.slice(0, 10)}</span>
          <span className="t-cap">{r.competition}</span>
          <span className="t-body">{r.homeTeam} {r.homeScore} – {r.awayScore} {r.awayTeam}</span>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MatchPage — 메인
───────────────────────────────────────────────────────────── */
export default function MatchPage() {
  const { fixtureId } = useParams()
  const [tab, setTab] = useState('lineup')
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const { data, loading, error } = useData(() => fetchMatchDetail(fixtureId), [fixtureId])

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <LoadingSkeleton rows={8} />
      </div>
    )
  }

  if (error || !data?.match) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <ErrorState title={t('common.errorTitle')} description={error} />
      </div>
    )
  }

  const { match, stats, lineup, topRated } = data
  const showStatus = ['final', 'recheck', 'confirmed'].includes(match.displayState)

  const homeShort = getLocalizedShortName(match.homeTeam, locale) || match.homeTeam?.shortName
  const awayShort = getLocalizedShortName(match.awayTeam, locale) || match.awayTeam?.shortName

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div
        style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 16px 48px' }}
        className="lg:px-8"
      >
        {/* 뒤로 가기 */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/matches" className="pl-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 44 }}>
            ← {t('match.matchList')}
          </Link>
          <span className="t-cap" style={{ color: 'var(--pl-sub)' }}>/ {match.competitionName}</span>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {/* 스코어보드 */}
          <ScoreBanner match={match} t={t} locale={locale} />

          {/* 상태 안내 (재검증/확정/종료) */}
          {showStatus && <StatusNotice state={match.displayState} t={t} />}

          {/* 탭 바 */}
          <TabBar active={tab} onSelect={setTab} t={t} />

          {/* 탭 콘텐츠 */}
          {tab === 'lineup' && (
            <LineupTab
              match={match}
              lineup={lineup}
              topRated={topRated}
              t={t}
              locale={locale}
            />
          )}

          {tab === 'stats' && (
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}
              className="stats-grid"
            >
              <style>{`@media(min-width:768px){.stats-grid{grid-template-columns:1fr 300px!important}}`}</style>
              <StatsPanel stats={stats} t={t} />
              <TimelinePanel
                events={match.events}
                homeTeamName={homeShort}
                awayTeamName={awayShort}
                t={t}
              />
            </div>
          )}

          {tab === 'h2h' && <H2HTab match={match} t={t} locale={locale} />}

          {tab === 'timeline' && (
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}
              className="timeline-grid"
            >
              <style>{`@media(min-width:768px){.timeline-grid{grid-template-columns:1fr 300px!important}}`}</style>
              <TimelinePanel
                events={match.events}
                homeTeamName={homeShort}
                awayTeamName={awayShort}
                t={t}
              />
              <StatsPanel stats={stats} t={t} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
