/**
 * 홈 "내 팀" 섹션 — 서버 저장 판.
 *
 * 세 갈래:
 *   - isFavoritesEnabled=false: 섹션 자체를 렌더하지 않는다 (env·mock 모드).
 *   - 로그인 안 됨: 로그인 CTA 카드 하나만 (favorites.loginRequired + Google CTA).
 *   - 로그인 됨:
 *       · 로딩 → 스켈레톤
 *       · 에러 → ErrorState
 *       · 빈 상태(items 0개) → 빈 안내 카드
 *       · items 있음 → useMyTeams(items) 로 카드 조립 (position 순 유지)
 */

import { useTranslation } from 'react-i18next'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useAuth } from '@/contexts/AuthContext'
import { useMyTeams } from '@/hooks/useMyTeams'
import ErrorState from '@/components/ui/ErrorState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import HScroller, { HScrollerHeaderControls } from '@/components/ui/HScroller'
import MyTeamCard from './MyTeamCard'

const H2_STYLE = { margin: 0, fontSize: 22 }

export default function MyTeamsSection() {
  const { t } = useTranslation()
  const { isFavoritesEnabled, isLoggedIn, items } = useFavorites()
  const { signInWithGoogle } = useAuth()
  // 로그인 안 됐거나 컨텍스트 off 면 useMyTeams 를 부르지 않는다 — 빈 배열이라도 첫 로드 스켈레톤이 뜨는 것을 막는다.
  const shouldLoad = isFavoritesEnabled && isLoggedIn
  const { loading, error, cards } = useMyTeams(shouldLoad ? items : [])

  // 컨텍스트 off — 아예 아무것도 그리지 않는다 (섹션 자체가 없다시피).
  if (!isFavoritesEnabled) return null

  // 로그인 안 됨 — 로그인 CTA 카드 하나만.
  if (!isLoggedIn) {
    return (
      <section style={{ display: 'grid', gap: 16 }}>
        <h2 className="t-sec" style={H2_STYLE}>{t('home.myTeams.title')}</h2>
        <div className="pl-card" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <span className="t-body">{t('favorites.loginRequired')}</span>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="pl-btn"
            style={{ justifySelf: 'start' }}
          >
            {t('favorites.loginCta')}
          </button>
        </div>
      </section>
    )
  }

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
        </div>
      ) : (
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
      )}
    </section>
  )
}
