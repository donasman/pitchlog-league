/**
 * 홈 "내 팀" 섹션 — 서버 저장 판.
 *
 * 갈래 (FavoritesContext 의 loadState 기준 — 로딩·오류·빈 결과를 구분한다):
 *   - isFavoritesEnabled=false: 섹션 자체를 렌더하지 않는다 (env·mock 모드).
 *   - 로그인 안 됨: 로그인 CTA 카드 하나만 (favorites.loginRequired + Google CTA).
 *   - 로그인 됨:
 *       · loadState 'idle'|'loading' → 스켈레톤 (첫 로드 전 빈 목록은 "0개" 가 아니다)
 *       · loadState 'error'          → ErrorState + 다시 시도(reload). 빈 안내로 숨기지 않는다
 *                                      network → favorites.errors.load_failed
 *                                      not_authenticated → favorites.errors.session_missing
 *       · ready + items 0개          → 빈 안내 카드
 *       · ready + items 있음         → MyTeamsBody 가 useMyTeams(items) 로 카드 조립 (position 순 유지)
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

const LOAD_ERROR_KEY = {
  network: 'favorites.errors.load_failed',
  not_authenticated: 'favorites.errors.session_missing',
}

/** 섹션 제목 — 스크롤러 헤더 밖에서 쓰는 단독 h2 */
function SectionTitle() {
  const { t } = useTranslation()
  return <h2 className="t-sec" style={H2_STYLE}>{t('home.myTeams.title')}</h2>
}

/** 섹션 껍데기 — 제목 + 본문 */
function TitledSection({ children }) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <SectionTitle />
      {children}
    </section>
  )
}

export default function MyTeamsSection() {
  const { t } = useTranslation()
  const { isFavoritesEnabled, isLoggedIn, items, loadState, loadError, reload } = useFavorites()
  const { signInWithGoogle } = useAuth()

  // 컨텍스트 off — 아예 아무것도 그리지 않는다 (섹션 자체가 없다시피).
  if (!isFavoritesEnabled) return null

  // 로그인 안 됨 — 로그인 CTA 카드 하나만.
  if (!isLoggedIn) {
    return (
      <TitledSection>
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
      </TitledSection>
    )
  }

  // 첫 로드 전·중 — 빈 목록을 "즐겨찾기 0개" 로 그리지 않는다.
  if (loadState === 'idle' || loadState === 'loading') {
    return (
      <TitledSection>
        <LoadingSkeleton rows={2} variant="card" />
      </TitledSection>
    )
  }

  // 첫 로드 실패 — 빈 안내로 숨기지 않고 오류 + 다시 시도.
  if (loadState === 'error') {
    return (
      <TitledSection>
        <div className="pl-card" style={{ padding: 12 }}>
          <ErrorState
            description={t(LOAD_ERROR_KEY[loadError] ?? 'favorites.errors.load_failed')}
            onRetry={reload}
          />
        </div>
      </TitledSection>
    )
  }

  // ready — 진짜 0개
  if (items.length === 0) {
    return (
      <TitledSection>
        <div className="pl-card" style={{ padding: 20, display: 'grid', gap: 8 }}>
          <span className="t-body">{t('home.myTeams.empty_hint')}</span>
        </div>
      </TitledSection>
    )
  }

  return <MyTeamsBody items={items} />
}

/**
 * ready + items 있음 — 이때만 useMyTeams 를 부른다 (로딩·오류·빈 상태에서 카드 조회를 시작하지 않는다).
 * @param {{ items: object[] }} props
 */
function MyTeamsBody({ items }) {
  const { t } = useTranslation()
  const { loading, error, cards } = useMyTeams(items)

  if (loading) {
    return (
      <TitledSection>
        <LoadingSkeleton rows={2} variant="card" />
      </TitledSection>
    )
  }

  if (error) {
    return (
      <TitledSection>
        <ErrorState description={error} />
      </TitledSection>
    )
  }

  // items 가 있는데 카드가 0장 — 조립 실패를 빈 안내로 숨기지 않는다 (기본 오류 문구).
  if (cards.length === 0) {
    return (
      <TitledSection>
        <ErrorState />
      </TitledSection>
    )
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
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
    </section>
  )
}
