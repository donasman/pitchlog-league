/**
 * 홈 "내 팀" 섹션 — 즐겨찾기 팀들의 다음 경기·최근 결과·리그 순위.
 *
 * 0개일 때: 안내 카드 하나(별을 눌러 담으라는 문구 + "이 브라우저에만" 고지)만 보이고
 * 로딩·에러가 아닌 정상적인 "빈 상태" 로 자리를 유지한다 — 섹션을 통째로 숨기면
 * 홈에 이 기능이 있다는 사실 자체가 발견되지 않는다.
 */

import { useTranslation } from 'react-i18next'
import { useMyTeams } from '@/hooks/useMyTeams'
import ErrorState from '@/components/ui/ErrorState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import MyTeamCard from './MyTeamCard'

export default function MyTeamsSection() {
  const { t } = useTranslation()
  const { loading, error, cards } = useMyTeams()

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h2 className="t-sec" style={{ margin: 0, fontSize: 22 }}>{t('home.myTeams.title')}</h2>

      {loading ? (
        <LoadingSkeleton rows={2} variant="card" />
      ) : error ? (
        <ErrorState description={error} />
      ) : cards.length === 0 ? (
        <div className="pl-card" style={{ padding: 20, display: 'grid', gap: 8 }}>
          <span className="t-body">{t('home.myTeams.empty_hint')}</span>
          <span className="t-cap">{t('home.myTeams.browser_only_notice')}</span>
        </div>
      ) : (
        <>
          <div
            className="myteams-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}
          >
            {/* minmax(0, 1fr) — /teams 와 같은 min-content 하한 버그 방어 · MyTeamCard 안 긴 팀명이 트랙을 밀지 않게 */}
            <style>{`@media(min-width:768px){.myteams-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}`}</style>
            {cards.map(card => (
              <MyTeamCard key={card.teamRef} card={card} />
            ))}
          </div>
          <span className="t-cap">{t('home.myTeams.browser_only_notice')}</span>
        </>
      )}
    </section>
  )
}
