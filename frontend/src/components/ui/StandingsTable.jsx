/**
 * 순위 테이블
 *
 * compact=false (StandingsPage): DIV 기반 그리드 행
 *   - 데스크톱: 11열 (rank · team · P · W · D · L · GF · GA · GD · Pts · Form)
 *   - 모바일: 좌측 고정(rank+team) + 우측 가로 스크롤 (P·W·D·L·GF·GA·GD·Pts)
 *   - 구역 패턴: 좌측 2px 표시선 solid/dash/dot/block (색 없이도 구분)
 *
 * compact=true (미니 패널): HTML <table> — rank · team · gd · pts
 *   - 순위·팀 sticky, 행 범위가 짧아 패턴 불필요
 *
 * PRD 9-2: 순위표 안에서 팀 이름을 브랜드 색으로 칠하지 않는다.
 *
 * @param {{ entries:Array, maxRows?:number, competitionSlug?:string,
 *           compact?:boolean }} props
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TeamBadge from './TeamBadge'
import FormBadge from './FormBadge'
import {
  ZONE_STICKY_BG,
  ZONE_COLOR_VAR,
  ZONE_PAT,
} from '@/utils/standingsZone'
import { groupStandings, limitStandingGroups } from '@/utils/standings'
import { getLocalizedName } from '@/utils/localization'

/* ── i18n 키 맵 ── */
const ZONE_LABEL_KEY = {
  champions_league:         'standings.legend.ucl',
  // 라벨이 비어 있으면 ZoneLegend 가 걸러내 색만 칠하고 설명이 없는 행이 된다
  champions_league_playoff: 'standings.legend.uclQualPlayoff',
  europa_league:            'standings.legend.uel',
  europa_conference:        'standings.legend.uecl',
  relegation:               'standings.legend.relegation',
  relegation_playoff:       'standings.legend.relegationPlayoff',
  ucl_direct:               'standings.legend.uclDirect',
  ucl_playoff:              'standings.legend.uclPlayoff',
  ucl_eliminated:           'standings.legend.uclEliminated',
  none:                     '',
}

const ZONE_DISPLAY_ORDER = [
  'champions_league','champions_league_playoff',
  'europa_league','europa_conference',
  'relegation_playoff','relegation',
  'ucl_direct','ucl_playoff','ucl_eliminated',
]

/* ── 패턴 배경 생성 ── */
function patternBg(zc, pat) {
  if (!pat || pat === 'solid') return undefined
  if (pat === 'dash')  return `repeating-linear-gradient(180deg,${zc} 0 8px,transparent 8px 14px)`
  if (pat === 'dot')   return `repeating-linear-gradient(180deg,${zc} 0 3px,transparent 3px 7px)`
  if (pat === 'block') return `repeating-linear-gradient(180deg,${zc} 0 16px,transparent 16px 22px)`
  return undefined
}

/* ── 구역 범위 계산 ──
   순위는 조 안에서만 뜻이 있다. 8개 조를 한 덩어리로 계산하면 범위가 무의미해지므로
   조마다 따로 구하고, 모든 조가 같은 범위일 때만 하나로 합쳐 보여준다.
   조마다 다르면 범위를 감춘다 — 틀린 범위를 적는 것보다 안 적는 게 낫다. */
function computeZoneRanges(groups) {
  const perZone = {}
  groups.forEach(g => {
    const inGroup = {}
    ;(g.entries ?? []).forEach(e => {
      if (!e.zone || e.zone === 'none') return
      if (!Number.isFinite(e.rank)) return
      if (!inGroup[e.zone]) inGroup[e.zone] = { min: e.rank, max: e.rank }
      else {
        inGroup[e.zone].min = Math.min(inGroup[e.zone].min, e.rank)
        inGroup[e.zone].max = Math.max(inGroup[e.zone].max, e.rank)
      }
    })
    Object.entries(inGroup).forEach(([zone, r]) => {
      if (!perZone[zone]) perZone[zone] = []
      perZone[zone].push(r)
    })
  })

  const ranges = {}
  Object.entries(perZone).forEach(([zone, list]) => {
    const first = list[0]
    if (list.every(r => r.min === first.min && r.max === first.max)) ranges[zone] = first
  })
  return ranges
}

