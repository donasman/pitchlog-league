/**
 * 홈 메인 LIVE 스코어보드
 * 팀명: getLocalizedName·getLocalizedShortName 현지화.
 * 모바일 우선순위: LIVE 상태 → 팀·스코어 → 대회 → 라운드
 * 경기장은 모바일에서 숨김.
 *
 * @param {{ match:Object|null, fallbackMatch:Object|null }} props
 */

import { Link } from 'react-router-dom'
import { Zap, Clock, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TeamBadge from '@/components/ui/TeamBadge'
import { toKSTTime, toKSTDate } from '@/utils/dateFormat'
import { getLocalizedShortName } from '@/utils/localization'

const EVENT_ICON = { goal:'⚽', yellow_card:'🟨', red_card:'🟥', substitution:'🔄', var:'📺' }

export default function LiveHeroCard({ match, fallbackMatch }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  // LIVE 경기 없음 + 다음 경기도 없음
  if (!match && !fallbackMatch) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center min-h-[180px]">
        <p className="text-muted-foreground text-sm">{t('home.noTodayAll')}</p>
      </div>
    )
  }

  // 다음 경기 카드
  if (!match && fallbackMatch) {
    const m = fallbackMatch
    const homeName = getLocalizedShortName(m.homeTeam, locale) || m.homeTeam?.shortName || m.homeTeam?.name
    const awayName = getLocalizedShortName(m.awayTeam, locale) || m.awayTeam?.shortName || m.awayTeam?.name
    return (
      <Link
        to={`/matches/${m.id}`}
        className="block bg-card border border-border rounded-xl p-5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
          <span className="font-semibold truncate mr-2">{m.competitionName}</span>
          <span className="bg-muted px-2 py-0.5 rounded flex-shrink-0">
            {t('match.next')} · {toKSTTime(m.date, locale)} KST
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <TeamBadge initials={m.homeTeam?.initials} color={m.homeTeam?.color} size="lg" name={m.homeTeam?.name} />
            <span className="text-sm font-medium text-foreground text-center truncate w-full px-1">{homeName}</span>
          </div>
          <div className="text-center flex-shrink-0">
            <div className="text-2xl font-bold text-muted-foreground">vs</div>
            <div className="text-xs text-muted-foreground mt-1">{toKSTDate(m.date, locale)}</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <TeamBadge initials={m.awayTeam?.initials} color={m.awayTeam?.color} size="lg" name={m.awayTeam?.name} />
            <span className="text-sm font-medium text-foreground text-center truncate w-full px-1">{awayName}</span>
          </div>
        </div>
      </Link>
    )
  }

  // LIVE 스코어보드
  const m = match
  const events  = (m.events ?? []).slice(-3)
  const homeName = getLocalizedShortName(m.homeTeam, locale) || m.homeTeam?.shortName || m.homeTeam?.name
  const awayName = getLocalizedShortName(m.awayTeam, locale) || m.awayTeam?.shortName || m.awayTeam?.name

  return (
    <Link
      to={`/matches/${m.id}`}
      className="block bg-card border border-destructive rounded-xl p-5 hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* 상단 메타 */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-destructive font-semibold">
            <Zap size={12} aria-hidden="true" />
            {t('match.live')}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock size={11} aria-hidden="true" />
            <span>{m.minute}&apos;</span>
            <span>·</span>
            <span className="truncate max-w-[100px] sm:max-w-none">{m.competitionName}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
          <span className="truncate">{m.round ?? m.stage}</span>
          <span className="hidden sm:block truncate max-w-[120px] text-right">{m.venue}</span>
        </div>
      </div>

      {/* 스코어 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <TeamBadge initials={m.homeTeam?.initials} color={m.homeTeam?.color} size="lg" name={m.homeTeam?.name} />
          <span className="text-sm font-semibold text-foreground text-center truncate w-full px-1">{homeName}</span>
        </div>
        <div className="text-center flex-shrink-0">
          <div className="text-3xl sm:text-4xl font-bold tabular-nums text-destructive">
            {m.score?.home} – {m.score?.away}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <TeamBadge initials={m.awayTeam?.initials} color={m.awayTeam?.color} size="lg" name={m.awayTeam?.name} />
          <span className="text-sm font-semibold text-foreground text-center truncate w-full px-1">{awayName}</span>
        </div>
      </div>

      {/* 이벤트 요약 */}
      {events.length > 0 && (
        <div className="border-t border-border pt-2.5 space-y-1">
          {events.map((e, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs text-muted-foreground ${e.team === 'away' ? 'flex-row-reverse' : ''}`}>
              <span className="w-6 text-center flex-shrink-0">{e.minute}&apos;</span>
              <span>{EVENT_ICON[e.type] ?? '•'}</span>
              <span className="truncate">{e.playerName}{e.assistName ? ` (A: ${e.assistName})` : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-end gap-1 mt-2.5 text-xs text-primary">
        {t('match.detailLink')} <ArrowRight size={12} aria-hidden="true" />
      </div>
    </Link>
  )
}
