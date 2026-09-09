/**
 * 팀 즐겨찾기 별 버튼.
 *
 * 두 자리에서 쓴다:
 *   TeamsPage 카드(<Link> 안) — 별을 눌러도 팀 페이지로 이동하지 않게 preventDefault + stopPropagation
 *   TeamPage 헤더 — 팀 이름 옆에 큰 별
 *
 * limit_reached 를 만나면 별을 눌러도 저장이 늘지 않는다 —
 * NotificationContext 토스트로 "5개까지" 를 알린다. `alert()` 는 쓰지 않는다.
 *
 * @param {{ slug:string, label:string, size?:'sm'|'md' }} props
 */

import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useNotifications } from '@/contexts/NotificationContext'

const SIZE_PX = { sm: 32, md: 40 }
const ICON_PX = { sm: 16, md: 20 }

export default function FavoriteToggle({ slug, label, size = 'md' }) {
  const { t } = useTranslation()
  const { isFavorite, toggle, limit } = useFavorites()
  const { showToast } = useNotifications()

  const active = isFavorite(slug)
  const px = SIZE_PX[size] ?? SIZE_PX.md
  const iconPx = ICON_PX[size] ?? ICON_PX.md
  const ariaLabel = active
    ? t('favorites.remove', { name: label })
    : t('favorites.add', { name: label })

  const handleClick = (e) => {
    // TeamsPage 는 이 버튼을 <Link> 안에 둔다 — Link 로의 이벤트 전파를 막지 않으면
    // 별을 누르는 순간 팀 페이지로 이동해 버린다. 카드 링크는 카드의 몫이다.
    e.preventDefault()
    e.stopPropagation()

    const result = toggle(slug)
    if (!result.ok && result.reason === 'limit_reached') {
      showToast({
        id: `favorites-limit-${Date.now()}`,
        type: 'goal',
        title: t('favorites.limit_reached', { limit }),
        body: '',
      })
    }
  }

  return (
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
  )
}
