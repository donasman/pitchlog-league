/**
 * 순위 테이블
 * compact=false (기본): 전체 열 표시, minWidth 480px
 * compact=true  (홈 사이드바): 핵심 열만 표시(순위·팀·경기수·득실·승점), minWidth 260px
 * 다국어: useTranslation (열 헤더·범례), getLocalizedName (팀명)
 * 구역 색상: 왼쪽 표시선 + 연한 행 배경 + sticky 셀 합성 배경
 *
 * @param {{ entries:Array<Object>, isUCL?:boolean, maxRows?:number,
 *           competitionSlug?:string, compact?:boolean }} props
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TeamBadge from './TeamBadge'
import FormBadge from './FormBadge'
import { ZONE_BORDER_CLASS, ZONE_BG_CLASS, ZONE_STICKY_BG, ZONE_LEGEND_COLOR } from '@/utils/standingsZone'
import { getLocalizedName } from '@/utils/localization'

/** entries 에 실제로 존재하는 zone 만 순서대로 렌더 */
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

/** zone → i18n 키 (빈 문자열 = 범례에 표시 안 함) */
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

/** entries 에 실제 존재하는 zone 만 추려 렌더하는 데이터 기반 범례 */
function ZoneLegend({ entries }) {
  const { t } = useTranslation()
  const zonesInData = new Set(entries.map(e => e.zone ?? 'none'))
  const items = ZONE_DISPLAY_ORDER.filter(z => zonesInData.has(z) && ZONE_LABEL_KEY[z])
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
      {items.map(zone => (
        <span key={zone} className="flex items-center gap-1.5">
          <span className={`w-2 h-3 ${ZONE_LEGEND_COLOR[zone] ?? 'bg-muted'} rounded-sm`} aria-hidden="true" />
          {t(ZONE_LABEL_KEY[zone])}
        </span>
      ))}
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
        <p className="text-xs text-muted-foreground/60 mb-1 sm:hidden">{t('standings.scrollHint')}</p>
      )}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm" style={{ minWidth: minW }}>
          <thead>
            <tr className="text-muted-foreground text-xs border-b border-border">
              <th className="text-left py-2 pr-1 w-7 sticky left-0 bg-card z-10">{t('standings.rank')}</th>
              <th className="text-left py-2 pr-3 sticky left-7 bg-card z-10 min-w-[110px]">{t('standings.team')}</th>
              <th className="text-center py-2 w-8" title={t('standings.played')}>{t('standings.played')}</th>
              {!compact && <>
                <th className="text-center py-2 w-8 hidden sm:table-cell" title={t('standings.won')}>{t('standings.won')}</th>
                <th className="text-center py-2 w-8 hidden sm:table-cell" title={t('standings.drawn')}>{t('standings.drawn')}</th>
                <th className="text-center py-2 w-8 hidden sm:table-cell" title={t('standings.lost')}>{t('standings.lost')}</th>
                <th className="text-center py-2 w-10 hidden sm:table-cell" title={t('standings.goalsFor')}>{t('standings.goalsFor')}</th>
                <th className="text-center py-2 w-10 hidden sm:table-cell" title={t('standings.goalsAgainst')}>{t('standings.goalsAgainst')}</th>
              </>}
              <th className="text-center py-2 w-10" title={t('standings.goalDifference')}>{t('standings.goalDifference')}</th>
              <th className="text-center py-2 w-10 font-bold" title={t('standings.points')}>{t('standings.points')}</th>
              {!compact && <>
                <th className="text-center py-2 hidden md:table-cell">{t('standings.form')}</th>
                <th className="text-center py-2 w-14 hidden sm:table-cell">{t('standings.zone')}</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {rows.map(entry => {
              const zone       = entry.zone ?? 'none'
              const borderCls  = ZONE_BORDER_CLASS[zone] ?? ZONE_BORDER_CLASS.none
              const bgCls      = ZONE_BG_CLASS[zone] ?? ''
              const stickyBg   = ZONE_STICKY_BG[zone] ?? 'bg-card'
              const zoneLabelKey = ZONE_LABEL_KEY[zone] ?? ''
              const gd         = entry.goalDifference
              const teamForLookup = { id: entry.teamId, name: entry.teamName, slug: entry.teamSlug }

              return (
                <tr
                  key={entry.teamId ?? entry.teamSlug}
                  className={`border-b border-border/50 hover:bg-accent/50 transition-colors ${borderCls} ${bgCls}`}
                >
                  <td className={`py-2.5 pr-1 text-muted-foreground text-xs sticky left-0 z-10 ${stickyBg}`}>
                    {entry.rank}
                  </td>
                  <td className={`py-2.5 pr-3 sticky left-7 z-10 ${stickyBg}`}>
                    <Link
                      to={`/teams/${entry.teamSlug}${competitionSlug ? `?competition=${competitionSlug}` : ''}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                    >
                      <TeamBadge initials={entry.teamInitials} color={entry.teamColor} size="xs" name={entry.teamName} />
                      <span className={`font-medium truncate ${compact ? 'max-w-[80px] sm:max-w-[110px]' : 'max-w-[130px] sm:max-w-[200px]'}`}>
                        {getLocalizedName(teamForLookup, locale) || entry.teamName}
                      </span>
                    </Link>
                    {zoneLabelKey && (
                      <span className="block text-[10px] text-muted-foreground/70 mt-0.5 sm:hidden">
                        {t(zoneLabelKey)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-center text-muted-foreground">{entry.played}</td>
                  {!compact && <>
                    <td className="py-2.5 text-center text-muted-foreground hidden sm:table-cell">{entry.won}</td>
                    <td className="py-2.5 text-center text-muted-foreground hidden sm:table-cell">{entry.drawn}</td>
                    <td className="py-2.5 text-center text-muted-foreground hidden sm:table-cell">{entry.lost}</td>
                    <td className="py-2.5 text-center text-muted-foreground hidden sm:table-cell">{entry.goalsFor}</td>
                    <td className="py-2.5 text-center text-muted-foreground hidden sm:table-cell">{entry.goalsAgainst}</td>
                  </>}
                  <td className="py-2.5 text-center text-muted-foreground">{gd > 0 ? `+${gd}` : gd}</td>
                  <td className="py-2.5 text-center font-bold text-foreground">{entry.points}</td>
                  {!compact && <>
                    <td className="py-2.5 hidden md:table-cell">
                      <div className="flex gap-0.5 justify-center">
                        {(entry.form ?? []).map((r, i) => <FormBadge key={i} result={r} />)}
                      </div>
                    </td>
                    <td className="py-2.5 text-center hidden sm:table-cell">
                      {zoneLabelKey && <span className="text-xs text-muted-foreground">{t(zoneLabelKey)}</span>}
                    </td>
                  </>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
