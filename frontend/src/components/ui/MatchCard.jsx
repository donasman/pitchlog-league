/**
 * 경기 카드
 * compact=false: 기본 카드 (팀명 전체, 스코어, 경기장)
 * compact=true:  컴팩트 카드 (팀명 축약, 인라인 배지)
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

  const homeName = compact
    ? getLocalizedShortName(match.homeTeam, locale) || match.homeTeam?.shortName || match.homeTeam?.name
    : getLocalizedName(match.homeTeam, locale) || match.homeTeam?.name
  const awayName = compact
    ? getLocalizedShortName(match.awayTeam, locale) || match.awayTeam?.shortName || match.awayTeam?.name
    : getLocalizedName(match.awayTeam, locale) || match.awayTeam?.name

  return (
    <Link
      to={`/matches/${match.id}`}
      className="pl-card"
      style={{
        display: 'block',
        padding: compact ? 10 : 14,
        textDecoration: 'none',
        color: 'inherit',
        outline: 'none',
        boxShadow: live
          ? `inset 0 0 0 1px var(--st-neg), var(--sh-card)`
          : `inset 0 0 0 1px var(--pl-line), var(--sh-card)`,
        transition: 'box-shadow .12s',
      }}
      aria-label={`${homeName} vs ${awayName}`}
    >
      {/* 헤더: 라운드 + 배지 */}
      {!compact && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span className="t-cap">{match.round ?? match.stage}</span>
          <MatchStatusBadge state={match.displayState} />
        </div>
      )}

      {/* 팀 행 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        {/* 홈팀 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <TeamBadge
            initials={match.homeTeam?.initials}
            color={match.homeTeam?.color}
            size={compact ? 'xs' : 'sm'}
            name={match.homeTeam?.name}
          />
          <span
            className="tname"
            style={{
              fontWeight: homeWin ? 700 : 500,
              fontSize: 14,
              color: 'var(--pl-text)',
            }}
            title={getLocalizedName(match.homeTeam, locale) || match.homeTeam?.name}
          >
            {homeName}
          </span>
        </div>

        {/* 스코어 / 시각 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 60 }}>
          {hasScore ? (
            <>
              <span
                className="num"
                style={{
                  fontSize: compact ? 16 : 20,
                  fontWeight: 700,
                  color: live ? 'var(--st-neg)' : 'var(--pl-text)',
                  letterSpacing: '-.02em',
                }}
              >
                {match.score.home} – {match.score.away}
              </span>
              {compact && <MatchStatusBadge state={match.displayState} />}
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div className="t-body num" style={{ fontWeight: 600 }}>{toKSTTime(match.date, locale)}</div>
              <div className="t-cap">{toKSTDate(match.date, locale)}</div>
            </div>
          )}
        </div>

        {/* 원정팀 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, justifyContent: 'flex-end' }}>
          <span
            className="tname"
            style={{
              fontWeight: awayWin ? 700 : 500,
              fontSize: 14,
              color: 'var(--pl-text)',
              textAlign: 'right',
            }}
            title={getLocalizedName(match.awayTeam, locale) || match.awayTeam?.name}
          >
            {awayName}
          </span>
          <TeamBadge
            initials={match.awayTeam?.initials}
            color={match.awayTeam?.color}
            size={compact ? 'xs' : 'sm'}
            name={match.awayTeam?.name}
          />
        </div>
      </div>

      {/* UCL 합산 점수 */}
      {!compact && match.aggregateScore && (
        <div
          className="t-cap num"
          style={{ marginTop: 8, textAlign: 'center' }}
        >
          {t('match.aggregate')}: {match.aggregateScore.home} – {match.aggregateScore.away}
          {match.qualifier && (
            <span style={{ marginLeft: 6, color: 'var(--pl-primary)' }}>({match.qualifier})</span>
          )}
        </div>
      )}

      {/* 경기장 */}
      {!compact && match.venue && (
        <div className="t-cap" style={{ marginTop: 4, textAlign: 'center' }}>{match.venue}</div>
      )}
    </Link>
  )
}
