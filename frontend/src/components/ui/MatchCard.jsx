/**
 * 경기 카드
 * 예정 / LIVE / 종료 / 재검증 / 확정 상태를 모두 표현.
 * compact 모드는 목록, 기본 모드는 카드 레이아웃.
 * 팀명: getLocalizedName으로 현재 언어 표시.
 *
 * @param {{ match:Object, compact?:boolean }} props
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TeamBadge from './TeamBadge'
import MatchStatusBadge from './MatchStatusBadge'
import { toKSTTime, toKSTDate } from '@/utils/dateFormat'
import { isLive } from '@/utils/matchStatus'
import { getLocalizedName, getLocalizedShortName } from '@/utils/localization'

export default function MatchCard({ match, compact = false }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  if (!match) return null

  const live    = isLive(match.displayState)
  const hasScore = match.score?.home !== null && match.score?.away !== null
  const homeWin  = hasScore && match.score.home > match.score.away
  const awayWin  = hasScore && match.score.away > match.score.home

  const homeName  = compact
    ? getLocalizedShortName(match.homeTeam, locale) || match.homeTeam?.shortName || match.homeTeam?.name
    : getLocalizedName(match.homeTeam, locale) || match.homeTeam?.name
  const awayName  = compact
    ? getLocalizedShortName(match.awayTeam, locale) || match.awayTeam?.shortName || match.awayTeam?.name
    : getLocalizedName(match.awayTeam, locale) || match.awayTeam?.name

  return (
    <Link
      to={`/matches/${match.id}`}
      className={`block bg-card border border-border rounded-lg hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${live ? 'border-destructive' : ''} ${compact ? 'p-3' : 'p-4'}`}
    >
      {!compact && (
        <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
          <span>{match.round ?? match.stage}</span>
          <MatchStatusBadge state={match.displayState} />
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* 홈팀 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamBadge initials={match.homeTeam?.initials} color={match.homeTeam?.color} size={compact ? 'sm' : 'md'} name={match.homeTeam?.name} />
          <span className={`text-sm font-medium truncate ${homeWin ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
            {homeName}
          </span>
        </div>

        {/* 스코어 / 시각 */}
        <div className="flex flex-col items-center gap-0.5 min-w-[64px]">
          {hasScore ? (
            <>
              <span className={`text-lg font-bold tabular-nums ${live ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {match.score.home} – {match.score.away}
              </span>
              {compact && <MatchStatusBadge state={match.displayState} />}
            </>
          ) : (
            <div className="text-center">
              <div className="text-sm font-semibold text-foreground">{toKSTTime(match.date, locale)}</div>
              <div className="text-xs text-muted-foreground">{toKSTDate(match.date, locale)}</div>
            </div>
          )}
        </div>

        {/* 원정팀 */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className={`text-sm font-medium truncate text-right ${awayWin ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
            {awayName}
          </span>
          <TeamBadge initials={match.awayTeam?.initials} color={match.awayTeam?.color} size={compact ? 'sm' : 'md'} name={match.awayTeam?.name} />
        </div>
      </div>

      {/* UCL 합산 점수 */}
      {!compact && match.aggregateScore && (
        <div className="mt-2 text-center text-xs text-muted-foreground">
          {t('match.aggregate')}: {match.aggregateScore.home} – {match.aggregateScore.away}
          {match.qualifier && <span className="ml-2 text-primary">({match.qualifier})</span>}
        </div>
      )}

      {/* 경기장 */}
      {!compact && match.venue && (
        <div className="mt-1 text-xs text-muted-foreground/70 text-center truncate">{match.venue}</div>
      )}
    </Link>
  )
}
