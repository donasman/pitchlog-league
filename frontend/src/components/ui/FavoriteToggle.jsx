/**
 * 팀 즐겨찾기 별 버튼.
 *
 * 두 자리에서 쓴다:
 *   TeamsPage 카드(<Link> 안) — 별을 눌러도 팀 페이지로 이동하지 않게 preventDefault + stopPropagation
 *   TeamPage 헤더 — 팀 이름 옆에 큰 별
 *
 * limit_reached 안내는 이 컴포넌트 안에서 인라인으로 처리한다.
 * 경기 토스트(NotificationContext.showToast)는 goal/kickoff/fulltime 등 경기 도메인
 * 문구를 렌더하도록 만들어졌고(자동 사라짐 부제·대회 이니셜 배지) 즐겨찾기 상한
 * 안내를 태우면 오독된다 — 그래서 도메인 문구는 별 옆에 최소 형태로 붙인다.
 * `alert()` 는 쓰지 않는다.
 *
 * @param {{ slug:string, label:string, size?:'sm'|'md' }} props
 */

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFavorites } from '@/contexts/FavoritesContext'

const SIZE_PX = { sm: 32, md: 40 }
const ICON_PX = { sm: 16, md: 20 }
const HINT_MS = 2800

export default function FavoriteToggle({ slug, label, size = 'md' }) {
  const { t } = useTranslation()
  const { isFavorite, toggle, limit } = useFavorites()
  const [hintVisible, setHintVisible] = useState(false)
  const timerRef = useRef(null)

  const active = isFavorite(slug)
  const px = SIZE_PX[size] ?? SIZE_PX.md
  const iconPx = ICON_PX[size] ?? ICON_PX.md
  const ariaLabel = active
    ? t('favorites.remove', { name: label })
    : t('favorites.add', { name: label })

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleClick = (e) => {
    // TeamsPage 는 이 버튼을 <Link> 안에 둔다 — Link 로의 이벤트 전파를 막지 않으면
    // 별을 누르는 순간 팀 페이지로 이동해 버린다. 카드 링크는 카드의 몫이다.
    e.preventDefault()
    e.stopPropagation()

    const result = toggle(slug)
    if (!result.ok && result.reason === 'limit_reached') {
      if (timerRef.current) clearTimeout(timerRef.current)
      setHintVisible(true)
      timerRef.current = setTimeout(() => {
        setHintVisible(false)
        timerRef.current = null
      }, HINT_MS)
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={ariaLabel}
        title={ariaLabel}
        style={{
          width: px,
          height: px,
          display: 'grid',
          placeItems: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          color: active ? '#f5b301' : 'var(--pl-sub)',
          transition: 'color .15s',
        }}
      >
        <Star
          size={iconPx}
          strokeWidth={active ? 0 : 1.75}
          fill={active ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      </button>
      {/* 상한 안내 — 별 아래 인라인. role="status"+polite 라 스크린리더를 방해하지 않음.
          경기 토스트와 겹치지 않게 자체 스택. pointerEvents:none 으로 카드/링크 클릭 방해 안 함. */}
      <span
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 30,
          pointerEvents: 'none',
          padding: '6px 10px',
          background: 'var(--pl-card)',
          color: 'var(--pl-text)',
          border: '1px solid var(--pl-line)',
          borderRadius: 'var(--r-sm)',
          boxShadow: 'var(--sh-over)',
          fontSize: 12,
          lineHeight: 1.35,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          opacity: hintVisible ? 1 : 0,
          transform: hintVisible ? 'translateY(0)' : 'translateY(-2px)',
          transition: 'opacity .18s ease, transform .18s ease',
        }}
      >
        {hintVisible ? t('favorites.limit_reached', { limit }) : ''}
      </span>
    </span>
  )
}
