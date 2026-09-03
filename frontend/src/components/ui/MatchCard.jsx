/**
 * 경기 카드 — 세로 2행 레이아웃 (시안 CardBasic/CardCompact)
 * 각 행: [팀 배지] [팀명 flex:1] [스코어]
 * 예정 경기: 스코어 자리에 킥오프 시각
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

function TeamRow({ team, score, win, live, compact, locale }) {
  const name = compact
    ? getLocalizedShortName(team, locale) || team?.shortName || team?.name
    : getLocalizedName(team, locale) || team?.name

  const hasScore = score !== null && score !== undefined

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
      }}
    >
      <TeamBadge
        initials={team?.initials}
        color={team?.color}
        size={compact ? 'xs' : 'sm'}
        name={team?.name}
      />
      <span
        className="tname"
        style={{
          flex: 1,
          fontWeight: win ? 700 : 500,
          fontSize: compact ? 13 : 14,
          color: 'var(--pl-text)',
        }}
        title={getLocalizedName(team, locale) || team?.name}
      >
        {name}
      </span>
      {hasScore && (
        <span
          className="num"
          style={{
            fontWeight: win ? 700 : 600,
            fontSize: compact ? 14 : 16,
            color: live ? 'var(--st-neg-text)' : 'var(--pl-text)',
            minWidth: 16,
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          {score}
        </span>
      )}
    </div>
  )
}

export default function MatchCard({ match, compact = false }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  if (!match) return null

  const live     = isLive(match.displayState)
  const hasScore = match.score?.home !== null && match.score?.away !== null
  const homeWin  = hasScore && match.score.home > match.score.away
  const awayWin  = hasScore && match.score.away > match.score.home

  const pad = compact ? 10 : 14

  return (
    <Link
      to={`/matches/${match.id}`}
      className="pl-card"
      style={{
        display: 'block',
        padding: pad,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'box-shadow .12s, background .12s',
        boxShadow: live
          ? `inset 0 0 0 1.5px var(--st-neg), var(--sh-card)`
          : `inset 0 0 0 1px var(--pl-line), var(--sh-card)`,
      }}
    >
      {/* 헤더: 라운드 + 상태 배지 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: compact ? 6 : 8,
          gap: 8,
        }}
      >
        <span className="t-cap" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.competition?.shortName ?? match.round ?? match.stage}
        </span>
        <MatchStatusBadge state={match.displayState} />
      </div>

      {/* 홈팀 행 */}
      <TeamRow
        team={match.homeTeam}
        score={hasScore ? match.score.home : null}
        win={homeWin}
        live={live}
        compact={compact}
        locale={locale}
      />

      {/* 원정팀 행 */}
      <div style={{ marginTop: compact ? 4 : 6 }}>
        <TeamRow
          team={match.awayTeam}
          score={hasScore ? match.score.away : null}
          win={awayWin}
          live={live}
          compact={compact}
          locale={locale}
        />
      </div>

      {/* 예정 경기: 킥오프 시각 */}
      {!hasScore && (
        <div
          className="t-cap num"
          style={{ marginTop: compact ? 4 : 6, textAlign: 'right' }}
        >
          {toKSTTime(match.date, locale)} · {toKSTDate(match.date, locale)}
        </div>
      )}

      {/* UCL 합산 점수 */}
      {!compact && match.aggregateScore && (
        <div
          className="t-cap num"
          style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--pl-line)' }}
        >
          {t('match.aggregate')}: {match.aggregateScore.home} – {match.aggregateScore.away}
          {match.qualifier && (
            <span style={{ marginLeft: 6, color: 'var(--pl-primary)' }}>({match.qualifier})</span>
          )}
        </div>
      )}

      {/* 경기장 */}
      {!compact && match.venue && (
        <div className="t-cap" style={{ marginTop: 4 }}>{match.venue}</div>
      )}
    </Link>
  )
}
