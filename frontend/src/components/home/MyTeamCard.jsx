/**
 * 홈 "내 팀" 카드 한 장 — 팀 배지 + 이름 + 다음 경기 + 최근 결과 + 리그 순위.
 *
 * 값이 없는 자리는 "예정된 경기 없음" 처럼 사유가 붙는다 — 빈 자리로 남겨 두면
 * "데이터를 못 받은 것" 과 "정말로 없는 것" 이 구분되지 않는다.
 *
 * @param {{ card: import('@/services/normalize').myTeamCard }} props
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TeamBadge from '@/components/ui/TeamBadge'
import { toKSTDateTime } from '@/utils/dateFormat'

export default function MyTeamCard({ card }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  return (
    <div className="pl-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
      {/* 헤더: 배지 + 팀 이름 (Link) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <TeamBadge
          initials={card.teamInitials}
          color={card.teamColor}
          logoUrl={card.teamLogoUrl}
          size="sm"
          name={card.teamName}
        />
        <Link
          to={`/teams/${card.teamRef}`}
          className="tname t-card"
          style={{ fontWeight: 700, textDecoration: 'none', color: 'var(--pl-text)', flex: 1, minWidth: 0 }}
          title={card.teamName}
        >
          {card.teamName}
        </Link>
      </div>

      {/* 다음 경기 */}
      <div style={{ display: 'grid', gap: 4 }}>
        {card.nextMatch ? (
          <div style={{ display: 'grid', gap: 2 }}>
            <span className="t-cap">{card.nextMatch.competitionName ?? ''}</span>
            <span className="t-body" style={{ fontWeight: 600 }}>
              {card.nextMatch.isHome ? 'vs ' : '@ '}
              {card.nextMatch.opponent.name}
            </span>
            <span className="t-cap num">{toKSTDateTime(card.nextMatch.date, locale)} KST</span>
          </div>
        ) : (
          <span className="t-sub">{t('home.myTeams.no_next_match')}</span>
        )}
      </div>

      {/* 최근 결과 */}
      <div style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--pl-line)', paddingTop: 10 }}>
        {card.lastResult ? (
          <div style={{ display: 'grid', gap: 2 }}>
            <span className="t-cap">{card.lastResult.competitionName ?? ''}</span>
            <span className="t-body" style={{ fontWeight: 600 }}>
              {card.lastResult.isHome ? 'vs ' : '@ '}
              {card.lastResult.opponent.name}
              <span className="num" style={{ marginLeft: 8 }}>
                {card.lastResult.score?.home ?? '-'} – {card.lastResult.score?.away ?? '-'}
              </span>
            </span>
          </div>
        ) : (
          <span className="t-sub">{t('home.myTeams.no_last_result')}</span>
        )}
      </div>

      {/* 리그 순위 */}
      <div style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--pl-line)', paddingTop: 10 }}>
        {card.ranking ? (
          <span className="t-body">
            <span className="t-cap" style={{ marginRight: 6 }}>{card.ranking.competitionName}</span>
            <span className="num" style={{ fontWeight: 700 }}>#{card.ranking.rank}</span>
            <span className="t-sub num" style={{ marginLeft: 6 }}>
              {t('home.ptsUnit', { pts: card.ranking.points })}
            </span>
          </span>
        ) : (
          <span className="t-sub">{t('home.myTeams.no_ranking')}</span>
        )}
      </div>
    </div>
  )
}
