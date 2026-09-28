/**
 * 팀 즐겨찾기 별 버튼 — 서버 저장 판.
 *
 * 두 자리에서 쓴다:
 *   TeamsPage 카드(<Link> 안) — 별을 눌러도 팀 페이지로 이동하지 않게 preventDefault + stopPropagation
 *   TeamPage 헤더 — 팀 이름 옆에 큰 별
 *
 * 세 갈래:
 *   - 컨텍스트 off (env·supabase 미설치) → 아예 렌더하지 않는다.
 *   - 로그인 안 됨: 별을 그린다. 클릭하면 로그인 힌트 팝업 + Google 로그인 CTA. toggle 은 호출하지 않는다.
 *   - 로그인 됨:  기존 별·토글·상한 안내. serverError 는 별 아래 힌트로 매핑
 *      · limit_exceeded → favorites.limit_reached
 *      · unknown_team   → favorites.errors.unknown_team
 *      · duplicate      → favorites.errors.duplicate
 *      · network        → favorites.errors.network
 *   isSyncing 이면 별을 disabled 회색으로 그린다 — 연타 방지 겸 시각 피드백.
 *
 * @param {{ slug:string, label:string, size?:'sm'|'md' }} props  slug 값은 실제로는 팀 ref.
 */

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useAuth } from '@/contexts/AuthContext'

const SIZE_PX = { sm: 32, md: 40 }
const ICON_PX = { sm: 16, md: 20 }
const HINT_MS = 2800

const ERROR_KEY = {
  limit_exceeded: 'favorites.limit_reached',
  unknown_team:   'favorites.errors.unknown_team',
  duplicate:      'favorites.errors.duplicate',
  network:        'favorites.errors.network',
}

export default function FavoriteToggle({ slug, label, size = 'md' }) {
  const { t } = useTranslation()
  const { isFavoritesEnabled, isLoggedIn, isFavorite, toggle, limit, isSyncing, serverError, clearServerError } = useFavorites()
  const { signInWithGoogle } = useAuth()
  const [hint, setHint] = useState({ visible: false, kind: null })
  const timerRef = useRef(null)

  const active = isLoggedIn ? isFavorite(slug) : false
  const px = SIZE_PX[size] ?? SIZE_PX.md
  const iconPx = ICON_PX[size] ?? ICON_PX.md
  const ariaLabel = active
    ? t('favorites.remove', { name: label })
    : t('favorites.add', { name: label })

  // isSyncing 중에도 hover/pressed 상태를 잃지 않으려고 별 자체는 그대로 그린다. click 만 막는다.
  const disabled = isSyncing

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const showHint = (kind) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setHint({ visible: true, kind })
    timerRef.current = setTimeout(() => {
      setHint({ visible: false, kind: null })
      timerRef.current = null
      // 서버 오류도 힌트가 사라질 때 함께 지운다 — 다음 클릭 때 잔상이 남지 않게.
      if (kind !== 'login_required') clearServerError()
    }, HINT_MS)
  }

  // serverError 변화 감지 — toggle 이 낙관적으로 통과한 뒤 서버가 400/네트워크로 죽었을 때 힌트.
  // 로그인 요구는 서버 오류가 아니라 CTA 로 다르게 그리므로 별도 갈래.
  //
  // 훅 규칙 상 early return 위에 있어야 한다 (isFavoritesEnabled=false 렌더 스킵 분기 위).
  useEffect(() => {
    if (!serverError || serverError === 'not_authenticated') return
    if (!ERROR_KEY[serverError]) return
    showHint(serverError)
    // showHint 는 안정 참조가 아니지만 이 자리는 상수처럼 쓴다 (렌더마다 새로 만들어도 setTimeout 하나만 남는다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverError])

  // 컨텍스트 off — 별 자체를 그리지 않는다 (env·mock 모드). 훅 호출은 위에 다 마쳤다.
  if (!isFavoritesEnabled) return null

  const handleClick = (e) => {
    // TeamsPage 는 이 버튼을 <Link> 안에 둔다 — Link 로의 이벤트 전파를 막지 않으면
    // 별을 누르는 순간 팀 페이지로 이동한다. 카드 링크는 카드의 몫이다.
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    if (!isLoggedIn) {
      showHint('login_required')
      return
    }

    const result = toggle(slug)
    if (!result?.ok && result?.reason === 'limit_reached') {
      showHint('limit_exceeded')
    }
    // 실제 서버 오류(unknown_team·duplicate·network) 는 컨텍스트가 serverError 를 세우고
    // 위 useEffect 가 힌트를 띄운다.
  }

  const hintText = (() => {
    if (!hint.visible || !hint.kind) return ''
    if (hint.kind === 'login_required') return t('favorites.loginRequired')
    const key = ERROR_KEY[hint.kind]
    if (!key) return ''
    if (hint.kind === 'limit_exceeded') return t(key, { limit })
    return t(key)
  })()

  return (
    <span style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={ariaLabel}
        aria-disabled={disabled ? 'true' : undefined}
        title={ariaLabel}
        style={{
          width: px,
          height: px,
          display: 'grid',
          placeItems: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: disabled ? 'default' : 'pointer',
          color: disabled
            ? 'var(--pl-sub)'
            : active ? '#f5b301' : 'var(--pl-sub)',
          opacity: disabled ? 0.6 : 1,
          transition: 'color .15s, opacity .15s',
        }}
      >
        <Star
          size={iconPx}
          strokeWidth={active ? 0 : 1.75}
          fill={active ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      </button>
      {/* 힌트 — 별 아래 인라인. login_required 는 CTA 버튼을 함께 실어 이벤트 전파를 막고 로그인으로 넘긴다. */}
      <span
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 30,
          // login_required 는 CTA 클릭을 받아야 해서 pointerEvents 를 켠다.
          pointerEvents: hint.kind === 'login_required' ? 'auto' : 'none',
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
          opacity: hint.visible ? 1 : 0,
          transform: hint.visible ? 'translateY(0)' : 'translateY(-2px)',
          transition: 'opacity .18s ease, transform .18s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>{hintText}</span>
        {hint.visible && hint.kind === 'login_required' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              signInWithGoogle()
            }}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 8px',
              border: '1px solid var(--pl-line)',
              borderRadius: 'var(--r-sm)',
              background: 'var(--pl-fill)',
              color: 'var(--pl-text)',
              cursor: 'pointer',
            }}
          >
            {t('favorites.loginCta')}
          </button>
        )}
      </span>
    </span>
  )
}
