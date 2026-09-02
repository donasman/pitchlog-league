/**
 * 득점/도움 순위 목록
 * 선수명·팀명: getLocalizedShortName으로 현재 언어 표시.
 * @param {{ title:string, unit:string, entries:Array<Object> }} props
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TeamBadge from './TeamBadge'
import { getLocalizedShortName } from '@/utils/localization'

export default function StatsRanking({ title, unit, entries = [] }) {
  const { i18n } = useTranslation()
  const locale = i18n.language

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="space-y-0.5">
        {entries.map(entry => {
          const teamName   = getLocalizedShortName({ id: entry.teamId, name: entry.teamName }, locale) || entry.teamName
          const playerName = getLocalizedShortName({ id: entry.playerId, name: entry.playerName }, locale) || entry.playerName
          return (
            <Link
              key={entry.playerId ?? entry.playerSlug}
              to={`/players/${entry.playerSlug}`}
              className="flex items-center gap-3 py-2 px-2 rounded hover:bg-accent transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">{entry.rank}</span>
              <TeamBadge initials={entry.teamInitials} color={entry.teamColor} size="xs" name={entry.teamName} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {playerName}
                </div>
                <div className="text-xs text-muted-foreground truncate">{teamName}</div>
              </div>
              <span className="text-base font-bold text-foreground flex-shrink-0">{entry.value}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
