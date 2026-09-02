/**
 * 여러 대회 경기를 킥오프 시각 오름차순으로 병합한 목록
 * 정렬·병합 로직은 src/utils/matchSort.js에 분리.
 * 대회 라벨은 텍스트 약칭+색상으로 표시 (색만으로 구분하지 않음).
 *
 * @param {{ matches:Array<Object>, maxRows?:number }} props
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TeamBadge from '@/components/ui/TeamBadge'
import MatchStatusBadge from '@/components/ui/MatchStatusBadge'
import { toKSTTime } from '@/utils/dateFormat'
import { sortMatchesByKickoff } from '@/utils/matchSort'

/** 대회별 약칭 텍스트 색상 (색+텍스트 함께 사용) */
const COMP_STYLE = {
  'premier-league':  { color:'text-green-600 dark:text-green-400',  bg:'bg-green-50 dark:bg-green-950/30',  label:'EPL'   },
  'la-liga':         { color:'text-amber-600 dark:text-amber-400',   bg:'bg-amber-50 dark:bg-amber-950/30',   label:'LaLiga'},
  'bundesliga':      { color:'text-purple-600 dark:text-purple-400', bg:'bg-purple-50 dark:bg-purple-950/30', label:'BL'    },
  'serie-a':         { color:'text-teal-600 dark:text-teal-400',     bg:'bg-teal-50 dark:bg-teal-950/30',     label:'SA'    },
  'ligue-1':         { color:'text-blue-600 dark:text-blue-400',     bg:'bg-blue-50 dark:bg-blue-950/30',     label:'L1'    },
  'champions-league':{ color:'text-indigo-600 dark:text-indigo-400', bg:'bg-indigo-50 dark:bg-indigo-950/30', label:'UCL'   },
}

export default function UnifiedMatchList({ matches = [], maxRows = 8 }) {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const sorted = sortMatchesByKickoff(matches).slice(0, maxRows)

  if (!sorted.length) return null

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="divide-y divide-border">
        {sorted.map(m => {
          const style = COMP_STYLE[m.competitionSlug] ?? { color:'text-muted-foreground', bg:'bg-muted/30', label:m.competitionSlug ?? '' }
          const hasScore = m.score?.home !== null && m.score?.away !== null

          return (
            <Link
              key={m.id}
              to={`/matches/${m.id}`}
              className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {/* 대회 라벨 */}
              <div className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 w-14 text-center ${style.color} ${style.bg}`}>
                {style.label}
              </div>

              {/* 시각 / 상태 */}
              <div className="w-11 flex-shrink-0 text-center">
                {hasScore
                  ? <MatchStatusBadge state={m.displayState} />
                  : <span className="text-xs text-muted-foreground">{toKSTTime(m.date, locale)}</span>
                }
              </div>

              {/* 홈팀 */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="text-sm text-foreground truncate text-right">{m.homeTeam?.shortName ?? m.homeTeam?.name}</span>
                <TeamBadge initials={m.homeTeam?.initials} color={m.homeTeam?.color} size="xs" name={m.homeTeam?.name} />
              </div>

              {/* 스코어 */}
              <div className="w-14 text-center flex-shrink-0">
                {hasScore ? (
                  <span className={`text-sm font-bold tabular-nums ${m.displayState === 'live' || m.displayState === 'halftime' ? 'text-destructive' : 'text-foreground'}`}>
                    {m.score.home} – {m.score.away}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">vs</span>
                )}
              </div>

              {/* 원정팀 */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <TeamBadge initials={m.awayTeam?.initials} color={m.awayTeam?.color} size="xs" name={m.awayTeam?.name} />
                <span className="text-sm text-foreground truncate">{m.awayTeam?.shortName ?? m.awayTeam?.name}</span>
              </div>

              {/* 상태 배지 (스코어 없을 때만) */}
              <div className="w-10 flex-shrink-0 text-right">
                {!hasScore && <MatchStatusBadge state={m.displayState} />}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