/* ─────────────────────────────────────────────────────────────
   ZoneLegend — 하단 범례
───────────────────────────────────────────────────────────── */
/** @param {{ groups: Array<{groupName: string|null, entries: Array}>, small?: boolean }} props */
function ZoneLegend({ groups, small }) {
  const { t } = useTranslation()
  const rows        = (groups ?? []).flatMap(g => g.entries ?? [])
  const zonesInData = new Set(rows.map(e => e.zone ?? 'none'))
  const ranges      = computeZoneRanges(groups ?? [])
  const items       = ZONE_DISPLAY_ORDER.filter(z => zonesInData.has(z) && ZONE_LABEL_KEY[z])
  if (!items.length) return null

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: small ? '6px 12px' : '8px 18px',
        alignItems: 'center',
      }}
    >
      {items.map(zone => {
        const zc  = ZONE_COLOR_VAR[zone]
        const pat = ZONE_PAT[zone]
        const r   = ranges[zone]
        const rangeStr = r
          ? r.min === r.max
            ? t('standings.rankSingle', { rank: r.min })
            : t('standings.rankRange', { min: r.min, max: r.max })
          : ''

        return (
          <span
            key={zone}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: small ? 11 : 12,
              color: 'var(--pl-sub)',
              whiteSpace: 'nowrap',
            }}
          >
            {/* 패턴 표시선 */}
            <span
              aria-hidden="true"
              style={{
                width: 3,
                height: 14,
                borderRadius: 2,
                flexShrink: 0,
                background: zc ?? 'var(--pl-sub)',
                backgroundImage: patternBg(zc ?? '', pat),
              }}
            />
            {t(ZONE_LABEL_KEY[zone])}
            {rangeStr && (
              <span
                className="num"
                style={{ opacity: 0.7, fontSize: small ? 10 : 11 }}
              >
                ({rangeStr})
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Desktop Table — DIV 그리드, ::before 패턴 지원
───────────────────────────────────────────────────────────── */
const DESK_COLS = '34px 1fr 40px 34px 34px 34px 40px 40px 46px 48px 110px'

function DesktopTable({ rows, competitionSlug, t, locale }) {
  return (
    <div role="table" aria-label={t('standings.title')}>
      {/* 헤더 */}
      <div
        role="row"
        className="zrow t-cap"
        style={{ gridTemplateColumns: DESK_COLS, height: 36 }}
      >
        <span role="columnheader">{t('standings.rank')}</span>
        <span role="columnheader">{t('standings.team')}</span>
        {[t('standings.played'),t('standings.won'),t('standings.drawn'),t('standings.lost'),
          t('standings.goalsFor'),t('standings.goalsAgainst'),t('standings.goalDifference')].map(h => (
          <span key={h} role="columnheader" style={{ textAlign: 'center' }}>{h}</span>
        ))}
        <span role="columnheader" style={{ textAlign: 'right' }}>{t('standings.points')}</span>
        <span role="columnheader" style={{ textAlign: 'right' }}>{t('standings.form')}</span>
      </div>

      {/* 데이터 행 */}
      <div role="rowgroup">
        {rows.map(entry => {
          const zone = entry.zone ?? 'none'
          const zc   = ZONE_COLOR_VAR[zone]
          const pat  = ZONE_PAT[zone]
          const gd   = entry.goalDifference
          const teamObj = { id: entry.teamId, name: entry.teamName, slug: entry.teamSlug }

          return (
            <div
              key={entry.teamId ?? entry.teamSlug}
              role="row"
              className="zrow num"
              data-zone={zc ? zone : undefined}
              data-pat={pat && pat !== 'solid' ? pat : undefined}
              style={{
                '--zc': zc ?? 'transparent',
                gridTemplateColumns: DESK_COLS,
                height: 44,
              }}
            >
              <span role="cell" style={{ fontWeight: 700, color: 'var(--pl-sub)' }}>
                {entry.rank}
              </span>
              <span role="cell" style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <TeamBadge
                  initials={entry.teamInitials}
                  color={entry.teamColor}
                  size="xs"
                  name={entry.teamName}
                />
                <Link
                  to={`/teams/${entry.teamSlug}${competitionSlug ? `?competition=${competitionSlug}` : ''}`}
                  className="tname"
                  style={{
                    color: 'var(--pl-text)',  /* 순위표 팀 이름은 브랜드 색 금지 */
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                  title={getLocalizedName(teamObj, locale) || entry.teamName}
                >
                  {getLocalizedName(teamObj, locale) || entry.teamName}
                </Link>
              </span>
              {[entry.played,entry.won,entry.drawn,entry.lost,entry.goalsFor,entry.goalsAgainst].map((v, i) => (
                <span key={i} role="cell" style={{ textAlign: 'center', color: 'var(--pl-sub)' }}>{v}</span>
              ))}
              <span role="cell" style={{ textAlign: 'center', color: 'var(--pl-sub)' }}>
                {gd > 0 ? `+${gd}` : gd}
              </span>
              <span role="cell" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--pl-text)' }}>
                {entry.points}
              </span>
              <span role="cell" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span className="pl-form">
                  {(entry.form ?? []).map((r, i) => <FormBadge key={i} result={r} />)}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Mobile Table — sticky 순위+팀 + 가로 스크롤 통계
───────────────────────────────────────────────────────────── */
const MOBILE_SCROLL_COLS = [
  { key: 'played',        label: 'P' },
  { key: 'won',           label: 'W' },
  { key: 'drawn',         label: 'D' },
  { key: 'lost',          label: 'L' },
  { key: 'goalsFor',      label: 'GF' },
  { key: 'goalsAgainst',  label: 'GA' },
  { key: 'goalDifference', label: 'GD' },
  { key: 'points',        label: 'Pts', bold: true },
]
const SCROLL_COL_W = 44  // px per scrollable column

function MobileTable({ rows, t, locale }) {
  const cellStyle = { height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }

  return (
    <div style={{ display: 'flex', minWidth: 0 }}>
      {/* 고정 좌측: 순위 + 팀명 */}
      <div
        style={{
          flexShrink: 0,
          background: 'var(--pl-card)',
          boxShadow: '1px 0 0 var(--pl-line), 4px 0 10px -6px rgba(0,0,0,.2)',
          position: 'relative',
          zIndex: 1,
        }}
        aria-label={`${t('standings.rank')} · ${t('standings.team')}`}
      >
        {/* 헤더 */}
        <div
          className="t-cap"
          style={{
            display: 'grid',
            gridTemplateColumns: '30px 110px',
            height: 34,
            alignItems: 'center',
            padding: '0 8px 0 14px',
            borderBottom: '1px solid var(--pl-line)',
          }}
        >
          <span>{t('standings.rank')}</span>
          <span>{t('standings.team')}</span>
        </div>
        {/* 행 */}
        {rows.map(entry => {
          const zone     = entry.zone ?? 'none'
          const zc       = ZONE_COLOR_VAR[zone]
          const pat      = ZONE_PAT[zone]
          const stickyBg = ZONE_STICKY_BG[zone] ?? 'bg-card'
          const teamObj  = { id: entry.teamId, name: entry.teamName, slug: entry.teamSlug }

          return (
            <div
              key={entry.teamId ?? entry.teamSlug}
              className={`zrow num ${stickyBg}`}
              data-zone={zc ? zone : undefined}
              data-pat={pat && pat !== 'solid' ? pat : undefined}
              style={{
                '--zc': zc ?? 'transparent',
                gridTemplateColumns: '30px 110px',
                height: 44,
                padding: '0 8px 0 14px',
                background: 'inherit', /* stickyBg class가 배경 설정 */
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--pl-sub)' }}>{entry.rank}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <TeamBadge initials={entry.teamInitials} color={entry.teamColor} size="xs" name={entry.teamName} />
                <span
                  className="tname"
                  style={{ fontWeight: 600, fontSize: 12, color: 'var(--pl-text)' }}
                  title={getLocalizedName(teamObj, locale) || entry.teamName}
                >
                  {entry.teamInitials || entry.teamName}
                </span>
              </span>
            </div>
          )
        })}
      </div>

      {/* 가로 스크롤 통계 */}
      <div style={{ overflowX: 'auto', minWidth: 0, flex: 1, WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: SCROLL_COL_W * MOBILE_SCROLL_COLS.length }}>
          {/* 헤더 */}
          <div
            className="t-cap"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${MOBILE_SCROLL_COLS.length}, ${SCROLL_COL_W}px)`,
              height: 34,
              alignItems: 'center',
              borderBottom: '1px solid var(--pl-line)',
            }}
          >
            {MOBILE_SCROLL_COLS.map(col => (
              <span key={col.key} style={{ textAlign: 'center' }}>{col.label}</span>
            ))}
          </div>
          {/* 행 */}
          {rows.map(entry => {
            const gd = entry.goalDifference
            const vals = {
              played: entry.played, won: entry.won, drawn: entry.drawn, lost: entry.lost,
              goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst,
              goalDifference: gd > 0 ? `+${gd}` : gd,
              points: entry.points,
            }
            return (
              <div
                key={entry.teamId ?? entry.teamSlug}
                className="num"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${MOBILE_SCROLL_COLS.length}, ${SCROLL_COL_W}px)`,
                  height: 44,
                  boxShadow: 'inset 0 1px 0 var(--pl-line)',
                }}
              >
                {MOBILE_SCROLL_COLS.map(col => (
                  <span
                    key={col.key}
                    style={{
                      ...cellStyle,
                      fontWeight: col.bold ? 700 : 500,
                      color: col.bold ? 'var(--pl-text)' : 'var(--pl-sub)',
                    }}
                  >
                    {vals[col.key]}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Compact Table — HTML <table>, 미니 패널용
───────────────────────────────────────────────────────────── */
function CompactTable({ rows, competitionSlug, t, locale }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: 260, borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="t-cap" style={{ textAlign: 'left', padding: '6px 4px 6px 14px', width: 28, position: 'sticky', left: 0, background: 'var(--pl-card)', zIndex: 10 }}>
              {t('standings.rank')}
            </th>
            <th className="t-cap" style={{ textAlign: 'left', padding: '6px 12px 6px 8px', position: 'sticky', left: 28, background: 'var(--pl-card)', zIndex: 10, minWidth: 100 }}>
              {t('standings.team')}
            </th>
            <th className="t-cap num" style={{ textAlign: 'center', padding: '6px 4px', width: 40 }}>{t('standings.goalDifference')}</th>
            <th className="t-cap num" style={{ textAlign: 'center', padding: '6px 4px', width: 40, fontWeight: 700 }}>{t('standings.points')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(entry => {
            const zone     = entry.zone ?? 'none'
            const zc       = ZONE_COLOR_VAR[zone]
            const stickyBg = ZONE_STICKY_BG[zone] ?? 'bg-card'
            const gd       = entry.goalDifference
            const teamObj  = { id: entry.teamId, name: entry.teamName, slug: entry.teamSlug }
            const rowBg    = zc ? `color-mix(in srgb, ${zc} 4%, transparent)` : undefined

            return (
              <tr key={entry.teamId ?? entry.teamSlug} style={{ backgroundColor: rowBg, boxShadow: 'inset 0 -1px 0 var(--pl-line)' }}>
                <td
                  className={`t-cap num ${stickyBg}`}
                  style={{
                    padding: '10px 4px 10px 14px',
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                    boxShadow: zc
                      ? `inset 2px 0 0 ${zc}, inset 0 -1px 0 var(--pl-line)`
                      : 'inset 0 -1px 0 var(--pl-line)',
                  }}
                >
                  {entry.rank}
                </td>
                <td className={`${stickyBg}`} style={{ padding: '0 12px 0 8px', position: 'sticky', left: 28, zIndex: 10 }}>
                  <Link
                    to={`/teams/${entry.teamSlug}${competitionSlug ? `?competition=${competitionSlug}` : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: 'var(--pl-text)',
                      textDecoration: 'none',
                      minHeight: 44,
                    }}
                  >
                    <TeamBadge initials={entry.teamInitials} color={entry.teamColor} size="xs" name={entry.teamName} />
                    <span className="tname" style={{ fontWeight: 500, fontSize: 13, maxWidth: 90 }}>
                      {getLocalizedName(teamObj, locale) || entry.teamName}
                    </span>
                  </Link>
                </td>
                <td className="t-sub num" style={{ textAlign: 'center', padding: '10px 4px' }}>{gd > 0 ? `+${gd}` : gd}</td>
                <td className="num" style={{ textAlign: 'center', padding: '10px 4px', fontWeight: 700, color: 'var(--pl-text)' }}>{entry.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Group sections — 조 머리글 + 표 반복
───────────────────────────────────────────────────────────── */

/** 조 머리글. 조가 하나뿐인 표(단일 표 대회)에서는 그리지 않는다 — 대회 이름이 머리글로 찍힌다 */
function GroupHeading({ name, first }) {
  return (
    <div
      className="t-cap"
      style={{
        padding: first ? '10px 14px 6px' : '14px 14px 6px',
        fontWeight: 700,
        color: 'var(--pl-text)',
        borderTop: first ? undefined : '1px solid var(--pl-line)',
      }}
    >
      {name}
    </div>
  )
}

/**
 * 조 하나뿐이고 이름이 없으면 표를 그대로 돌려준다 — 단일 표 대회의 DOM 이 예전과 같아야 한다.
 * @param {{ groups: Array<{groupName: string|null, entries: Array}>,
 *           children: (rows: Array) => import('react').ReactNode }} props
 */
function GroupSections({ groups, children }) {
  if (groups.length === 1 && groups[0].groupName == null) return children(groups[0].entries)
  return (
    <>
      {groups.map((g, i) => (
        <div key={g.groupName ?? `g${i}`}>
          {g.groupName && <GroupHeading name={g.groupName} first={i === 0} />}
          {children(g.entries)}
        </div>
      ))}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   StandingsTable — 공개 컴포넌트
───────────────────────────────────────────────────────────── */
export default function StandingsTable({
  entries = [],
  maxRows,
  competitionSlug,
  compact = false,
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  // 조별리그면 조 단위로 나눈다. 단일 표 대회는 `groupName: null` 인 한 덩어리라 예전과 같다.
  const groups  = limitStandingGroups(groupStandings(entries), maxRows)
  const hasRows = groups.some(g => (g.entries ?? []).length > 0)

  if (compact) {
    return (
      <GroupSections groups={groups}>
        {rows => <CompactTable rows={rows} competitionSlug={competitionSlug} t={t} locale={locale} />}
      </GroupSections>
    )
  }

  return (
    <div>
      {/* 데스크톱 */}
      <div className="hidden md:block">
        <GroupSections groups={groups}>
          {rows => <DesktopTable rows={rows} competitionSlug={competitionSlug} t={t} locale={locale} />}
        </GroupSections>
      </div>

      {/* 모바일 */}
      <div className="md:hidden">
        <GroupSections groups={groups}>
          {rows => <MobileTable rows={rows} t={t} locale={locale} />}
        </GroupSections>
      </div>

      {/* 범례 */}
      {hasRows && (
        <div style={{ padding: '12px 14px 10px', borderTop: '1px solid var(--pl-line)' }}>
          <p className="t-cap" style={{ margin: '0 0 8px' }}>{t('standings.zoneNote')}</p>
          <ZoneLegend groups={groups} />
        </div>
      )}
    </div>
  )
}

// 범례만 별도로 내보낸다 (StandingsPage에서 독립 렌더)
export { ZoneLegend }
