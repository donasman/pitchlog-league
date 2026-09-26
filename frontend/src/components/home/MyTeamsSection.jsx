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
import HScroller, { HScrollerHeaderControls } from '@/components/ui/HScroller'
import MyTeamCard from './MyTeamCard'

const H2_STYLE = { margin: 0, fontSize: 22 }

export default function MyTeamsSection() {
  const { t } = useTranslation()
  const { loading, error, cards } = useMyTeams()

  /* 로딩·에러·빈 상태: HScroller 없이 제목만 렌더. 정상 상태만 HScroller 가 제목을 감싼다 —
     화살표를 제목 오른쪽에 붙이기 위해서다. autoPlay 는 끔 (개인 목록이라 움직이지 않게). */
  const showScroller = !loading && !error && cards.length > 0

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      {!showScroller && (
        <h2 className="t-sec" style={H2_STYLE}>{t('home.myTeams.title')}</h2>
      )}

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
          <HScroller
            rows={1}
            gap={12}
            ariaLabel={t('home.myTeams.title')}
            autoPlay={false}
            header={(ctrl) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="t-sec" style={{ ...H2_STYLE, flex: 1, minWidth: 0 }}>{t('home.myTeams.title')}</h2>
                <HScrollerHeaderControls {...ctrl} />
              </div>
            )}
          >
            {cards.map(card => (
              <MyTeamCard key={card.teamRef} card={card} />
            ))}
          </HScroller>
          <span className="t-cap">{t('home.myTeams.browser_only_notice')}</span>
        </>
      )}
    </section>
  )
}
