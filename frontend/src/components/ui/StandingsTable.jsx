/**
 * 순위 테이블
 * compact=false (기본): 전체 열 표시
 * compact=true  (홈 사이드바): 핵심 열만 표시 (순위·팀·득실·승점)
 *
 * 구역 표기: 좌측 2px 표시선 + 4% 배경 틴트 + 범례 텍스트 (색상 단독 의존 금지)
 * 순위표 안에서 팀 이름을 브랜드 색으로 칠하지 않는다 (PRD 9-2).
 *
 * @param {{ entries:Array<Object>, isUCL?:boolean, maxRows?:number,
 *           competitionSlug?:string, compact?:boolean }} props
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TeamBadge from './TeamBadge'
import FormBadge from './FormBadge'
import {
  ZONE_STICKY_BG,
  ZONE_LEGEND_COLOR,
  ZONE_COLOR_VAR,
} from '@/utils/standingsZone'
import { getLocalizedName } from '@/utils/localization'

const ZONE_DISPLAY_ORDER = [
  'champions_league',
  'champions_league_playoff',
  'europa_league',
  'europa_conference',
  'relegation_playoff',
  'relegation',
  'ucl_direct',
  'ucl_playoff',
  'ucl_eliminated',
]

const ZONE_LABEL_KEY = {
  champions_league:          'standings.legend.ucl',
  champions_league_playoff:  '',
  europa_league:             'standings.legend.uel',
  europa_conference:         'standings.legend.uecl',
  relegation:                'standings.legend.relegation',
  relegation_playoff:        'standings.legend.relegationPlayoff',
  ucl_direct:                'standings.legend.uclDirect',
  ucl_playoff:               'standings.legend.uclPlayoff',
  ucl_eliminated:            'standings.legend.uclEliminated',
  none:                      '',
}

function ZoneLegend({ entries }) {
  const { t } = useTranslation()
  const zonesInData = new Set(entries.map(e => e.zone ?? 'none'))
  const items = ZONE_DISPLAY_ORDER.filter(z => zonesInData.has(z) && ZONE_LABEL_KEY[z])
  if (!items.length) return null

  return (
    <div className="pl-legend" style={{ marginBottom: 12 }}>
      {items.map(zone => {
        const zc = ZONE_COLOR_VAR[zone]
        return (
          <span
            key={zone}
            className="pl-legend-item"
            style={{ '--zc': zc ?? ZONE_LEGEND_COLOR[zone] }}
          >
            {zc
              ? <i className="pl-legend-bar" style={{ background: zc }} />
              : <span className={`w-2 h-3 rounded-sm ${ZONE_LEGEND_COLOR[zone] ?? 'bg-muted'}`} aria-hidden="true" />
            }
            {t(ZONE_LABEL_KEY[zone])}
          </span>
        )
      })}
    </div>
  )
}

export default function StandingsTable({ entries = [], maxRows, competitionSlug, compact = false }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const rows = maxRows ? entries.slice(0, maxRows) : entries
  const minW = compact ? '260px' : '480px'

  return (
    <div>
      <ZoneLegend entries={rows} />
      {!compact && (
        <p className="t-cap" style={{ marginBottom: 4, display: 'block' }} aria-hidden="true">
          <span className="sm:hidden">{t('standings.scrollHint')}</span>
        </p>
      )}
      <div className="overflow-x-auto -mx-1 px-1" role="region">
        <table
          className="w-full text-sm"
          style={{ minWidth: minW, borderCollapse: 'separate', borderSpacing: 0 }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid var(--pl-line)' }}>
              <th className="t-cap" style={{ textAlign: 'left', padding: '6px 4px 6px 14px', width: 28, position: 'sticky', left: 0, background: 'var(--pl-card)', zIndex: 10 }}>
                {t('standings.rank')}
              </th>
              <th className="t-cap" style={{ textAlign: 'left', padding: '6px 12px 6px 8px', position: 'sticky', left: 28, background: 'var(--pl-card)', zIndex: 10, minWidth: 110 }}>
                {t('standings.team')}
              </th>
              <th className="t-cap num" style={{ textAlign: 'center', padding: '6px 4px', width: 32 }} title={t('standings.played')}>
                {t('standings.played')}
              </th>
              {!compact && (
                <>
                  <th className="t-cap num hidden sm:table-cell" style={{ textAlign: 'center', padding: '6px 4px', width: 32 }} title={t('standings.won')}>{t('standings.won')}</th>
                  <th className="t-cap num hidden sm:table-cell" style={{ textAlign: 'center', padding: '6px 4px', width: 32 }} title={t('standings.drawn')}>{t('standings.drawn')}</th>
                  <th className="t-cap num hidden sm:table-cell" style={{ textAlign: 'center', padding: '6px 4px', width: 32 }} title={t('standings.lost')}>{t('standings.lost')}</th>
                  <th className="t-cap num hidden sm:table-cell" style={{ textAlign: 'center', padding: '6px 4px', width: 38 }} title={t('standings.goalsFor')}>{t('standings.goalsFor')}</th>
                  <th className="t-cap num hidden sm:table-cell" style={{ textAlign: 'center', padding: '6px 4px', width: 38 }} title={t('standings.goalsAgainst')}>{t('standings.goalsAgainst')}</th>
                </>
              )}
              <th className="t-cap num" style={{ textAlign: 'center', padding: '6px 4px', width: 40 }} title={t('standings.goalDifference')}>
                {t('standings.goalDifference')}
              </th>
              <th className="t-cap num" style={{ textAlign: 'center', padding: '6px 4px', width: 40, fontWeight: 700 }} title={t('standings.points')}>
                {t('standings.points')}
              </th>
              {!compact && (
                <th className="t-cap hidden md:table-cell" style={{ textAlign: 'center', padding: '6px 4px' }}>{t('standings.form')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(entry => {
              const zone      = entry.zone ?? 'none'
              const zc        = ZONE_COLOR_VAR[zone]
              const stickyBg  = ZONE_STICKY_BG[zone] ?? 'bg-card'
              const labelKey  = ZONE_LABEL_KEY[zone] ?? ''
              const gd        = entry.goalDifference
              const teamObj   = { id: entry.teamId, name: entry.teamName, slug: entry.teamSlug }

              const rowBg = zc
                ? `color-mix(in srgb, ${zc} 4%, transparent)`
                : undefined

              return (
                <tr
                  key={entry.teamId ?? entry.teamSlug}
                  style={{
                    backgroundColor: rowBg,
                    boxShadow: 'inset 0 -1px 0 var(--pl-line)',
                  }}
                >
                  {/* 순위 — sticky, 좌측 표시선 (inset box-shadow: ::before 대신 사용, <tr>::before는 Chrome에서 열을 밀어냄) */}
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

                  {/* 팀명 — sticky */}
                  <td
                    className={`${stickyBg}`}
                    style={{
                      padding: '0 12px 0 8px',
                      position: 'sticky',
                      left: 28,
                      zIndex: 10,
                    }}
                  >
                    <Link
                      to={`/teams/${entry.teamSlug}${competitionSlug ? `?competition=${competitionSlug}` : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--pl-text)',   /* 순위표 안에서 팀 이름을 브랜드 색으로 칠하지 않는다 */
                        textDecoration: 'none',
                        minHeight: 44,             /* 터치 타깃 44px */
                      }}
                    >
                      <TeamBadge
                        initials={entry.teamInitials}
                        color={entry.teamColor}
                        size="xs"
                        name={entry.teamName}
                      />
                      <span style={{ minWidth: 0 }}>
                        <span
                          className="tname"
                          style={{
                            fontWeight: 500,
                            display: 'block',
                            maxWidth: compact ? 80 : 130,
                          }}
                        >
                          {getLocalizedName(teamObj, locale) || entry.teamName}
                        </span>
                        {/* 모바일: 구역 레이블 — block sm:hidden (인라인 display 금지) */}
                        {labelKey && (
                          <span className="t-cap block sm:hidden">
                            {t(labelKey)}
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>

                  <td className="t-sub num" style={{ textAlign: 'center', padding: '10px 4px' }}>{entry.played}</td>

                  {!compact && (
                    <>
                      <td className="t-sub num hidden sm:table-cell" style={{ textAlign: 'center', padding: '10px 4px' }}>{entry.won}</td>
                      <td className="t-sub num hidden sm:table-cell" style={{ textAlign: 'center', padding: '10px 4px' }}>{entry.drawn}</td>
                      <td className="t-sub num hidden sm:table-cell" style={{ textAlign: 'center', padding: '10px 4px' }}>{entry.lost}</td>
                      <td className="t-sub num hidden sm:table-cell" style={{ textAlign: 'center', padding: '10px 4px' }}>{entry.goalsFor}</td>
                      <td className="t-sub num hidden sm:table-cell" style={{ textAlign: 'center', padding: '10px 4px' }}>{entry.goalsAgainst}</td>
                    </>
                  )}

                  <td className="t-sub num" style={{ textAlign: 'center', padding: '10px 4px' }}>
                    {gd > 0 ? `+${gd}` : gd}
                  </td>
                  <td className="num" style={{ textAlign: 'center', padding: '10px 4px', fontWeight: 700, color: 'var(--pl-text)' }}>
                    {entry.points}
                  </td>

                  {!compact && (
                    <td className="hidden md:table-cell" style={{ padding: '10px 4px' }}>
                      <span className="pl-form" style={{ justifyContent: 'center' }}>
                        {(entry.form ?? []).map((r, i) => <FormBadge key={i} result={r} />)}
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
