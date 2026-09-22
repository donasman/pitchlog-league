/**
 * TieCard — 녹아웃 대진 tie 카드 (feat/tournament-bracket · B 계열)
 *
 * `utils/ties.js` 의 Tie 를 소비. 두 갈래:
 *   - 단판 (`legs.length===1`): 홈·스코어·원정 한 줄 + PK 캡션(있을 때)
 *   - 2레그 (`legs.length===2`): 1차전 · 2차전 · 합산 3줄 (D2)
 *
 * 정정 2 반영 — aggregate 는 goals 합, PK 는 penalties 필드로 별도.
 * 부전승 배지 (props `homeBye`·`awayBye`) — UCL R16 에서 리그 스테이지 직행팀 표시.
 *
 * 승자 강조: `winnerTeamRef` 팀 옆에 굵게 (matchWinner 재사용 아님 · tie 단위).
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TeamBadge from '@/components/ui/TeamBadge'
import { getLocalizedShortName } from '@/utils/localization'

/**
 * 팀 슬롯 — 로고 + 짧은 이름. `bye` 이면 부전승 배지.
 */
function TeamSlot({ team, isWinner, align, locale, bye, t }) {
  const shortName = getLocalizedShortName(team, locale)
  return (
    <Link
      to={`/teams/${team.slug}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textDecoration: 'none',
        color: 'inherit',
        flexDirection: align === 'right' ? 'row-reverse' : 'row',
        minWidth: 0,
      }}
    >
      <TeamBadge initials={team.initials} color={team.color} logoUrl={team.logoUrl} size="xs" name={team.name} />
      <span
        className="tname t-sub"
        style={{
          color: 'var(--pl-text)',
          fontWeight: isWinner ? 700 : 500,
          minWidth: 0,
          textAlign: align,
        }}
      >
        {shortName}
      </span>
      {bye && (
        <span
          className="t-cap"
          style={{
            color: 'var(--pl-sub)',
            fontSize: 10,
            padding: '2px 6px',
            border: '1px solid var(--pl-line)',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}
        >
          {t('bracket.byeLeaguePhase')}
        </span>
      )}
    </Link>
  )
}

function Score({ home, away, bold }) {
  const cell = { fontWeight: bold ? 700 : 500 }
  return (
    <span className="num t-body" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <span style={cell}>{home ?? '-'}</span>
      <span>-</span>
      <span style={cell}>{away ?? '-'}</span>
    </span>
  )
}

/**
 * @param {{ tie:import('@/utils/ties').Tie, locale:string, homeBye?:boolean, awayBye?:boolean }} props
 */
export default function TieCard({ tie, locale, homeBye = false, awayBye = false }) {
  const { t } = useTranslation()
  const { home, away, legs, aggregate, penalties, winnerTeamRef, status, decidedBy } = tie
  const isTwoLeg = legs.length === 2
  const homeWin = winnerTeamRef && winnerTeamRef === home.slug
  const awayWin = winnerTeamRef && winnerTeamRef === away.slug

  if (!isTwoLeg) {
    const leg = legs[0]
    return (
      <div className="pl-card" data-decided-by={decidedBy} style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
          <TeamSlot team={home} isWinner={homeWin} align="left" locale={locale} bye={homeBye} t={t} />
          <Score home={leg?.score?.home} away={leg?.score?.away} bold />
          <TeamSlot team={away} isWinner={awayWin} align="right" locale={locale} bye={awayBye} t={t} />
        </div>
        {penalties && (
          <div className="t-cap" style={{ textAlign: 'center', marginTop: 6, color: 'var(--pl-sub)' }}>
            {t('competition.round.pkPrefix')} {penalties.home}-{penalties.away}
          </div>
        )}
      </div>
    )
  }

  // 2레그 · 3줄
  const [leg1, leg2] = legs
  const legRow = ({ label, leftTeam, leftBye, leftIsWinner, rightTeam, rightBye, rightIsWinner, scoreHome, scoreAway, pkRow }) => (
    <div style={{ display: 'grid', gap: 4 }}>
      <div className="t-cap" style={{ color: 'var(--pl-sub)' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
        <TeamSlot team={leftTeam} isWinner={leftIsWinner} align="left" locale={locale} bye={leftBye} t={t} />
        <Score home={scoreHome} away={scoreAway} />
        <TeamSlot team={rightTeam} isWinner={rightIsWinner} align="right" locale={locale} bye={rightBye} t={t} />
      </div>
      {pkRow && (
        <div className="t-cap" style={{ textAlign: 'center', color: 'var(--pl-sub)' }}>
          {t('competition.round.pkPrefix')} {pkRow.home}-{pkRow.away}
        </div>
      )}
    </div>
  )

  return (
    <div className="pl-card" data-decided-by={decidedBy} style={{ padding: 12, display: 'grid', gap: 10 }}>
      {legRow({
        label: t('tie.leg1'),
        leftTeam: home,   leftBye: homeBye,  leftIsWinner: false,   // 개별 leg 승자는 강조 안 함 (합산에서만)
        rightTeam: away,  rightBye: awayBye, rightIsWinner: false,
        scoreHome: leg1?.score?.home,
        scoreAway: leg1?.score?.away,
      })}
      {legRow({
        label: t('tie.leg2'),
        leftTeam: away,   leftBye: awayBye,  leftIsWinner: false,
        rightTeam: home,  rightBye: homeBye, rightIsWinner: false,
        scoreHome: leg2?.score?.home,
        scoreAway: leg2?.score?.away,
        pkRow: penalties,
      })}
      <div data-status={status} style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--pl-line)', paddingTop: 8 }}>
        <div className="t-cap" style={{ color: 'var(--pl-sub)' }}>{t('tie.aggregate')}</div>
        {status === 'pending' && <div className="t-sub">{t('tie.pending')}</div>}
        {status === 'in_progress' && <div className="t-sub">{t('tie.inProgress')}</div>}
        {status === 'settled' && aggregate && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
            <TeamSlot team={home} isWinner={homeWin} align="left" locale={locale} bye={homeBye} t={t} />
            <Score home={aggregate.home} away={aggregate.away} bold />
            <TeamSlot team={away} isWinner={awayWin} align="right" locale={locale} bye={awayBye} t={t} />
          </div>
        )}
      </div>
    </div>
  )
}
